import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { classId } = await params;
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return NextResponse.json(
      { error: "Turma não encontrada." },
      { status: 404 }
    );
  }
  // Provas da turma
  const exams = await db.exam.findMany({
    where: { classId },
    select: {
      id: true,
      title: true,
      type: true,
      passingScore: true,
      startDateTime: true,
    },
    orderBy: { startDateTime: "asc" },
  });
  const examIds = exams.map((e) => e.id);
  // Tentativas de usuários da turma
  const members = await db.classMember.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true, cpf: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const userIds = members.map((m) => m.userId);
  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: examIds }, userId: { in: userIds } },
  });
  // Também simulados do usuário (provas SIMULATION)
  const simulations = await db.simulation.findMany({
    where: { userId: { in: userIds } },
  });

  // Constrói lista de registros: por aluno + prova
  const rows: Array<{
    userId: string;
    userName: string;
    cpf: string;
    examId: string;
    examTitle: string;
    examType: string;
    score: number | null;
    correctCount: number | null;
    totalCount: number | null;
    timeSpentSeconds: number | null;
    submittedAt: string | null;
    passed: boolean | null;
  }> = [];

  for (const member of members) {
    for (const exam of exams) {
      const attempt = attempts.find(
        (a) => a.examId === exam.id && a.userId === member.userId
      );
      rows.push({
        userId: member.userId,
        userName: member.user.name,
        cpf: member.user.cpf,
        examId: exam.id,
        examTitle: exam.title,
        examType: exam.type,
        score: attempt?.score ?? null,
        correctCount: attempt?.correctCount ?? null,
        totalCount: attempt?.totalCount ?? null,
        timeSpentSeconds: attempt?.timeSpentSeconds ?? null,
        submittedAt: attempt?.submittedAt
          ? attempt.submittedAt.toISOString()
          : null,
        passed:
          attempt?.score != null
            ? attempt.score >= (exam.passingScore ?? 0)
            : null,
      });
    }
  }

  // Estatísticas
  const scoredRows = rows.filter((r) => r.score !== null);
  const scores = scoredRows.map((r) => r.score as number);
  const stats = {
    totalAlunos: members.length,
    totalProvas: exams.length,
    totalRealizadas: scoredRows.length,
    media: scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null,
    maior: scores.length ? Math.max(...scores) : null,
    menor: scores.length ? Math.min(...scores) : null,
    aprovados: scoredRows.filter(
      (r, idx) => scores[idx] !== undefined && r.passed === true
    ).length,
    reprovados: scoredRows.filter((r) => r.passed === false).length,
  };

  return NextResponse.json({
    class: cls,
    exams,
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      cpf: m.user.cpf,
    })),
    rows,
    stats,
    simulationsCount: simulations.length,
  });
}
