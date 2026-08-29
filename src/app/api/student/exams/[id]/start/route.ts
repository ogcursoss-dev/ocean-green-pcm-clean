import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getExamStatus, resolveWindow } from "@/lib/exam-window";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { assignments: true },
  });
  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  if (user.role === "STUDENT") {
    const individual = exam.assignments.find((a) => a.userId === user.userId);
    const turma = exam.assignments.find((a) => a.userId === null);
    const assignment = individual || turma;
    if (!assignment) {
      return NextResponse.json(
        { error: "Você não tem permissão para esta prova." },
        { status: 403 }
      );
    }
    const status = getExamStatus(exam, assignment);
    if (status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Prova fora da janela de aplicação.", status },
        { status: 403 }
      );
    }
    // Verifica tentativa existente
    const existing = await db.examAttempt.findUnique({
      where: { examId_userId: { examId: id, userId: user.userId } },
    });
    if (existing && existing.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "Prova já submetida.",
          attempt: {
            id: existing.id,
            status: existing.status,
            score: existing.score,
          },
        },
        { status: 400 }
      );
    }
    if (existing) {
      return NextResponse.json({ ok: true, attemptId: existing.id, resumed: true });
    }

    // ===== RANDOMIZAÇÃO POR ALUNO (anti-cola) =====
    // Sorteia `questionCount` questões do banco (respeitando filtros de disciplina/dificuldade)
    const poolSubjectIds: string[] | null = exam.poolSubjectIds
      ? JSON.parse(exam.poolSubjectIds)
      : null;
    const whereQ: any = { active: true };
    if (poolSubjectIds && poolSubjectIds.length > 0) {
      whereQ.subjectId = { in: poolSubjectIds };
    }
    if (exam.poolDifficulty) {
      whereQ.difficulty = exam.poolDifficulty;
    }
    const allPoolQuestions = await db.question.findMany({
      where: whereQ,
      select: { id: true },
    });

    if (allPoolQuestions.length === 0) {
      return NextResponse.json(
        { error: "Não há questões disponíveis no banco para esta prova." },
        { status: 400 }
      );
    }

    // Sorteia aleatoriamente
    const shuffled = allPoolQuestions.sort(() => Math.random() - 0.5);
    const count = Math.min(exam.questionCount || 20, shuffled.length);
    const selectedIds = shuffled.slice(0, count).map((q) => q.id);

    const attempt = await db.examAttempt.create({
      data: {
        examId: id,
        userId: user.userId,
        status: "IN_PROGRESS",
        answers: JSON.stringify([]),
        questionIds: JSON.stringify(selectedIds),
      },
    });
    const window = resolveWindow(exam, assignment);
    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      deadline: window.end.toISOString(),
      durationMinutes: window.durationMinutes,
      questionCount: count,
    });
  }
  return NextResponse.json(
    { error: "Admins não iniciam tentativas." },
    { status: 400 }
  );
}
