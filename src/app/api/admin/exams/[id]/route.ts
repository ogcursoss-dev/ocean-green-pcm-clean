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
    include: {
      class: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              subject: { select: { id: true, name: true } },
            },
          },
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, cpf: true },
          },
        },
      },
    },
  });
  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ exam });
}

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
      title,
      description,
      classId,
      type,
      startDateTime,
      endDateTime,
      durationMinutes,
      passingScore,
      showResults,
      shuffleQuestions,
      active,
      questionCount,
      poolSubjectIds,
      poolDifficulty,
    } = body || {};
    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = description || null;
    if (classId !== undefined) data.classId = classId;
    if (type !== undefined) data.type = type === "SIMULATION" ? "SIMULATION" : "OFFICIAL";
    if (startDateTime !== undefined) data.startDateTime = new Date(startDateTime);
    if (endDateTime !== undefined) data.endDateTime = new Date(endDateTime);
    if (durationMinutes !== undefined) data.durationMinutes = Number(durationMinutes);
    if (passingScore !== undefined) data.passingScore = Number(passingScore);
    if (showResults !== undefined) data.showResults = showResults;
    if (shuffleQuestions !== undefined) data.shuffleQuestions = !!shuffleQuestions;
    if (typeof active === "boolean") data.active = active;
    if (questionCount !== undefined) data.questionCount = Number(questionCount) || 20;
    if (poolSubjectIds !== undefined) data.poolSubjectIds = poolSubjectIds ? JSON.stringify(poolSubjectIds) : null;
    if (poolDifficulty !== undefined) data.poolDifficulty = poolDifficulty || null;

    const exam = await db.exam.update({ where: { id }, data });
    return NextResponse.json({ ok: true, exam });
  } catch (err: any) {
    console.error("[exams/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao atualizar prova." },
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
    await db.exam.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[exams/delete]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao excluir prova." },
      { status: 500 }
    );
  }
}
