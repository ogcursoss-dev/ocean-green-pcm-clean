import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const VALID_DIFF = new Set(["EASY", "MEDIUM", "HARD"]);
const VALID_ANS = new Set(["A", "B", "C", "D"]);

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId") || undefined;
  const difficulty = url.searchParams.get("difficulty") || undefined;
  const search = (url.searchParams.get("search") || "").trim();
  const active = url.searchParams.get("active");
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 50);

  const where = {
    AND: [
      subjectId ? { subjectId } : {},
      difficulty && VALID_DIFF.has(difficulty) ? { difficulty } : {},
      active === "true" ? { active: true } : active === "false" ? { active: false } : {},
      search
        ? {
            OR: [
              { statement: { contains: search } },
              { explanation: { contains: search } },
            ],
          }
        : {},
    ],
  };
  const [questions, total] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        subject: { select: { id: true, name: true, category: true } },
      },
    }),
    db.question.count({ where }),
  ]);
  return NextResponse.json({
    questions,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      subjectId,
      difficulty,
      statement,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      active = true,
    } = body || {};
    if (!subjectId || !statement || !optionA || !optionB || !optionC || !optionD) {
      return NextResponse.json(
        { error: "Disciplina, enunciado e 4 alternativas são obrigatórios." },
        { status: 400 }
      );
    }
    const diff = String(difficulty).toUpperCase();
    if (!VALID_DIFF.has(diff)) {
      return NextResponse.json(
        { error: "Dificuldade inválida (use EASY, MEDIUM ou HARD)." },
        { status: 400 }
      );
    }
    const correct = String(correctAnswer).toUpperCase();
    if (!VALID_ANS.has(correct)) {
      return NextResponse.json(
        { error: "Resposta correta deve ser A, B, C ou D." },
        { status: 400 }
      );
    }
    const subj = await db.subject.findUnique({ where: { id: subjectId } });
    if (!subj) {
      return NextResponse.json(
        { error: "Disciplina não encontrada." },
        { status: 404 }
      );
    }
    const q = await db.question.create({
      data: {
        subjectId,
        difficulty: diff,
        statement: String(statement).trim(),
        optionA: String(optionA).trim(),
        optionB: String(optionB).trim(),
        optionC: String(optionC).trim(),
        optionD: String(optionD).trim(),
        correctAnswer: correct,
        explanation: String(explanation || "").trim(),
        active: !!active,
      },
    });
    return NextResponse.json({ ok: true, questionId: q.id });
  } catch (err: any) {
    console.error("[questions/create]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar questão." },
      { status: 500 }
    );
  }
}
