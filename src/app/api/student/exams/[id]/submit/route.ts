import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const attempt = await db.examAttempt.findUnique({
    where: { examId_userId: { examId: id, userId: user.userId } },
    include: { exam: true },
  });
  if (!attempt) {
    return NextResponse.json(
      { error: "Tentativa não encontrada. Inicie a prova primeiro." },
      { status: 404 }
    );
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Prova já finalizada.", status: attempt.status },
      { status: 400 }
    );
  }

  // ===== Usa as questões sorteadas para este aluno =====
  const questionIds: string[] = attempt.questionIds
    ? JSON.parse(attempt.questionIds)
    : [];

  let questions: Array<{ id: string; correctAnswer: string }> = [];
  if (questionIds.length > 0) {
    questions = await db.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctAnswer: true },
    });
    // Mantém ordem sorteada
    questions = questionIds
      .map(qid => questions.find(q => q.id === qid))
      .filter(Boolean) as typeof questions;
  } else {
    // Fallback: questões fixas do exam
    const eqs = await db.examQuestion.findMany({
      where: { examId: id },
      orderBy: { order: "asc" },
      include: { question: { select: { id: true, correctAnswer: true } } },
    });
    questions = eqs.map(e => e.question);
  }

  const answers: Array<{ questionId: string; selected?: string }> = JSON.parse(
    attempt.answers || "[]"
  );
  const answersMap: Record<string, string | undefined> = {};
  for (const a of answers) answersMap[a.questionId] = a.selected;

  let correct = 0;
  for (const q of questions) {
    if (answersMap[q.id] === q.correctAnswer) correct++;
  }
  const total = questions.length;
  const score = total > 0 ? (correct / total) * 100 : 0;
  const now = new Date();
  const timeSpentSeconds = Math.floor(
    (now.getTime() - attempt.startedAt.getTime()) / 1000
  );

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      score,
      correctCount: correct,
      totalCount: total,
      timeSpentSeconds,
    },
  });

  const passed = score >= (attempt.exam.passingScore ?? 60);
  const isRecovery = attempt.exam.isRecovery;

  // ===== RECUPERAÇÃO AUTOMÁTICA =====
  // Se NÃO é prova de recuperação, nota < 6 (passingScore) e o aluno está reprovado
  // → criar automaticamente uma prova de recuperação para este aluno
  let recoveryCreated = false;
  let recoveryExamId: string | null = null;
  if (!isRecovery && !passed && attempt.exam.type === "OFFICIAL") {
    // Verifica se já existe prova de recuperação para este aluno
    const existingRecovery = await db.exam.findFirst({
      where: {
        parentExamId: id,
        isRecovery: true,
        assignments: { some: { userId: user.userId } },
      },
    });
    if (!existingRecovery) {
      // Janela de recuperação: 7 dias a partir de amanhã, 23h59
      const recStart = new Date();
      recStart.setDate(recStart.getDate() + 1);
      recStart.setHours(8, 0, 0, 0);
      const recEnd = new Date();
      recEnd.setDate(recEnd.getDate() + 8);
      recEnd.setHours(23, 59, 0, 0);

      const recovery = await db.exam.create({
        data: {
          title: `RECUPERAÇÃO - ${attempt.exam.title}`,
          description: `Prova de recuperação automática para ${user.name}. Prova original: ${attempt.exam.title}.`,
          classId: attempt.exam.classId,
          type: "OFFICIAL",
          startDateTime: recStart,
          endDateTime: recEnd,
          durationMinutes: attempt.exam.durationMinutes,
          passingScore: attempt.exam.passingScore,
          showResults: attempt.exam.showResults,
          shuffleQuestions: true,
          active: true,
          questionCount: attempt.exam.questionCount,
          poolSubjectIds: attempt.exam.poolSubjectIds,
          poolDifficulty: attempt.exam.poolDifficulty,
          isRecovery: true,
          parentExamId: id,
        },
      });
      // Atribui a recuperação apenas a este aluno
      await db.examAssignment.create({
        data: {
          examId: recovery.id,
          userId: user.userId,
          classId: attempt.exam.classId,
          notes: "Recuperação automática - nota abaixo de " + attempt.exam.passingScore,
        },
      });
      recoveryCreated = true;
      recoveryExamId = recovery.id;
    }
  }

  return NextResponse.json({
    ok: true,
    score,
    correctCount: correct,
    totalCount: total,
    timeSpentSeconds,
    passed,
    passingScore: attempt.exam.passingScore,
    isRecovery,
    recoveryCreated,
    recoveryExamId,
    // Nota em escala 0-10
    nota10: (score / 10).toFixed(1),
  });
}
