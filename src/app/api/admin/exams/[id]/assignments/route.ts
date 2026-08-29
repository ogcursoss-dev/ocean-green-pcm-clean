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
  const assignments = await db.examAssignment.findMany({
    where: { examId: id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, cpf: true },
      },
    },
  });
  return NextResponse.json({ assignments });
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
    const {
      userId,
      classId,
      customStart,
      customEnd,
      customDuration,
      notes,
    } = body || {};
    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json(
        { error: "Prova não encontrada." },
        { status: 404 }
      );
    }
    // Se userId foi passado, validar
    if (userId) {
      const u = await db.user.findUnique({ where: { id: userId } });
      if (!u) {
        return NextResponse.json(
          { error: "Aluno não encontrado." },
          { status: 404 }
        );
      }
    }
    const data: any = {
      examId: id,
      userId: userId || null,
      classId: classId || exam.classId,
      notes: notes ? String(notes) : null,
    };
    if (customStart) {
      const d = new Date(customStart);
      if (!isNaN(d.getTime())) data.customStart = d;
    }
    if (customEnd) {
      const d = new Date(customEnd);
      if (!isNaN(d.getTime())) data.customEnd = d;
    }
    if (customDuration !== undefined && customDuration !== null && !isNaN(Number(customDuration))) {
      data.customDuration = Number(customDuration);
    }
    // Anti-duplicata: se userId=null e já existe atribuição de turma inteira, evita
    if (!userId) {
      const exists = await db.examAssignment.findFirst({
        where: { examId: id, userId: null },
      });
      if (exists) {
        return NextResponse.json(
          { error: "Já existe uma atribuição para a turma inteira." },
          { status: 409 }
        );
      }
    } else {
      const exists = await db.examAssignment.findFirst({
        where: { examId: id, userId },
      });
      if (exists) {
        return NextResponse.json(
          { error: "Já existe uma atribuição individual para este aluno." },
          { status: 409 }
        );
      }
    }
    const assignment = await db.examAssignment.create({ data });
    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  } catch (err: any) {
    console.error("[assignments/create]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar atribuição." },
      { status: 500 }
    );
  }
}
