import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Cores da escola Ocean Green (extraídas da logo)
const COLORS = {
  verdeLimao: [140, 195, 74] as [number, number, number],
  verdeMedio: [124, 179, 66] as [number, number, number],
  azulMarinho: [13, 71, 161] as [number, number, number],
  azulCiano: [0, 172, 193] as [number, number, number],
  verdeEscuro: [10, 92, 54] as [number, number, number],
  verdeAprov: [16, 122, 87] as [number, number, number],
  vermelhoReprov: [185, 28, 28] as [number, number, number],
  cinzaClaro: [244, 247, 246] as [number, number, number],
  cinzaTexto: [80, 100, 90] as [number, number, number],
  textoEscuro: [20, 30, 25] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
};

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  // Gradiente verde → azul
  for (let i = 0; i < 50; i++) {
    const t = i / 50;
    const r = Math.round(COLORS.verdeLimao[0] + (COLORS.azulMarinho[0] - COLORS.verdeLimao[0]) * t);
    const g = Math.round(COLORS.verdeLimao[1] + (COLORS.azulMarinho[1] - COLORS.verdeLimao[1]) * t);
    const b = Math.round(COLORS.verdeLimao[2] + (COLORS.azulMarinho[2] - COLORS.verdeLimao[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, pageWidth, 1, "F");
  }
  // Linhas decorativas (ondas)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(margin, 38, pageWidth - margin, 38);
  doc.setDrawColor(...COLORS.azulCiano);
  doc.setLineWidth(0.5);
  doc.line(margin, 40.5, pageWidth - margin, 40.5);
  // Nome da escola
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Ocean Green", margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("TREINAMENTOS", margin, 22);
  // Título à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth - margin, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(subtitle, pageWidth - margin, 21, { align: "right" });
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 25, { align: "right" });
}

