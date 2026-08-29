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
  const cls = await db.class.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { enrolledAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              cpf: true,
              email: true,
              role: true,
              active: true,
            },
          },
        },
      },
      exams: {
        orderBy: { startDateTime: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          startDateTime: true,
          endDateTime: true,
        },
      },
    },
  });
  if (!cls) {
    return NextResponse.json(
      { error: "Turma não encontrada." },
      { status: 404 }
    );
  }
  return NextResponse.json({ class: cls });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, active } = body || {};
    const data: any = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof description === "string") data.description = description || null;
    if (typeof active === "boolean") data.active = active;
    const cls = await db.class.update({ where: { id }, data });
    return NextResponse.json({ ok: true, class: cls });
  } catch (err: any) {
    console.error("[classes/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao atualizar turma." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    // Verifica se existem provas vinculadas — se sim, não permite deletar
    const count = await db.exam.count({ where: { classId: id } });
    if (count > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: existem ${count} provas vinculadas a esta turma.`,
        },
        { status: 400 }
      );
    }
    await db.class.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[classes/delete]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao excluir turma." },
      { status: 500 }
    );
  }
}
