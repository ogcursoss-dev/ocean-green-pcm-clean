import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const subjects = await db.subject.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { questions: true } } },
  });
  return NextResponse.json({ subjects });
}
