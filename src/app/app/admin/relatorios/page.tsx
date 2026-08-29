"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, formatDateTime, formatDuration, formatPct } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ClassItem {
  id: string;
  name: string;
}

interface ExamItem {
  id: string;
  title: string;
}

interface ReportRow {
  userId: string;
  userName: string;
  cpf: string;
  examId: string;
  examTitle: string;
  examType: string;
  score: number | null;
  correctCount: number | null;
  totalCount: number | null;
  timeSpentSeconds: number | null;
  submittedAt: string | null;
  passed: boolean | null;
}

interface Stats {
  totalAlunos: number;
  totalProvas: number;
  totalRealizadas: number;
  media: number | null;
  maior: number | null;
  menor: number | null;
  aprovados: number;
  reprovados: number;
}

interface ReportData {
  class: { id: string; name: string };
  exams: ExamItem[];
  members: { id: string; name: string; cpf: string }[];
  rows: ReportRow[];
  stats: Stats;
  simulationsCount: number;
}

export default function AdminReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ classes: ClassItem[] }>("/api/admin/classes").then((r) => {
      if (r.ok && r.data) {
        setClasses(r.data.classes || []);
        if (r.data.classes && r.data.classes.length > 0) {
          setClassId(r.data.classes[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    setReport(null);
    apiFetch<ReportData>(`/api/admin/reports/class/${classId}`).then((r) => {
      if (r.ok && r.data) setReport(r.data);
      else if (r.error) toast.error(r.error);
      setLoading(false);
    });
  }, [classId]);

  function exportCSV() {
    if (!report) return;
    const headers = [
      "Aluno",
      "CPF",
      "Prova",
      "Tipo",
      "Nota (%)",
      "Acertos",
      "Total",
      "Aprovação",
      "Tempo (s)",
      "Submetido em",
    ];
    const lines = [headers.join(",")];
    for (const r of report.rows) {
      const cells = [
        `"${r.userName}"`,
        r.cpf,
        `"${r.examTitle}"`,
        r.examType,
        r.score !== null ? r.score.toFixed(1) : "",
        r.correctCount ?? "",
        r.totalCount ?? "",
        r.passed === null ? "—" : r.passed ? "Aprovado" : "Reprovado",
        r.timeSpentSeconds ?? "",
        r.submittedAt ? formatDateTime(r.submittedAt) : "—",
      ];
      lines.push(cells.join(","));
    }
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${report.class.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  }

  function previewBoletim() {
    if (!classId) return;
    window.open(`/api/admin/reports/class/${classId}/pdf`, "_blank");
  }

  function downloadBoletim() {
    if (!classId) return;
    // Cria link de download forçado
    const a = document.createElement("a");
    a.href = `/api/admin/reports/class/${classId}/pdf?download=1`;
    a.download = `boletim-${report?.class.name || "turma"}.pdf`;
    a.click();
  }

  function previewComplete() {
    if (!classId) return;
    window.open(`/api/admin/reports/complete?classId=${classId}`, "_blank");
  }

  function downloadComplete() {
    if (!classId) return;
    const a = document.createElement("a");
    a.href = `/api/admin/reports/complete?classId=${classId}&download=1`;
    a.download = `relatorio-completo-${report?.class.name || "turma"}.pdf`;
    a.click();
  }

  function previewExamPDF(examId: string, withAnswers: boolean) {
    window.open(`/api/admin/reports/exam/${examId}?withAnswers=${withAnswers}`, "_blank");
  }

  function downloadExamPDF(examId: string, withAnswers: boolean) {
    const a = document.createElement("a");
    a.href = `/api/admin/reports/exam/${examId}?withAnswers=${withAnswers}&download=1`;
    a.download = `prova-${examId}.pdf`;
    a.click();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
          <BarChart3 className="size-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Notas consolidadas por turma, estatísticas e exportações.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-end">
          <div className="grid gap-2 flex-1">
            <label className="text-sm font-medium">Selecionar turma</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportCSV} disabled={!report || report.rows.length === 0} variant="outline">
            <Download className="size-4 mr-1" />
            CSV
          </Button>
        </CardContent>
      </Card>

      {/* Cards de Relatórios PDF com botão "olho" (preview) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Boletim da Turma */}
        <Card className="overflow-hidden border-accent/30">
          <div className="h-1.5 bg-gradient-to-r from-[#8BC34A] to-[#7CB342]" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-accent" />
              Boletim da Turma
            </CardTitle>
            <CardDescription>
              Relatório com notas e situação (Aprovado/Reprovado) de todos os alunos + estatísticas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={previewBoletim}
                disabled={!classId}
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/10"
              >
                <Eye className="size-4 mr-1.5" />
                Visualizar
              </Button>
              <Button
                onClick={downloadBoletim}
                disabled={!classId}
                className="bg-accent hover:bg-accent/90"
              >
                <Download className="size-4 mr-1.5" />
                Baixar PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Visualize antes de imprimir. Use Ctrl+P no visualizador para imprimir.
            </p>
          </CardContent>
        </Card>

        {/* Relatório Completo */}
        <Card className="overflow-hidden border-primary/30">
          <div className="h-1.5 bg-gradient-to-r from-[#0D47A1] to-[#00ACC1]" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-primary" />
              Relatório Completo
            </CardTitle>
            <CardDescription>
              Resumo na primeira página + todas as provas de cada aluno com acertos e erros questão por questão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={previewComplete}
                disabled={!classId}
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Eye className="size-4 mr-1.5" />
                Visualizar
              </Button>
              <Button
                onClick={downloadComplete}
                disabled={!classId}
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="size-4 mr-1.5" />
                Baixar PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Documento completo para comprovação. Visualize antes de imprimir.
            </p>
          </CardContent>
        </Card>
      </div>

      {!classId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="size-8 mx-auto mb-2 opacity-50" />
            Selecione uma turma para ver o relatório.
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Gerando relatório...
          </CardContent>
        </Card>
      ) : report ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              label="Alunos"
              value={report.stats.totalAlunos}
              icon={<Users className="size-4 text-secondary" />}
            />
            <StatCard
              label="Provas"
              value={report.stats.totalProvas}
              icon={<FileText className="size-4 text-accent" />}
            />
            <StatCard
              label="Realizadas"
              value={report.stats.totalRealizadas}
              icon={<CheckCircle2 className="size-4 text-accent" />}
            />
            <StatCard
              label="Média"
              value={report.stats.media !== null ? formatPct(report.stats.media) : "—"}
              icon={<TrendingUp className="size-4 text-primary" />}
            />
            <StatCard
              label="Aprovados"
              value={report.stats.aprovados}
              icon={<Award className="size-4 text-accent" />}
            />
            <StatCard
              label="Reprovados"
              value={report.stats.reprovados}
              icon={<XCircle className="size-4 text-destructive" />}
            />
          </div>

          {/* PDF de prova */}
          {report.exams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-secondary" />
                  Gerar PDF de Prova
                </CardTitle>
                <CardDescription>
                  Exporte cada prova como PDF — versão para o aluno (sem gabarito)
                  ou versão com gabarito comentado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.exams.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-sm">{e.title}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-secondary/40 text-secondary hover:bg-secondary/10"
                        onClick={() => previewExamPDF(e.id, false)}
                        title="Visualizar sem gabarito"
                      >
                        <Eye className="size-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadExamPDF(e.id, false)}
                        title="Baixar sem gabarito"
                      >
                        <Download className="size-3 mr-1" />
                        Sem gabarito
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadExamPDF(e.id, true)}
                        title="Baixar com gabarito"
                      >
                        <Download className="size-3 mr-1" />
                        Com gabarito
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tabela de notas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  Notas Consolidadas — {report.class.name}
                </CardTitle>
                <CardDescription>
                  {report.rows.length} registro(s) de {report.members.length} aluno(s) e {report.exams.length} prova(s).
                </CardDescription>
              </div>
              {report.stats.media !== null && (
                <Badge variant="outline" className="text-base">
                  Média geral: {formatPct(report.stats.media)}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {report.rows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertTriangle className="size-8 mx-auto mb-2 opacity-50" />
                  Nenhuma prova realizada nesta turma ainda.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Prova</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                        <TableHead className="text-right">Acertos</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Tempo</TableHead>
                        <TableHead>Submetido em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.map((r, idx) => (
                        <motion.tr
                          key={`${r.userId}-${r.examId}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                        >
                          <TableCell>
                            <div className="font-medium">{r.userName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {r.cpf.replace(
                                /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                                "$1.$2.$3-$4"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{r.examTitle}</TableCell>
                          <TableCell className="text-right font-mono">
                            {r.score !== null ? formatPct(r.score) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {r.correctCount !== null
                              ? `${r.correctCount}/${r.totalCount}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.score !== null ? (
                              <Badge
                                className={
                                  r.score >= 60
                                    ? "bg-accent/15 text-accent border-accent/30"
                                    : "bg-destructive/10 text-destructive border-destructive/30"
                                }
                              >
                                {r.score >= 60 ? "Aprovado" : "Reprovado"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.passed === null
                              ? "—"
                              : r.passed
                              ? "Aprovado"
                              : "Reprovado"}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {r.timeSpentSeconds !== null
                              ? formatDuration(r.timeSpentSeconds)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.submittedAt ? formatDateTime(r.submittedAt) : "—"}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
