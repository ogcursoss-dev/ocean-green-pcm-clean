import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!exam) {
    return NextResponse.json(
      { error: "Prova não encontrada." },
      { status: 404 }
    );
  }
  const questions = await db.examQuestion.findMany({
    where: { examId: id },
    orderBy: { order: "asc" },
    include: {
      question: {
        include: {
          subject: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });
  return NextResponse.json({ questions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const { questionId, order } = body || {};
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId é obrigatório." },
        { status: 400 }
      );
    }
    const q = await db.question.findUnique({ where: { id: questionId } });
    if (!q) {
      return NextResponse.json(
        { error: "Questão não encontrada." },
        { status: 404 }
      );
    }
    // Se ordem não definida, coloca no final
    let finalOrder = Number(order);
    if (isNaN(finalOrder)) {
      const max = await db.examQuestion.aggregate({
        where: { examId: id },
        _max: { order: true },
      });
      finalOrder = (max._max.order || 0) + 1;
    }
    const examQuestion = await db.examQuestion.upsert({
      where: {
        examId_questionId: { examId: id, questionId },
      },
      update: { order: finalOrder },
      create: { examId: id, questionId, order: finalOrder },
    });
    return NextResponse.json({ ok: true, examQuestion });
  } catch (err: any) {
    console.error("[exam-questions/add]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao adicionar questão." },
      { status: 500 }
    );
  }
}