function drawFooter(doc: jsPDF, label: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  doc.setDrawColor(...COLORS.verdeLimao);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.cinzaTexto);
  doc.setFont("helvetica", "normal");
  doc.text(label, margin, pageHeight - 7);
  const pageCount = doc.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  doc.text(`Página ${currentPage}/${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
}

// Relatório 2: Completo — resumo + todas as provas de cada aluno com acertos/erros
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "classId é obrigatório." }, { status: 400 });
  }

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  const exams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL", isRecovery: false },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true, questionCount: true },
  });

  const allExams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL" },
    orderBy: { startDateTime: "asc" },
  });

  const members = await db.classMember.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true, cpf: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const userIds = members.map((m) => m.userId);

  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: allExams.map((e) => e.id) }, userId: { in: userIds } },
    include: {
      exam: { select: { id: true, title: true, passingScore: true, isRecovery: true, parentExamId: true } },
      user: { select: { name: true, cpf: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ====== CAPA: Resumo ======
  drawHeader(doc, "Relatório Completo", "Avaliações Detalhadas");

  let y = 50;
  doc.setTextColor(...COLORS.textoEscuro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`Turma: ${cls.name}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.cinzaTexto);
  doc.text(`Total de alunos: ${members.length}  |  Provas aplicadas: ${exams.length}`, margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("Este relatório apresenta o resumo de notas na primeira página, seguido das provas", margin, y);
  y += 3.5;
  doc.text("completas de cada aluno com acertos e erros questão por questão.", margin, y);
  y += 8;

  // Tabela resumo
  const head = [["#", "ALUNO", "CPF", ...exams.map((e) => e.title.substring(0, 16)), "NOTA", "SITUAÇÃO"]];
  const body: string[][] = [];
  for (const m of members) {
    const studentAttempts = attempts.filter((a) => a.userId === m.user.id);
    const examScores: Record<string, number | null> = {};
    for (const ex of exams) {
      const att = studentAttempts.find((a) => a.examId === ex.id);
      examScores[ex.id] = att?.score ?? null;
    }
    let finalScore: number | null = null;
    for (const ex of exams) {
      const original = examScores[ex.id];
      const recovs = studentAttempts.filter((a) => a.exam.isRecovery && a.exam.parentExamId === ex.id);
      const recovScore = recovs.length ? Math.max(...recovs.map((a) => a.score ?? 0)) : null;
      const best = [original, recovScore].filter((s) => s !== null).map((s) => s as number);
      if (best.length) finalScore = Math.max(...best);
    }
    const passingScore = exams[0]?.passingScore ?? 60;
    const situation = finalScore === null ? "Pendente" : finalScore >= passingScore ? "Aprovado" : "Reprovado";
    const examCols = exams.map((e) => {
      const s = examScores[e.id];
      return s === null ? "—" : s.toFixed(1) + "%";
    });
    const idx = members.indexOf(m) + 1;
    body.push([
      String(idx),
      m.user.name,
      m.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
      ...examCols,
      finalScore === null ? "—" : finalScore.toFixed(1) + "%",
      situation,
    ]);
  }

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 230, 225], lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.azulMarinho, textColor: COLORS.branco, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: { 0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: 42 }, 2: { cellWidth: 26, font: "courier", fontSize: 7 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === head[0].length - 1) {
        const txt = String(data.cell.raw);
        if (txt === "Aprovado") { data.cell.styles.textColor = COLORS.verdeAprov; data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = [232, 245, 233]; }
        else if (txt === "Reprovado") { data.cell.styles.textColor = COLORS.vermelhoReprov; data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = [254, 226, 226]; }
        else data.cell.styles.textColor = COLORS.cinzaTexto;
      }
      if (data.section === "body" && data.column.index === head[0].length - 2) {
        const txt = String(data.cell.raw);
        if (txt !== "—") {
          const val = parseFloat(txt);
          data.cell.styles.fontStyle = "bold";
          if (val >= 60) data.cell.styles.textColor = COLORS.verdeAprov;
          else data.cell.styles.textColor = COLORS.vermelhoReprov;
        }
      }
    },
  });

  drawFooter(doc, "Ocean Green Treinamentos — Relatório Completo");

  // ====== PÁGINAS DETALHADAS: prova por prova de cada aluno ======
  const options = ["A", "B", "C", "D"];
  const optionFields = ["optionA", "optionB", "optionC", "optionD"] as const;

  for (const m of members) {
    const studentAttempts = attempts.filter((a) => a.userId === m.user.id);
    if (studentAttempts.length === 0) continue;

    for (const att of studentAttempts) {
      doc.addPage();
      // Cabeçalho com nome e CPF do aluno
      drawHeader(doc, att.exam.title, att.exam.isRecovery ? "Prova de Recuperação" : "Prova Oficial");

      // Box com dados do aluno + resultado
      let yy = 50;
      // Box do aluno (esquerda)
      const boxW = (pageWidth - margin * 2 - 4) / 2;
      doc.setFillColor(...COLORS.cinzaClaro);
      doc.roundedRect(margin, yy, boxW, 24, 2, 2, "F");
      doc.setDrawColor(...COLORS.verdeLimao);
      doc.setLineWidth(0.8);
      doc.line(margin, yy, margin + boxW, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.cinzaTexto);
      doc.text("ALUNO", margin + 3, yy + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.textoEscuro);
      doc.text(att.user.name, margin + 3, yy + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.cinzaTexto);
      doc.text("CPF: " + att.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"), margin + 3, yy + 15);
      doc.text("Tipo: " + (att.exam.isRecovery ? "Recuperação" : "Prova Oficial"), margin + 3, yy + 20);

      // Box do resultado (direita)
      const score = att.score ?? 0;
      const passed = score >= (att.exam.passingScore ?? 60);
      const resultColor = passed ? COLORS.verdeAprov : COLORS.vermelhoReprov;
      const boxX = margin + boxW + 4;
      doc.setFillColor(...COLORS.cinzaClaro);
      doc.roundedRect(boxX, yy, boxW, 24, 2, 2, "F");
      doc.setDrawColor(...resultColor);
      doc.setLineWidth(0.8);
      doc.line(boxX, yy, boxX + boxW, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.cinzaTexto);
      doc.text("RESULTADO", boxX + 3, yy + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...resultColor);
      doc.text(score.toFixed(1) + "%", boxX + 3, yy + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.cinzaTexto);
      doc.text(`Acertos: ${att.correctCount}/${att.totalCount}`, boxX + 3, yy + 18);
      doc.text(passed ? "APROVADO" : "REPROVADO", boxX + 3, yy + 22);
      yy += 30;

      // Detalhes da prova
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.cinzaTexto);
      const submitted = att.submittedAt ? att.submittedAt.toLocaleString("pt-BR") : "—";
      const timeStr = att.timeSpentSeconds ? `${Math.floor(att.timeSpentSeconds / 60)}min ${att.timeSpentSeconds % 60}s` : "—";
      doc.text(`Submetida em: ${submitted}  |  Tempo: ${timeStr}  |  Nota mínima: ${att.exam.passingScore}%`, margin, yy);
      yy += 6;

      // Questões sorteadas para este aluno
      const qIds: string[] = att.questionIds ? JSON.parse(att.questionIds) : [];
      const answersList: Array<{ questionId: string; selected?: string }> = JSON.parse(att.answers || "[]");
      const ansMap: Record<string, string | undefined> = {};
      for (const a of answersList) ansMap[a.questionId] = a.selected;

      let questions: Array<{ id: string; statement: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; explanation: string; subject?: { name: string } | null }> = [];
      if (qIds.length > 0) {
        questions = await db.question.findMany({
          where: { id: { in: qIds } },
          include: { subject: { select: { name: true } } },
        });
        questions = qIds.map(qid => questions.find(q => q.id === qid)).filter(Boolean) as typeof questions;
      }

      // Renderiza cada questão com correção visual
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (yy > 250) { doc.addPage(); drawFooter(doc, `Ocean Green — ${att.exam.title}`); yy = 20; }
        const selected = ansMap[q.id];
        const isCorrect = selected === q.correctAnswer;
        if (isCorrect) correctCount++;

        // Número da questão + badge de acerto/erro
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.azulMarinho);
        doc.text(`Questão ${idx + 1}`, margin, yy);

        // Badge
        const badgeX = margin + 24;
        if (isCorrect) {
          doc.setFillColor(...COLORS.verdeAprov);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(badgeX, yy - 4, 18, 5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text("CERTO", badgeX + 9, yy, { align: "center" });
        } else {
          doc.setFillColor(...COLORS.vermelhoReprov);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(badgeX, yy - 4, 18, 5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text("ERRADO", badgeX + 9, yy, { align: "center" });
        }
        if (q.subject) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.setTextColor(...COLORS.cinzaTexto);
          doc.text(`[${q.subject.name}]`, pageWidth - margin, yy, { align: "right" });
        }
        yy += 5;

        // Enunciado
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.textoEscuro);
        const stmt = doc.splitTextToSize(q.statement, pageWidth - margin * 2);
        doc.text(stmt, margin, yy);
        yy += stmt.length * 4.2 + 1;

        // Alternativas
        for (let i = 0; i < 4; i++) {
          if (yy > 275) { doc.addPage(); drawFooter(doc, `Ocean Green — ${att.exam.title}`); yy = 20; }
          const letter = options[i];
          const text = q[optionFields[i]];
          const isThisCorrect = q.correctAnswer === letter;
          const isSelected = selected === letter;

          if (isThisCorrect) {
            doc.setFillColor(...COLORS.verdeAprov);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "F");
            doc.text(letter, margin + 1.5, yy);
          } else if (isSelected) {
            doc.setFillColor(...COLORS.vermelhoReprov);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "F");
            doc.text(letter, margin + 1.5, yy);
          } else {
            doc.setDrawColor(180, 200, 190);
            doc.setTextColor(...COLORS.textoEscuro);
            doc.setFont("helvetica", "normal");
            doc.roundedRect(margin, yy - 4, 6, 6, 1, 1, "D");
            doc.text(letter, margin + 1.5, yy);
          }
          const optLines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
          doc.text(optLines, margin + 10, yy);
          yy += Math.max(5, optLines.length * 4.2);
        }

        // Resposta do aluno + explicação
        yy += 2;
        if (yy > 275) { doc.addPage(); drawFooter(doc, `Ocean Green — ${att.exam.title}`); yy = 20; }
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.cinzaTexto);
        doc.setFont("helvetica", "normal");
        doc.text(`Sua resposta: ${selected || "—"}  |  Gabarito: ${q.correctAnswer}`, margin, yy);
        yy += 4;
        // Explicação com fundo
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.verdeEscuro);
        const expl = doc.splitTextToSize(q.explanation || "Sem explicação.", pageWidth - margin * 2 - 4);
        doc.setFillColor(...COLORS.cinzaClaro);
        doc.rect(margin, yy - 3.5, pageWidth - margin * 2, expl.length * 4 + 2, "F");
        doc.text(expl, margin + 1.5, yy);
        yy += expl.length * 4 + 6;

        doc.setDrawColor(220, 230, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, yy, pageWidth - margin, yy);
        yy += 5;
      });

      drawFooter(doc, `Ocean Green Treinamentos — ${att.exam.title} — ${att.user.name}`);
    }
  }

  const pdfBytes = doc.output("arraybuffer");
  const filename = `relatorio-completo-${cls.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
