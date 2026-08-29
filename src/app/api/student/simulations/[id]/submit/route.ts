import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await params;
  const sim = await db.simulation.findUnique({ where: { id } });
  if (!sim || sim.userId !== user.userId) {
    return NextResponse.json(
      { error: "Simulado não encontrado." },
      { status: 404 }
    );
  }
  if (sim.score !== null) {
    return NextResponse.json(
      { error: "Simulado já foi submetido." },
      { status: 400 }
    );
  }
  try {
    const body = await req.json();
    const answers: Array<{ questionId: string; selected?: string }> =
      body?.answers || [];
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers deve ser um array." },
        { status: 400 }
      );
    }
    const questionIds: string[] = JSON.parse(sim.questionIds);
    const questions = await db.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctAnswer: true },
    });
    const correctMap: Record<string, string> = {};
    for (const q of questions) correctMap[q.id] = q.correctAnswer;
    let correct = 0;
    const finalAnswers: Array<{ questionId: string; selected: string | null; correct: boolean }> = [];
    for (const qid of questionIds) {
      const a = answers.find((x) => x.questionId === qid);
      const selected = a?.selected || null;
      const isCorrect = !!selected && correctMap[qid] === selected;
      if (isCorrect) correct++;
      finalAnswers.push({ questionId: qid, selected, correct: isCorrect });
    }
    const total = questionIds.length;
    const score = total > 0 ? (correct / total) * 100 : 0;
    const now = new Date();
    const timeSpentSeconds = Math.floor(
      (now.getTime() - sim.createdAt.getTime()) / 1000
    );
    await db.simulation.update({
      where: { id },
      data: {
        answers: JSON.stringify(finalAnswers),
        score,
        correctCount: correct,
        timeSpentSeconds,
      },
    });
    return NextResponse.json({
      ok: true,
      score,
      correctCount: correct,
      totalCount: total,
      timeSpentSeconds,
    });
  } catch (err: any) {
    console.error("[simulations/submit]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao submeter simulado." },
      { status: 500 }
    );
  }
}
