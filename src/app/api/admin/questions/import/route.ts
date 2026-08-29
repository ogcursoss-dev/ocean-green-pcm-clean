import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

interface ParsedRow {
  subject: string;
  difficulty: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

// CSV parser simples que suporta aspas duplas e vírgulas internas
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  // Normalize line endings
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  while (i < t.length) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"' && t[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        cur.push(field);
        field = "";
        i++;
      } else if (ch === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const csv = String(body?.csv || "");
    if (!csv.trim()) {
      return NextResponse.json({ error: "CSV vazio." }, { status: 400 });
    }
    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV precisa ter cabeçalho e ao menos uma linha de dados." },
        { status: 400 }
      );
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const required = [
      "subject",
      "difficulty",
      "statement",
      "optiona",
      "optionb",
      "optionc",
      "optiond",
      "correctanswer",
      "explanation",
    ];
    for (const r of required) {
      if (!headers.includes(r)) {
        return NextResponse.json(
          { error: `Cabeçalho obrigatório ausente: ${r}` },
          { status: 400 }
        );
      }
    }
    // Cache de disciplinas por nome
    const allSubjects = await db.subject.findMany();
    const subjMap = new Map(
      allSubjects.map((s) => [s.name.toLowerCase().trim(), s])
    );

    let imported = 0;
    const errors: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < headers.length) {
        errors.push(`Linha ${i + 1}: colunas insuficientes.`);
        continue;
      }
      const get = (h: string) => r[headers.indexOf(h)]?.trim() || "";
      const subjName = get("subject");
      const subj = subjMap.get(subjName.toLowerCase());
      if (!subj) {
        errors.push(`Linha ${i + 1}: disciplina "${subjName}" não encontrada.`);
        continue;
      }
      const diff = String(get("difficulty")).toUpperCase();
      if (!["EASY", "MEDIUM", "HARD"].includes(diff)) {
        errors.push(`Linha ${i + 1}: dificuldade inválida "${diff}".`);
        continue;
      }
      const correct = String(get("correctanswer")).toUpperCase().trim();
      if (!["A", "B", "C", "D"].includes(correct)) {
        errors.push(`Linha ${i + 1}: resposta correta inválida "${correct}".`);
        continue;
      }
      try {
        await db.question.create({
          data: {
            subjectId: subj.id,
            difficulty: diff,
            statement: get("statement"),
            optionA: get("optiona"),
            optionB: get("optionb"),
            optionC: get("optionc"),
            optionD: get("optiond"),
            correctAnswer: correct,
            explanation: get("explanation"),
            active: true,
          },
        });
        imported++;
      } catch (e: any) {
        errors.push(`Linha ${i + 1}: ${e?.message || "erro ao criar"}`);
      }
    }
    return NextResponse.json({ ok: true, imported, errors });
  } catch (err: any) {
    console.error("[questions/import]", err);
    return NextResponse.json(
      { error: err?.message || "Erro ao importar." },
      { status: 500 }
    );
  }
}
