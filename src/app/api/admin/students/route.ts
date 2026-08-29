import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Lista todos os alunos (STUDENT) ativos para seleção em agendamentos individuais
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const where: any = { role: "STUDENT", active: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search.replace(/\D/g, "") } },
    ];
  }
  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      cpf: true,
      email: true,
      classMemberships: {
        include: { class: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      cpf: u.cpf,
      email: u.email,
      classes: u.classMemberships.map((cm) => ({
        id: cm.class.id,
        name: cm.class.name,
      })),
    })),
  });
}
