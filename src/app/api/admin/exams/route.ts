import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const exams = await db.exam.findMany({
    where: {
      AND: [classId ? { classId } : {}, type ? { type } : {}],
    },
    orderBy: { startDateTime: "desc" },
    include: {
      class: { select: { id: true, name: true } },
      _count: { select: { questions: true, assignments: true, attempts: true } },
    },
  });
  return NextResponse.json({ exams });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      title,
      description,
      classId,
      type,
      startDateTime,
      endDateTime,
      durationMinutes,
      passingScore,
      showResults,
      shuffleQuestions,
      active,
      questionCount,
      poolSubjectIds,
      poolDifficulty,
    } = body || {};
    if (!title || !classId || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Título, turma, data de início e fim são obrigatórios." },
        { status: 400 }
      );
    }
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Datas inválidas." },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "Data de fim deve ser posterior à de início." },
        { status: 400 }
      );
    }
    const cls = await db.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json(
        { error: "Turma não encontrada." },
        { status: 404 }
      );
    }
    const exam = await db.exam.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description) : null,
        classId,
        type: type === "SIMULATION" ? "SIMULATION" : "OFFICIAL",
        startDateTime: start,
        endDateTime: end,
        durationMinutes: Number(durationMinutes) || 60,
        passingScore: Number(passingScore) || 60,
        showResults: showResults || "AFTER_END",
        shuffleQuestions: !!shuffleQuestions,
        active: typeof active === "boolean" ? active : true,
        // Randomização por aluno
        questionCount: Number(questionCount) || 20,
        poolSubjectIds: poolSubjectIds
          ? JSON.stringify(poolSubjectIds)
          : null,
        poolDifficulty: poolDifficulty || null,
      },
    });
    return NextResponse.json({ ok: true, examId: exam.id });
  } catch (err: any) {
    console.error("[exams/create]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar prova." },
      { status: 500 }
    );
  }
}
