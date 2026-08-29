import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, questionId } = await params;
  try {
    await db.examQuestion.deleteMany({
      where: { examId: id, questionId },
    });
    // Reordena
    const items = await db.examQuestion.findMany({
      where: { examId: id },
      orderBy: { order: "asc" },
    });
    for (let i = 0; i < items.length; i++) {
      await db.examQuestion.update({
        where: { id: items[i].id },
        data: { order: i + 1 },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[exam-questions/remove]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao remover questão." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, questionId } = await params;
  try {
    const body = await req.json();
    const { order } = body || {};
    await db.examQuestion.update({
      where: { examId_questionId: { examId: id, questionId } },
      data: { order: Number(order) },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[exam-questions/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao reordenar questão." },
      { status: 500 }
    );
  }
}
