import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const VALID_DIFF = new Set(["EASY", "MEDIUM", "HARD"]);
const VALID_ANS = new Set(["A", "B", "C", "D"]);

export async function PATCH(
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
    const data: any = {};
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
      active,
    } = body || {};
    if (subjectId !== undefined) data.subjectId = subjectId;
    if (difficulty !== undefined) {
      const d = String(difficulty).toUpperCase();
      if (!VALID_DIFF.has(d)) {
        return NextResponse.json(
          { error: "Dificuldade inválida." },
          { status: 400 }
        );
      }
      data.difficulty = d;
    }
    if (statement !== undefined) data.statement = String(statement).trim();
    if (optionA !== undefined) data.optionA = String(optionA).trim();
    if (optionB !== undefined) data.optionB = String(optionB).trim();
    if (optionC !== undefined) data.optionC = String(optionC).trim();
    if (optionD !== undefined) data.optionD = String(optionD).trim();
    if (correctAnswer !== undefined) {
      const c = String(correctAnswer).toUpperCase();
      if (!VALID_ANS.has(c)) {
        return NextResponse.json(
          { error: "Resposta correta inválida." },
          { status: 400 }
        );
      }
      data.correctAnswer = c;
    }
    if (explanation !== undefined) data.explanation = String(explanation).trim();
    if (typeof active === "boolean") data.active = active;

    const q = await db.question.update({ where: { id }, data });
    return NextResponse.json({ ok: true, question: q });
  } catch (err: any) {
    console.error("[questions/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao atualizar questão." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const q = await db.question.findUnique({ where: { id } });
    if (!q) {
      return NextResponse.json(
        { error: "Questão não encontrada." },
        { status: 404 }
      );
    }
    await db.question.update({ where: { id }, data: { active: !q.active } });
    return NextResponse.json({ ok: true, active: !q.active });
  } catch (err: any) {
    console.error("[questions/delete]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao alternar status." },
      { status: 500 }
    );
  }
}
