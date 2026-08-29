import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Cria agendamento individual para um aluno específico com janela temporal própria
// Permite que o aluno faça a prova em data/hora diferente dos demais
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
    const { userId, customStart, customEnd, customDuration, notes } = body || {};

    if (!userId) {
      return NextResponse.json(
        { error: "Aluno é obrigatório." },
        { status: 400 }
      );
    }
    if (!customStart || !customEnd) {
      return NextResponse.json(
        { error: "Data e hora de início e fim são obrigatórias para o agendamento individual." },
        { status: 400 }
      );
    }

    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json(
        { error: "Prova não encontrada." },
        { status: 404 }
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
        { error: "Apenas alunos podem receber agendamento individual." },
        { status: 400 }
      );
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Datas inválidas." },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "A data/hora de fim deve ser posterior à de início." },
        { status: 400 }
      );
    }

    // Verifica se já existe atribuição para este aluno nesta prova
    const existing = await db.examAssignment.findFirst({
      where: { examId: id, userId },
    });
    if (existing) {
      // Atualiza a existente com os novos valores
      const updated = await db.examAssignment.update({
        where: { id: existing.id },
        data: {
          customStart: start,
          customEnd: end,
          customDuration: customDuration ? Number(customDuration) : null,
          notes: notes ? String(notes) : null,
        },
      });
      return NextResponse.json({
        ok: true,
        assignmentId: updated.id,
        updated: true,
        message: `Agendamento individual atualizado para ${user.name}.`,
      });
    }

    // Cria nova atribuição individual com janela personalizada
    const assignment = await db.examAssignment.create({
      data: {
        examId: id,
        userId,
        classId: exam.classId,
        customStart: start,
        customEnd: end,
        customDuration: customDuration ? Number(customDuration) : null,
        notes: notes ? String(notes) : `Prova agendada individualmente para ${user.name}`,
      },
    });

    return NextResponse.json({
      ok: true,
      assignmentId: assignment.id,
      message: `Prova agendada individualmente para ${user.name} em ${start.toLocaleString("pt-BR")}.`,
    });
  } catch (err: any) {
    console.error("[individual-schedule]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao criar agendamento individual." },
      { status: 500 }
    );
  }
}
