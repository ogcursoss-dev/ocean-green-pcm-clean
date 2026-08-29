import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const subjects = await db.subject.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { questions: { where: { active: true } } },
      },
    },
  });
  return NextResponse.json({
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      _count: { questions: s._count.questions },
    })),
  });
}
