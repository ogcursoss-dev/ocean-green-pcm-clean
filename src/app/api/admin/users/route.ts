import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, cleanCpf, isValidCpf } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const role = url.searchParams.get("role") || undefined;
  const users = await db.user.findMany({
    where: {
      AND: [
        role ? { role } : {},
        search
          ? {
              OR: [
                { name: { contains: search } },
                { cpf: { contains: cleanCpf(search) } },
                { email: { contains: search } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      cpf: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  const ids = users.map((u) => u.id);
  const memberships = await db.classMember.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, classId: true, class: { select: { name: true } } },
  });
  const byUser: Record<string, { id: string; name: string }[]> = {};
  for (const m of memberships) {
    (byUser[m.userId] ||= []).push({ id: m.classId, name: m.class.name });
  }
  return NextResponse.json({
    users: users.map((u) => ({ ...u, classes: byUser[u.id] || [] })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { cpf, name, email, password, role, classIds } = body || {};
    // Admin cadastra apenas CPF + Nome. Senha é opcional (padrão: CPF)
    if (!cpf || !name) {
      return NextResponse.json(
        { error: "CPF e nome são obrigatórios." },
        { status: 400 }
      );
    }
    const cleaned = cleanCpf(String(cpf));
    if (!isValidCpf(cleaned)) {
      return NextResponse.json(
        { error: "CPF inválido. Informe 11 dígitos." },
        { status: 400 }
      );
    }
    const exists = await db.user.findUnique({ where: { cpf: cleaned } });
    if (exists) {
      return NextResponse.json(
        { error: "Já existe usuário com este CPF." },
        { status: 409 }
      );
    }
    const finalRole = role === "ADMIN" ? "ADMIN" : "STUDENT";
    // Senha padrão = CPF (sem formatação) se não informada
    const finalPassword = password ? String(password) : cleaned;
    const passwordHash = await hashPassword(finalPassword);
    const user = await db.user.create({
      data: {
        cpf: cleaned,
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        passwordHash,
        role: finalRole,
        active: true,
      },
    });
    const ids: string[] = Array.isArray(classIds) ? classIds.filter(Boolean) : [];
    if (ids.length > 0) {
      for (const classId of ids) {
        await db.classMember.upsert({
          where: { userId_classId: { userId: user.id, classId } },
          update: {},
          create: { userId: user.id, classId },
        });
      }
    }
    return NextResponse.json({
      ok: true,
      userId: user.id,
      generatedPassword: !password ? cleaned : undefined,
    });
  } catch (err: any) {
    console.error("[users/create]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar usuário." },
      { status: 500 }
    );
  }
}
