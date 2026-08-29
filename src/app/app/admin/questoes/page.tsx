"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Pencil,
  Upload,
  Filter,
  ListChecks,
  Layers,
  CircleDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface Question {
  id: string;
  difficulty: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  active: boolean;
  createdAt: string;
  subject: { id: string; name: string; category?: string | null };
}

interface Subject {
  id: string;
  name: string;
  category?: string | null;
  _count?: { questions: number };
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [diffFilter, setDiffFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (subjectFilter !== "ALL") params.set("subjectId", subjectFilter);
    if (diffFilter !== "ALL") params.set("difficulty", diffFilter);
    const res = await apiFetch<{ questions: Question[]; total: number }>(
      `/api/admin/questions?${params.toString()}`
    );
    if (res.ok && res.data) setQuestions(res.data.questions || []);
    setLoading(false);
  }

  async function loadSubjects() {
    const res = await apiFetch<{ subjects: Subject[] }>("/api/admin/subjects");
    if (res.ok && res.data) setSubjects(res.data.subjects || []);
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(), 350);
    return () => clearTimeout(t);
  }, [search, subjectFilter, diffFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(q: Question) {
    setEditing(q);
    setDialogOpen(true);
  }

  async function toggleActive(q: Question) {
    const res = await apiFetch(`/api/admin/questions/${q.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(q.active ? "Questão desativada." : "Questão ativada.");
      refresh();
    } else {
      toast.error(res.error || "Erro ao alterar status.");
    }
  }

  const grouped: Record<string, number> = {};
  for (const s of subjects) {
    grouped[s.category || "Outros"] =
      (grouped[s.category || "Outros"] || 0) + (s._count?.questions || 0);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Banco de Questões</h1>
            <p className="text-sm text-muted-foreground">
              Crie, edite e organize questões para simulados e provas.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4 mr-1" />
            Importar CSV
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="size-4 mr-1" />
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Stats por categoria */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-accent" />
            <h3 className="text-sm font-semibold">Questões por categoria</h3>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma disciplina cadastrada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(grouped).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por enunciado ou explicação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="md:w-56">
              <Filter className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as disciplinas</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={setDiffFilter}>
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="EASY">Fácil</SelectItem>
              <SelectItem value="MEDIUM">Média</SelectItem>
              <SelectItem value="HARD">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Carregando questões...
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="size-8 mx-auto mb-2 opacity-50" />
              Nenhuma questão encontrada.
              <p className="text-xs mt-1">
                Crie uma nova questão ou ajuste os filtros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Enunciado</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Dif.</TableHead>
                    <TableHead>Gab.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, idx) => (
                    <motion.tr
                      key={q.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                      className={q.active ? "" : "opacity-60"}
                    >
                      <TableCell>
                        <CircleDot
                          className={`size-3.5 ${
                            q.active ? "text-accent" : "text-muted-foreground"
                          }`}
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm line-clamp-2">
                          {q.statement}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {q.subject?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            q.difficulty === "EASY"
                              ? "border-emerald-500 text-emerald-700"
                              : q.difficulty === "MEDIUM"
                              ? "border-amber-500 text-amber-700"
                              : "border-destructive text-destructive"
                          }
                        >
                          {q.difficulty === "EASY"
                            ? "Fácil"
                            : q.difficulty === "MEDIUM"
                            ? "Média"
                            : "Difícil"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {q.correctAnswer}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => openEdit(q)}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => toggleActive(q)}
                            title={q.active ? "Desativar" : "Ativar"}
                          >
                            <Switch checked={q.active} disabled />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <QuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        subjects={subjects}
        saving={saving}
        onSavingChange={setSaving}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
          loadSubjects();
        }}
      />

      <ImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        subjects={subjects}
        onImported={() => {
          setImportOpen(false);
          refresh();
          loadSubjects();
        }}
      />
    </div>
  );
}

function QuestionDialog({
  open,
  onOpenChange,
  editing,
  subjects,
  saving,
  onSavingChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Question | null;
  subjects: Subject[];
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [statement, setStatement] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setSubjectId(editing?.subject?.id || subjects[0]?.id || "");
      setDifficulty(editing?.difficulty || "MEDIUM");
      setStatement(editing?.statement || "");
      setOptionA(editing?.optionA || "");
      setOptionB(editing?.optionB || "");
      setOptionC(editing?.optionC || "");
      setOptionD(editing?.optionD || "");
      setCorrectAnswer(editing?.correctAnswer || "A");
      setExplanation(editing?.explanation || "");
      setActive(editing?.active ?? true);
    }
  }, [open, editing, subjects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !statement.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    onSavingChange(true);
    const body = {
      subjectId,
      difficulty,
      statement: statement.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctAnswer,
      explanation: explanation.trim(),
      active,
    };
    const res = editing
      ? await apiFetch(`/api/admin/questions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/api/admin/questions", {
          method: "POST",
          body: JSON.stringify(body),
        });
    onSavingChange(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao salvar questão.");
      return;
    }
    toast.success(editing ? "Questão atualizada." : "Questão criada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Questão" : "Nova Questão"}
            </DialogTitle>
            <DialogDescription>
              Preencha o enunciado, alternativas e gabarito comentado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Disciplina *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.category ? `[${s.category}] ` : ""}
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Dificuldade *</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Fácil</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HARD">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="statement">Enunciado *</Label>
              <Textarea
                id="statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Digite o enunciado da questão..."
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="optA">
                  <span className="inline-flex items-center justify-center size-5 rounded bg-muted text-xs font-mono mr-1.5">
                    A
                  </span>
                  Alternativa A *
                </Label>
                <Input
                  id="optA"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="optB">
                  <span className="inline-flex items-center justify-center size-5 rounded bg-muted text-xs font-mono mr-1.5">
                    B
                  </span>
                  Alternativa B *
                </Label>
                <Input
                  id="optB"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="optC">
                  <span className="inline-flex items-center justify-center size-5 rounded bg-muted text-xs font-mono mr-1.5">
                    C
                  </span>
                  Alternativa C *
                </Label>
                <Input
                  id="optC"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="optD">
                  <span className="inline-flex items-center justify-center size-5 rounded bg-muted text-xs font-mono mr-1.5">
                    D
                  </span>
                  Alternativa D *
                </Label>
                <Input
                  id="optD"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Resposta correta *</Label>
              <div className="grid grid-cols-4 gap-2">
                {["A", "B", "C", "D"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setCorrectAnswer(l)}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold transition-colors ${
                      correctAnswer === l
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="explanation">Gabarito comentado</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explique por que a resposta correta é a correta..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-q"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active-q">Questão ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editing ? "Salvar alterações" : "Criar questão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportSheet({
  open,
  onOpenChange,
  subjects,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subjects: Subject[];
  onImported: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!csv.trim()) {
      toast.error("Cole o conteúdo CSV.");
      return;
    }
    setImporting(true);
    const res = await apiFetch<{ imported: number }>("/api/admin/questions/import", {
      method: "POST",
      body: JSON.stringify({ csv }),
    });
    setImporting(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao importar.");
      return;
    }
    toast.success(`Importadas ${res.data?.imported || 0} questões.`);
    setCsv("");
    onImported();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="size-4 text-accent" />
            Importar Questões (CSV)
          </SheetTitle>
          <SheetDescription>
            Cole o conteúdo CSV no campo abaixo. Formato:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              subject,difficulty,statement,optionA,optionB,optionC,optionD,correctAnswer,explanation
            </code>
            . Use aspas duplas em campos que contenham vírgulas.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="text-xs text-muted-foreground">
            Disciplinas disponíveis (use o nome exato em <strong>subject</strong>):
          </div>
          <div className="max-h-32 overflow-y-auto border rounded p-2 text-xs">
            {subjects.map((s) => (
              <div key={s.id}>
                <span className="font-mono">{s.name}</span>
                {s.category && (
                  <span className="text-muted-foreground"> — {s.category}</span>
                )}
              </div>
            ))}
          </div>
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            placeholder={`subject,difficulty,statement,optionA,optionB,optionC,optionD,correctAnswer,explanation\nManutenção Preventiva,EASY,"O que é manutenção preventiva?","Conjunto de ações periódicas","Reparo após falha","Inspeção visual apenas","Manutenção corretiva planejada",A,"Manutenção preventiva consiste em ações periódicas para evitar falhas."`}
            className="font-mono text-xs"
          />
          <Button
            onClick={handleImport}
            disabled={importing}
            className="w-full"
          >
            {importing ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <Upload className="size-4 mr-1" />
            )}
            Importar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
