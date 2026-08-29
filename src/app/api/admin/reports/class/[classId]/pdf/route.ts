import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Cores da escola Ocean Green (extraídas da logo)
const COLORS = {
  verdeLimao: [140, 195, 74] as [number, number, number],   // #8BC34A
  verdeMedio: [124, 179, 66] as [number, number, number],   // #7CB342
  azulMarinho: [13, 71, 161] as [number, number, number],    // #0D47A1
  azulCiano: [0, 172, 193] as [number, number, number],      // #00ACC1
  verdeEscuro: [10, 92, 54] as [number, number, number],    // #0A5C36
  verdeAprov: [16, 122, 87] as [number, number, number],    // aprovado
  vermelhoReprov: [185, 28, 28] as [number, number, number], // reprovado
  cinzaClaro: [244, 247, 246] as [number, number, number],
  cinzaTexto: [80, 100, 90] as [number, number, number],
  textoEscuro: [20, 30, 25] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
};

// Relatório 1: Boletim da Turma — design elegante com cores da escola
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const { classId } = await params;
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  const exams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL", isRecovery: false },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true },
  });

  const allExams = await db.exam.findMany({
    where: { classId, type: "OFFICIAL" },
    orderBy: { startDateTime: "asc" },
    select: { id: true, title: true, passingScore: true, isRecovery: true, parentExamId: true },
  });

  const members = await db.classMember.findMany({
    where: { classId },
    include: { user: { select: { id: true, name: true, cpf: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const userIds = members.map((m) => m.userId);

  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: allExams.map((e) => e.id) }, userId: { in: userIds } },
    include: { exam: { select: { passingScore: true, isRecovery: true, parentExamId: true } } },
  });

  interface StudentRow {
    name: string;
    cpf: string;
    examScores: Record<string, number | null>;
    finalScore: number | null;
    situation: string;
  }

  const rows: StudentRow[] = members.map((m) => {
    const studentAttempts = attempts.filter((a) => a.userId === m.userId);
    const examScores: Record<string, number | null> = {};
    for (const ex of exams) {
      const att = studentAttempts.find((a) => a.examId === ex.id);
      examScores[ex.id] = att?.score ?? null;
    }
    let finalScore: number | null = null;
    for (const ex of exams) {
      const originalScore = examScores[ex.id];
      const recoveryAttempts = studentAttempts.filter(
        (a) => a.exam.isRecovery && a.exam.parentExamId === ex.id
      );
      const recoveryScore = recoveryAttempts.length
        ? Math.max(...recoveryAttempts.map((a) => a.score ?? 0))
        : null;
      const best = [originalScore, recoveryScore].filter((s) => s !== null).map((s) => s as number);
      const examFinal = best.length ? Math.max(...best) : null;
      if (examFinal !== null) {
        finalScore = examFinal;
      }
    }
    let situation = "Pendente";
    if (finalScore !== null) {
      const passingScore = exams[0]?.passingScore ?? 60;
      situation = finalScore >= passingScore ? "Aprovado" : "Reprovado";
    }
    return { name: m.user.name, cpf: m.user.cpf, examScores, finalScore, situation };
  });

  const scored = rows.filter((r) => r.finalScore !== null).map((r) => r.finalScore as number);
  const stats = {
    total: members.length,
    realizaram: scored.length,
    media: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0,
    maior: scored.length ? Math.max(...scored) : 0,
    menor: scored.length ? Math.min(...scored) : 0,
    aprovados: rows.filter((r) => r.situation === "Aprovado").length,
    reprovados: rows.filter((r) => r.situation === "Reprovado").length,
    pendentes: rows.filter((r) => r.situation === "Pendente").length,
  };

  // ===== GERA PDF =====
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ====== CABEÇALHO COM GRADIENTE E ONDAS (inspirado na logo) ======
  // Faixa superior com gradiente verde → azul
  for (let i = 0; i < 50; i++) {
    const t = i / 50;
    const r = Math.round(COLORS.verdeLimao[0] + (COLORS.azulMarinho[0] - COLORS.verdeLimao[0]) * t);
    const g = Math.round(COLORS.verdeLimao[1] + (COLORS.azulMarinho[1] - COLORS.verdeLimao[1]) * t);
    const b = Math.round(COLORS.verdeLimao[2] + (COLORS.azulMarinho[2] - COLORS.verdeLimao[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, pageWidth, 1, "F");
  }

  // Ondas decorativas no cabeçalho (como na logo)
  doc.setFillColor(COLORS.azulCiano[0], COLORS.azulCiano[1], COLORS.azulCiano[2]);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(margin, 38, pageWidth - margin, 38);
  doc.setLineWidth(0.5);
  doc.setDrawColor(COLORS.azulCiano[0], COLORS.azulCiano[1], COLORS.azulCiano[2]);
  doc.line(margin, 40.5, pageWidth - margin, 40.5);

  // Logo + Nome da escola
  doc.setTextColor(...COLORS.branco);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Ocean Green", margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TREINAMENTOS", margin, 22);

  // Subtítulo à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Boletim da Turma", pageWidth - margin, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Relatório de Notas e Situação", pageWidth - margin, 21, { align: "right" });
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 25, { align: "right" });

  // ====== INFO DA TURMA ======
  let y = 50;
  doc.setTextColor(...COLORS.textoEscuro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(cls.name, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.cinzaTexto);
  if (cls.description) {
    doc.text(cls.description, margin, y);
    y += 4;
  }
  doc.text(`Alunos matriculados: ${stats.total}  |  Provas aplicadas: ${exams.length}`, margin, y);
  y += 8;

  // ====== CARDS DE ESTATÍSTICAS (design elegante) ======
  const boxW = (pageWidth - margin * 2 - 5 * 4) / 6;
  const boxColors = [
    COLORS.verdeLimao,
    COLORS.azulCiano,
    COLORS.azulMarinho,
    COLORS.verdeAprov,
    COLORS.vermelhoReprov,
    COLORS.cinzaTexto,
  ];
  const boxes = [
    { label: "MÉDIA DA TURMA", value: stats.media.toFixed(1) + "%" },
    { label: "MAIOR NOTA", value: stats.maior.toFixed(1) + "%" },
    { label: "MENOR NOTA", value: stats.menor.toFixed(1) + "%" },
    { label: "APROVADOS", value: String(stats.aprovados) },
    { label: "REPROVADOS", value: String(stats.reprovados) },
    { label: "PENDENTES", value: String(stats.pendentes) },
  ];
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 4);
    const color = boxColors[i];
    // Card com borda colorida no topo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, 20, 2, 2, "F");
    doc.setDrawColor(220, 230, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxW, 20, 2, 2, "D");
    // Faixa colorida no topo
    doc.setFillColor(...color);
    doc.roundedRect(x, y, boxW, 2.5, 1, 1, "F");
    // Texto
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.cinzaTexto);
    doc.text(b.label, x + boxW / 2, y + 7, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.text(b.value, x + boxW / 2, y + 15, { align: "center" });
  });
  y += 28;

  // ====== TABELA DE NOTAS ======
  const head = [["#", "ALUNO", "CPF", ...exams.map((e) => e.title.substring(0, 16)), "NOTA FINAL", "SITUAÇÃO"]];
  const body = rows.map((r, idx) => {
    const examCols = exams.map((e) => {
      const s = r.examScores[e.id];
      return s === null ? "—" : s.toFixed(1) + "%";
    });
    const finalCol = r.finalScore === null ? "—" : r.finalScore.toFixed(1) + "%";
    return [String(idx + 1), r.name, r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"), ...examCols, finalCol, r.situation];
  });

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 230, 225], lineWidth: 0.1 },
    headStyles: {
      fillColor: COLORS.azulMarinho,
      textColor: COLORS.branco,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 26, font: "courier", fontSize: 7 },
    },
    didParseCell: (data) => {
      // Coluna Situação
      if (data.section === "body" && data.column.index === head[0].length - 1) {
        const txt = String(data.cell.raw);
        if (txt === "Aprovado") {
          data.cell.styles.textColor = COLORS.verdeAprov;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [232, 245, 233];
        } else if (txt === "Reprovado") {
          data.cell.styles.textColor = COLORS.vermelhoReprov;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [254, 226, 226];
        } else {
          data.cell.styles.textColor = COLORS.cinzaTexto;
          data.cell.styles.fillColor = [241, 243, 244];
        }
      }
      // Coluna Nota Final
      if (data.section === "body" && data.column.index === head[0].length - 2) {
        const txt = String(data.cell.raw);
        if (txt !== "—") {
          const val = parseFloat(txt);
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9;
          if (val >= 60) data.cell.styles.textColor = COLORS.verdeAprov;
          else data.cell.styles.textColor = COLORS.vermelhoReprov;
        }
      }
    },
  });

  // ====== RODAPÉ ======
  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
  if (finalY < pageHeight - 40) {
    doc.setDrawColor(...COLORS.verdeLimao);
    doc.setLineWidth(0.8);
    doc.line(margin, finalY + 8, margin + 30, finalY + 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.cinzaTexto);
    doc.text("Critério de aprovação: nota ≥ 60% (média 6.0)", margin, finalY + 14);
    doc.text(`Total de alunos: ${stats.total}  |  Aprovados: ${stats.aprovados}  |  Reprovados: ${stats.reprovados}  |  Pendentes: ${stats.pendentes}`, margin, finalY + 18.5);
  }

  // Rodapé numerado
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Linha do rodapé
    doc.setDrawColor(...COLORS.verdeLimao);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.cinzaTexto);
    doc.setFont("helvetica", "normal");
    doc.text("Ocean Green Treinamentos — Boletim da Turma", margin, pageHeight - 7);
    doc.text(`Página ${i}/${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  const pdfBytes = doc.output("arraybuffer");
  const filename = `boletim-${cls.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
