import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, assignmentId } = await params;
  const assignment = await db.examAssignment.findFirst({
    where: { id: assignmentId, examId: id },
    include: {
      user: { select: { id: true, name: true, cpf: true } },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "Atribuição não encontrada." },
      { status: 404 }
    );
  }
  return NextResponse.json({ assignment });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, assignmentId } = await params;
  try {
    await db.examAssignment.deleteMany({
      where: { id: assignmentId, examId: id },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[assignments/delete]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao excluir atribuição." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, assignmentId } = await params;
  try {
    const body = await req.json();
    const { customStart, customEnd, customDuration, notes } = body || {};
    const data: any = {};
    if (customStart !== undefined) {
      data.customStart = customStart ? new Date(customStart) : null;
    }
    if (customEnd !== undefined) {
      data.customEnd = customEnd ? new Date(customEnd) : null;
    }
    if (customDuration !== undefined) {
      data.customDuration =
        customDuration === null || customDuration === ""
          ? null
          : Number(customDuration);
    }
    if (notes !== undefined) data.notes = notes || null;
    const assignment = await db.examAssignment.update({
      where: { id: assignmentId },
      data,
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (err: any) {
    console.error("[assignments/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao atualizar atribuição." },
      { status: 500 }
    );
  }
}
