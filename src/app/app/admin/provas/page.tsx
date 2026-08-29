"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Pencil,
  ChevronRight,
  Calendar,
  Clock,
  ListChecks,
  Users,
  UserPlus,
  CalendarPlus,
  Search,
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
import { Switch } from "@/components/ui/switch";
import { apiFetch, formatDateTime } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { maskCpf } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ExamList {
  id: string;
  title: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  passingScore: number;
  active: boolean;
  class?: { id: string; name: string };
  _count?: { questions: number; assignments: number; attempts: number };
}

interface ClassItem {
  id: string;
  name: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamList[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamList | null>(null);
  const [saving, setSaving] = useState(false);
  const [individualExam, setIndividualExam] = useState<ExamList | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await apiFetch<{ exams: ExamList[] }>("/api/admin/exams");
    if (res.ok && res.data) setExams(res.data.exams || []);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
    apiFetch<{ classes: ClassItem[] }>("/api/admin/classes").then((r) => {
      if (r.ok && r.data) setClasses(r.data.classes || []);
    });
  }, []);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(e: ExamList) {
    setEditing(e);
    setDialogOpen(true);
  }
  function openIndividual(e: ExamList) {
    setIndividualExam(e);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Provas</h1>
            <p className="text-sm text-muted-foreground">
              Crie, agende e atribua provas oficiais a turmas e alunos.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="size-4 mr-1" />
          Nova Prova
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Carregando provas...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="size-8 mx-auto mb-2 opacity-50" />
              Nenhuma prova cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prova</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Atribuições</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((e, idx) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                      className={e.active ? "" : "opacity-60"}
                    >
                      <TableCell>
                        <Link
                          href={`/app/admin/provas/${e.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {e.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {e.durationMinutes} min · Nota mín. {e.passingScore}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.class?.name || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            e.type === "OFFICIAL"
                              ? "bg-secondary/15 text-secondary border-secondary/30"
                              : "bg-accent/15 text-accent border-accent/30"
                          }
                        >
                          {e.type === "OFFICIAL" ? "Oficial" : "Simulado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(e.startDateTime)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(e.endDateTime)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <ListChecks className="size-3 text-muted-foreground" />
                          {e._count?.questions || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="size-3 text-muted-foreground" />
                          {e._count?.assignments || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {e._count?.attempts || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-accent/40 text-accent hover:bg-accent/10"
                            onClick={() => openIndividual(e)}
                            title="Agendar prova para um aluno específico em data/hora diferente"
                          >
                            <CalendarPlus className="size-3 mr-1" />
                            Agendar Aluno
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary"
                          >
                            <Link href={`/app/admin/provas/${e.id}`}>
                              Detalhes
                              <ChevronRight className="size-3 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => openEdit(e)}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
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

      <ExamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        classes={classes}
        saving={saving}
        onSavingChange={setSaving}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />

      <IndividualScheduleDialog
        exam={individualExam}
        onOpenChange={(v) => !v && setIndividualExam(null)}
        onSaved={() => {
          setIndividualExam(null);
          refresh();
        }}
      />
    </div>
  );
}

function ExamDialog({
  open,
  onOpenChange,
  editing,
  classes,
  saving,
  onSavingChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ExamList | null;
  classes: ClassItem[];
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState("OFFICIAL");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [passingScore, setPassingScore] = useState("60");
  const [questionCount, setQuestionCount] = useState("20");
  const [showResults, setShowResults] = useState("AFTER_END");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || "");
      setDescription(editing?.description || "");
      setClassId(editing?.class?.id || classes[0]?.id || "");
      setType(editing?.type || "OFFICIAL");
      setStartDateTime(
        editing
          ? toLocalInput(new Date(editing.startDateTime))
          : toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
      );
      setEndDateTime(
        editing
          ? toLocalInput(new Date(editing.endDateTime))
          : toLocalInput(new Date(Date.now() + 25 * 60 * 60 * 1000))
      );
      setDurationMinutes(String(editing?.durationMinutes || 60));
      setPassingScore(String(editing?.passingScore || 60));
      setQuestionCount(String(editing?.questionCount || 20));
      setShowResults("AFTER_END");
      setShuffleQuestions(false);
      setActive(editing?.active ?? true);
    }
  }, [open, editing, classes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId || !startDateTime || !endDateTime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    onSavingChange(true);
    const body = {
      title: title.trim(),
      description: description.trim(),
      classId,
      type,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      durationMinutes: Number(durationMinutes),
      passingScore: Number(passingScore),
      questionCount: Number(questionCount) || 20,
      showResults,
      shuffleQuestions,
      active,
    };
    const res = editing
      ? await apiFetch(`/api/admin/exams/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/api/admin/exams", {
          method: "POST",
          body: JSON.stringify(body),
        });
    onSavingChange(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao salvar prova.");
      return;
    }
    toast.success(editing ? "Prova atualizada." : "Prova criada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Prova" : "Nova Prova"}
            </DialogTitle>
            <DialogDescription>
              Configure título, turma, janela temporal e duração.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado Geral de PCM"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Turma *</Label>
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
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICIAL">Oficial</SelectItem>
                    <SelectItem value="SIMULATION">Simulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="start">Início *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Encerramento *</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passing">Nota mínima (%) *</Label>
                <Input
                  id="passing"
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Padrão: 60% (média 6.0)</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qcount">Nº de questões (sorteadas por aluno) *</Label>
                <Input
                  id="qcount"
                  type="number"
                  min="5"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Cada aluno recebe questões aleatórias do banco (anti-cola)</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Quando mostrar resultado ao aluno</Label>
              <Select value={showResults} onValueChange={setShowResults}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Imediato</SelectItem>
                  <SelectItem value="AFTER_END">Após encerramento</SelectItem>
                  <SelectItem value="MANUAL">Manual (divulgação posterior)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="shuffle"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
              <Label htmlFor="shuffle">Embaralhar questões</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-exam"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active-exam">Prova ativa</Label>
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
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Diálogo de Agendamento Individual
// Permite ao admin agendar a prova para um aluno específico
// em data/hora diferente dos demais (prova antecipada ou personalizada)
// ============================================================
interface StudentItem {
  id: string;
  name: string;
  cpf: string;
  email?: string | null;
  classes: { id: string; name: string }[];
}

function IndividualScheduleDialog({
  exam,
  onOpenChange,
  onSaved,
}: {
  exam: ExamList | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!exam;
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState<
    Array<{ id: string; userId: string | null; user?: { name: string; cpf: string } | null; customStart: string | null; customEnd: string | null }>
  >([]);

  // Carrega alunos ativos
  useEffect(() => {
    if (!open) return;
    setStudentsLoading(true);
    const t = setTimeout(async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await apiFetch<{ users: StudentItem[] }>(
        `/api/admin/students?${params.toString()}`
      );
      if (res.ok && res.data) setStudents(res.data.users || []);
      setStudentsLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [open, search]);

  // Carrega atribuições existentes para mostrar quem já está agendado
  useEffect(() => {
    if (!open || !exam) return;
    apiFetch<{ assignments: typeof existingAssignments }>(
      `/api/admin/exams/${exam.id}/assignments`
    ).then((r) => {
      if (r.ok && r.data) setExistingAssignments(r.data.assignments || []);
    });
  }, [open, exam]);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setSelectedUserId("");
      setCustomStart("");
      setCustomEnd("");
      setCustomDuration("");
      setUseCustomDuration(false);
      setNotes("");
      setSearch("");
    }
  }, [open]);

  async function handleSave() {
    if (!exam) return;
    if (!selectedUserId) {
      toast.error("Selecione um aluno.");
      return;
    }
    if (!customStart || !customEnd) {
      toast.error("Defina a data e hora de início e fim do agendamento.");
      return;
    }
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (end <= start) {
      toast.error("A data/hora de fim deve ser posterior à de início.");
      return;
    }
    setSaving(true);
    const body: any = {
      userId: selectedUserId,
      customStart: start.toISOString(),
      customEnd: end.toISOString(),
    };
    if (useCustomDuration && customDuration) {
      body.customDuration = Number(customDuration);
    }
    if (notes.trim()) body.notes = notes.trim();
    const res = await apiFetch(`/api/admin/exams/${exam.id}/individual-schedule`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao criar agendamento.");
      return;
    }
    toast.success(res.data?.message || "Agendamento individual criado!");
    onSaved();
  }

  const selectedStudent = students.find((s) => s.id === selectedUserId);
  const individualAssignments = existingAssignments.filter((a) => a.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-accent" />
            Agendar Prova para Aluno Específico
          </DialogTitle>
          <DialogDescription>
            {exam && (
              <>
                Configure a prova <strong>{exam.title}</strong> para um aluno
                que fará em data/hora diferente dos demais. O aluno só poderá
                acessar a prova dentro da janela definida abaixo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Janela padrão da prova (referência) */}
          {exam && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
              <p className="font-medium text-muted-foreground mb-1">
                Janela padrão da prova (para a turma):
              </p>
              <p>
                <Clock className="size-3 inline mr-1" />
                {formatDateTime(exam.startDateTime)} até{" "}
                {formatDateTime(exam.endDateTime)} · {exam.durationMinutes} min
              </p>
            </div>
          )}

          {/* Alunos já agendados individualmente */}
          {individualAssignments.length > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-xs font-medium text-accent mb-2 flex items-center gap-1">
                <Users className="size-3.5" />
                {individualAssignments.length} aluno(s) já com agendamento individual:
              </p>
              <div className="space-y-1">
                {individualAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {a.user?.name || "Aluno"}
                      <span className="text-muted-foreground ml-1 font-mono">
                        ({a.user ? maskCpf(a.user.cpf) : "—"})
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {a.customStart ? formatDateTime(a.customStart) : "—"} →{" "}
                      {a.customEnd ? formatDateTime(a.customEnd) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Busca de aluno */}
          <div className="grid gap-2">
            <Label>Buscar aluno *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Digite o nome ou CPF do aluno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {studentsLoading ? (
              <div className="text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin inline mr-1" />
                Carregando alunos...
              </div>
            ) : students.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Nenhum aluno ativo encontrado. Cadastre alunos na aba "Usuários".
              </div>
            ) : (
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors",
                      selectedUserId === s.id && "bg-accent/10 border-l-4 border-l-accent"
                    )}
                  >
                    <input
                      type="radio"
                      name="student"
                      checked={selectedUserId === s.id}
                      onChange={() => setSelectedUserId(s.id)}
                      className="size-4 accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {maskCpf(s.cpf)}
                        {s.classes.length > 0 && (
                          <span className="ml-2">
                            · {s.classes.map((c) => c.name).join(", ")}
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedStudent && (
              <div className="rounded-lg bg-accent/10 border border-accent/30 p-2 text-sm">
                <strong>Selecionado:</strong> {selectedStudent.name} —{" "}
                {maskCpf(selectedStudent.cpf)}
              </div>
            )}
          </div>

          {/* Janela temporal personalizada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="grid gap-2">
              <Label htmlFor="ind-start">Data e hora de início *</Label>
              <Input
                id="ind-start"
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ind-end">Data e hora de fim *</Label>
              <Input
                id="ind-end"
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2">
              O aluno só poderá iniciar a prova dentro desta janela temporal.
              Fora dela, a prova aparecerá como "Agendada" ou "Encerrada".
            </p>
          </div>

          {/* Duração customizada (opcional) */}
          <div className="flex items-center gap-2">
            <Switch
              id="use-custom-dur"
              checked={useCustomDuration}
              onCheckedChange={setUseCustomDuration}
            />
            <Label htmlFor="use-custom-dur">
              Definir duração diferente da prova ({exam?.durationMinutes || 60} min)
            </Label>
          </div>
          {useCustomDuration && (
            <div className="grid gap-2">
              <Label htmlFor="ind-dur">Duração (minutos)</Label>
              <Input
                id="ind-dur"
                type="number"
                min="5"
                max="300"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder={`Padrão: ${exam?.durationMinutes || 60}`}
              />
            </div>
          )}

          {/* Observações */}
          <div className="grid gap-2">
            <Label htmlFor="ind-notes">Observações (opcional)</Label>
            <Textarea
              id="ind-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prova antecipada por motivo de viagem"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedUserId || !customStart || !customEnd}
            className="bg-accent hover:bg-accent/90"
          >
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <CalendarPlus className="size-4 mr-1" />}
            Agendar Prova Individual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
