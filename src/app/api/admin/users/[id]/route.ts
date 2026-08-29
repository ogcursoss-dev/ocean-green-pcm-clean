import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, cleanCpf, isValidCpf } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

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
    const { name, email, role, password, active, classIds } = body || {};
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }
    const data: any = {};
    if (typeof name === "string") data.name = name.trim();
    if (typeof email === "string") data.email = email.trim() || null;
    if (role === "ADMIN" || role === "STUDENT") data.role = role;
    if (typeof active === "boolean") data.active = active;
    if (typeof password === "string" && password.length > 0) {
      data.passwordHash = await hashPassword(password);
    }
    await db.user.update({ where: { id }, data });

    if (Array.isArray(classIds)) {
      // Remove antigas e cria novas
      await db.classMember.deleteMany({ where: { userId: id } });
      if (classIds.length > 0) {
        for (const classId of classIds.filter(Boolean)) {
          await db.classMember.upsert({
            where: { userId_classId: { userId: id, classId } },
            update: {},
            create: { userId: id, classId },
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[users/patch]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao atualizar usuário." },
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
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }
    // Desativa em vez de apagar para preservar histórico
    if (user.role === "ADMIN") {
      const admins = await db.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Não é possível desativar o único administrador." },
          { status: 400 }
        );
      }
    }
    await db.user.update({ where: { id }, data: { active: !user.active } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[users/delete]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao desativar usuário." },
      { status: 500 }
    );
  }
}
