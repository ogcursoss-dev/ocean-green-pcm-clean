import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const classes = await db.class.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, exams: true } },
    },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, description, active } = body || {};
    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Nome da turma é obrigatório." },
        { status: 400 }
      );
    }
    const cls = await db.class.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description) : null,
        active: typeof active === "boolean" ? active : true,
      },
    });
    return NextResponse.json({ ok: true, classId: cls.id });
  } catch (err: any) {
    console.error("[classes/create]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar turma." },
      { status: 500 }
    );
  }
}
