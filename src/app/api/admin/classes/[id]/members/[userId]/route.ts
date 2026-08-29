import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { id, userId } = await params;
  try {
    await db.classMember.deleteMany({
      where: { classId: id, userId },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[members/remove]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao desmatricular aluno." },
      { status: 500 }
    );
  }
}
