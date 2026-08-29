import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

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
    const { userId } = body || {};
    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 }
      );
    }
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Aluno não encontrado." },
        { status: 404 }
      );
    }
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Apenas alunos podem ser matriculados." },
        { status: 400 }
      );
    }
    await db.classMember.upsert({
      where: { userId_classId: { userId, classId: id } },
      update: {},
      create: { userId, classId: id },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[members/add]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao matricular aluno." },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const members = await db.classMember.findMany({
    where: { classId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          cpf: true,
          email: true,
          active: true,
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });
  return NextResponse.json({ members });
}
