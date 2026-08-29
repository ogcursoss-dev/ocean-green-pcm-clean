import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getExamStatus } from "@/lib/exam-window";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const { questionId, selected } = body || {};
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId é obrigatório." },
        { status: 400 }
      );
    }
    const attempt = await db.examAttempt.findUnique({
      where: { examId_userId: { examId: id, userId: user.userId } },
      include: { exam: { include: { assignments: true } } },
    });
    if (!attempt) {
      return NextResponse.json(
        { error: "Tentativa não iniciada. Clique em Iniciar prova." },
        { status: 400 }
      );
    }
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Prova já finalizada." },
        { status: 400 }
      );
    }
    // Verifica janela temporal
    const individual = attempt.exam.assignments.find((a: any) => a.userId === user.userId);
    const turma = attempt.exam.assignments.find((a: any) => a.userId === null);
    const assignment = individual || turma;
    const status = getExamStatus(attempt.exam, assignment);
    if (status === "CLOSED") {
      // Auto-submete
      await submitInternal(attempt.id);
      return NextResponse.json(
        { ok: false, error: "Tempo esgotado. Prova finalizada automaticamente.", autoSubmitted: true },
        { status: 410 }
      );
    }
    // Atualiza respostas
    const current: Array<{ questionId: string; selected?: string }> = JSON.parse(
      attempt.answers || "[]"
    );
    const idx = current.findIndex((a) => a.questionId === questionId);
    const newEntry = { questionId, selected: selected || null };
    if (idx >= 0) current[idx] = newEntry;
    else current.push(newEntry);
    await db.examAttempt.update({
      where: { id: attempt.id },
      data: { answers: JSON.stringify(current) },
    });
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("[exam/answer]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao salvar resposta." },
      { status: 500 }
    );
  }
}

async function submitInternal(attemptId: string) {
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { question: { select: { id: true, correctAnswer: true } } },
          },
        },
      },
    },
  });
  if (!attempt) return;
  const answers: Array<{ questionId: string; selected?: string }> = JSON.parse(
    attempt.answers || "[]"
  );
  const answersMap: Record<string, string | undefined> = {};
  for (const a of answers) answersMap[a.questionId] = a.selected;
  let correct = 0;
  for (const eq of attempt.exam.questions) {
    if (answersMap[eq.question.id] === eq.question.correctAnswer) correct++;
  }
  const total = attempt.exam.questions.length;
  const score = total > 0 ? (correct / total) * 100 : 0;
  const now = new Date();
  const timeSpentSeconds = Math.floor(
    (now.getTime() - attempt.startedAt.getTime()) / 1000
  );
  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "AUTO_SUBMITTED",
      submittedAt: now,
      score,
      correctCount: correct,
      totalCount: total,
      timeSpentSeconds,
    },
  });
}
