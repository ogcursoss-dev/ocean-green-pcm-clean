import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const sims = await db.simulation.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      score: true,
      correctCount: true,
      questionCount: true,
      createdAt: true,
      difficulty: true,
      timeSpentSeconds: true,
    },
  });
  return NextResponse.json({ simulations: sims });
}
