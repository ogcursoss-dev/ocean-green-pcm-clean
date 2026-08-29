import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";

// PDF da prova de um aluno específico (com nome e CPF no cabeçalho)
// GET /api/admin/reports/exam/[examId]/pdf?userId=xxx&withAnswers=true
export async function GET(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { examId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const withAnswers = url.searchParams.get("withAnswers") === "true";

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: { class: { select: { name: true } } },
  });
  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }

  // Se userId for fornecido, usa as questões sorteadas para esse aluno
  let questions: Array<{
    id: string;
    statement: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    subject?: { name: string } | null;
  }> = [];

  let studentName = "—";
  let studentCpf = "—";
  let attemptInfo: { score?: number | null; correctCount?: number | null; submittedAt?: Date | null } = {};

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, cpf: true },
    });
    if (user) {
      studentName = user.name;
      studentCpf = user.cpf;
    }
    const attempt = await db.examAttempt.findUnique({
      where: { examId_userId: { examId, userId } },
    });
    if (attempt) {
      attemptInfo = {
        score: attempt.score,
        correctCount: attempt.correctCount,
        submittedAt: attempt.submittedAt,
      };
      const qIds: string[] = attempt.questionIds ? JSON.parse(attempt.questionIds) : [];
      if (qIds.length > 0) {
        const qs = await db.question.findMany({
          where: { id: { in: qIds } },
          include: { subject: { select: { name: true } } },
        });
        questions = qIds.map(qid => qs.find(q => q.id === qid)).filter(Boolean) as typeof questions;
      }
    } else {
      // Sem tentativa: sorteia questões só para exibição
      const poolSubjectIds: string[] | null = exam.poolSubjectIds ? JSON.parse(exam.poolSubjectIds) : null;
      const whereQ: any = { active: true };
      if (poolSubjectIds && poolSubjectIds.length) whereQ.subjectId = { in: poolSubjectIds };
      if (exam.poolDifficulty) whereQ.difficulty = exam.poolDifficulty;
      const all = await db.question.findMany({
        where: whereQ,
        include: { subject: { select: { name: true } } },
      });
      const shuffled = all.sort(() => Math.random() - 0.5);
      questions = shuffled.slice(0, exam.questionCount || 20);
    }
  } else {
    // Sem userId: usa questões fixas vinculadas ou sorteia
    const eqs = await db.examQuestion.findMany({
      where: { examId },
      orderBy: { order: "asc" },
      include: { question: { include: { subject: { select: { name: true } } } } },
    });
    if (eqs.length > 0) {
      questions = eqs.map(e => e.question);
    } else {
      const all = await db.question.findMany({
        where: { active: true },
        include: { subject: { select: { name: true } } },
      });
      const shuffled = all.sort(() => Math.random() - 0.5);
      questions = shuffled.slice(0, exam.questionCount || 20);
    }
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ===== Cabeçalho com nome e CPF do aluno =====
  doc.setFillColor(10, 92, 54);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ocean Green Treinamentos", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Avaliação PCM — Planejamento e Controle da Manutenção", margin, 17);
  // Nome e CPF do aluno no cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Aluno: ${studentName}`, margin, 24);
  const cpfFmt = studentCpf !== "—"
    ? studentCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : "—";
  doc.text(`CPF: ${cpfFmt}`, margin, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    withAnswers ? "Versão com gabarito" : "Versão do aluno",
    pageWidth - margin,
    11,
    { align: "right" }
  );

  // Info da prova
  doc.setTextColor(20, 30, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(exam.title, margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 44;
  if (exam.description) {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(exam.description, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  }
  doc.setFontSize(10);
  doc.text(`Turma: ${exam.class?.name || "—"}`, margin, y);
  y += 5;
  doc.text(
    `Período: ${exam.startDateTime.toLocaleString("pt-BR")} até ${exam.endDateTime.toLocaleString("pt-BR")}`,
    margin, y
  );
  y += 5;
  doc.text(`Duração: ${exam.durationMinutes} min | Questões: ${questions.length}`, margin, y);
  y += 5;
  if (attemptInfo.score != null) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 92, 54);
    doc.text(`Nota: ${attemptInfo.score.toFixed(1)}% (${attemptInfo.correctCount}/${questions.length} acertos)`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 30, 25);
  }
  y += 5;
  doc.setDrawColor(46, 139, 87);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Questões
  const options = ["A", "B", "C", "D"];
  const optionLabels = ["optionA", "optionB", "optionC", "optionD"] as const;

  // Busca respostas do aluno se houver tentativa
  let ansMap: Record<string, string | undefined> = {};
  if (userId) {
    const att = await db.examAttempt.findUnique({
      where: { examId_userId: { examId, userId } },
    });
    if (att) {
      const list: Array<{ questionId: string; selected?: string }> = JSON.parse(att.answers || "[]");
      for (const a of list) ansMap[a.questionId] = a.selected;
    }
  }

  questions.forEach((q, idx) => {
    if (y > 250) { doc.addPage(); y = 20; }
    const selected = ansMap[q.id];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 92, 54);
    doc.text(`Questão ${idx + 1}`, margin, y);
    if (q.subject) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`[${q.subject.name}]`, pageWidth - margin, y, { align: "right" });
    }
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 25);
    const statement = doc.splitTextToSize(q.statement, pageWidth - margin * 2);
    doc.text(statement, margin, y);
    y += statement.length * 4.5 + 2;

    for (let i = 0; i < 4; i++) {
      if (y > 270) { doc.addPage(); y = 20; }
      const letter = options[i];
      const text = q[optionLabels[i]];
      const isCorrect = withAnswers && q.correctAnswer === letter;
      const isSelected = selected === letter;

      if (isCorrect) {
        doc.setFillColor(46, 139, 87);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.roundedRect(margin, y - 4, 6, 6, 1, 1, "F");
        doc.text(letter, margin + 1.5, y);
      } else if (isSelected) {
        doc.setFillColor(185, 28, 28);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.roundedRect(margin, y - 4, 6, 6, 1, 1, "F");
        doc.text(letter, margin + 1.5, y);
      } else {
        doc.setDrawColor(180, 200, 190);
        doc.setTextColor(20, 30, 25);
        doc.setFont("helvetica", "normal");
        doc.roundedRect(margin, y - 4, 6, 6, 1, 1, "D");
        doc.text(letter, margin + 1.5, y);
      }
      const optLines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
      doc.text(optLines, margin + 10, y);
      y += Math.max(6, optLines.length * 4.5);
    }

    if (withAnswers) {
      y += 2;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFillColor(244, 247, 246);
      const explLines = doc.splitTextToSize(q.explanation || "Sem explicação.", pageWidth - margin * 2 - 4);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 4 + explLines.length * 4.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(10, 92, 54);
      doc.text(`Gabarito: ${q.correctAnswer}`, margin + 2, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(40, 60, 50);
      doc.text(explLines, margin + 2, y);
      y += explLines.length * 4.5 + 6;
    } else {
      y += 2;
      if (selected) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Sua resposta: ${selected}`, margin, y);
        y += 6;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Resposta: ( ___ )", margin, y);
        y += 8;
      }
    }
    y += 2;
    doc.setDrawColor(220, 230, 225);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Ocean Green Treinamentos — ${exam.title} — ${studentName} — Página ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  const pdfBytes = doc.output("arraybuffer");
  const safeName = studentName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const filename = `prova-${exam.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${safeName}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
