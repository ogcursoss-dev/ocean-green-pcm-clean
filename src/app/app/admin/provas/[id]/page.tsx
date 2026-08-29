"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users,
  Calendar,
  Clock,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Search,
  UserPlus,
  X,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, formatDateTime, formatPct } from "@/lib/api";
import { toast } from "sonner";
import { maskCpf } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ExamData {
  exam: {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    passingScore: number;
    active: boolean;
    showResults: string;
    class?: { id: string; name: string };
  };
  questions: Array<{
    id: string;
    order: number;
    question: {
      id: string;
      statement: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      difficulty: string;
      subject?: { id: string; name: string };
    };
  }>;
  assignments: Array<{
    id: string;
    userId: string | null;
    classId: string | null;
    customStart: string | null;
    customEnd: string | null;
    customDuration: number | null;
    notes: string | null;
    createdAt: string;
    user?: { id: string; name: string; cpf: string } | null;
  }>;
}

interface QuestionSearch {
  id: string;
  statement: string;
  difficulty: string;
  subject?: { id: string; name: string };
}

interface ClassMember {
  user: { id: string; name: string; cpf: string };
}

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<{ exam: ExamData }>(`/api/admin/exams/${id}`);
    if (!res.ok || !res.data) {
      toast.error(res.error || "Prova não encontrada.");
      router.replace("/app/admin/provas");
      return;
    }
    setData(res.data.exam);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/app/admin/provas">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
          <FileText className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">
            {data.exam.title}
          </h1>
          {data.exam.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {data.exam.description}
            </p>
          )}
        </div>
        <Badge
          className={
            data.exam.type === "OFFICIAL"
              ? "bg-secondary/15 text-secondary border-secondary/30"
              : "bg-accent/15 text-accent border-accent/30"
          }
        >
          {data.exam.type === "OFFICIAL" ? "Oficial" : "Simulado"}
        </Badge>
      </div>

      {/* Info summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="Turma" value={data.exam.class?.name || "—"} />
        <InfoCard
          label="Início"
          value={formatDateTime(data.exam.startDateTime)}
        />
        <InfoCard
          label="Encerramento"
          value={formatDateTime(data.exam.endDateTime)}
        />
        <InfoCard
          label="Duração"
          value={`${data.exam.durationMinutes} min`}
        />
      </div>

      <Tabs defaultValue="questions">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="questions">
            <FileText className="size-4 mr-1.5" />
            Questões ({data.questions.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="size-4 mr-1.5" />
            Atribuições ({data.assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <ExamQuestionsTab
            examId={data.exam.id}
            examQuestions={data.questions}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <ExamAssignmentsTab
            examId={data.exam.id}
            assignments={data.assignments}
            classId={data.exam.class?.id}
            onChanged={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function ExamQuestionsTab({
  examId,
  examQuestions,
  onChanged,
}: {
  examId: string;
  examQuestions: ExamData["questions"];
  onChanged: () => void;
}) {
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [diffFilter, setDiffFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<QuestionSearch[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ subjects: Array<{ id: string; name: string }> }>("/api/admin/subjects").then(
      (r) => {
        if (r.ok && r.data) setSubjects(r.data.subjects || []);
      }
    );
  }, []);

  useEffect(() => {
    setLoadingSearch(true);
    const t = setTimeout(async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (subjectFilter !== "ALL") params.set("subjectId", subjectFilter);
      if (diffFilter !== "ALL") params.set("difficulty", diffFilter);
      params.set("pageSize", "20");
      const res = await apiFetch<{ questions: QuestionSearch[] }>(
        `/api/admin/questions?${params.toString()}`
      );
      if (res.ok && res.data) setResults(res.data.questions || []);
      setLoadingSearch(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, subjectFilter, diffFilter]);

  const examQuestionIds = new Set(examQuestions.map((eq) => eq.question.id));

  async function addQuestion(qid: string) {
    setBusy(true);
    const res = await apiFetch(`/api/admin/exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questionId: qid }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Questão adicionada.");
      onChanged();
    } else {
      toast.error(res.error || "Erro ao adicionar.");
    }
  }

  async function removeQuestion(qid: string) {
    if (!confirm("Remover esta questão da prova?")) return;
    setBusy(true);
    const res = await apiFetch(`/api/admin/exams/${examId}/questions/${qid}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Questão removida.");
      onChanged();
    } else {
      toast.error(res.error || "Erro ao remover.");
    }
  }

  async function move(qid: string, direction: -1 | 1) {
    const idx = examQuestions.findIndex((eq) => eq.question.id === qid);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= examQuestions.length) return;
    setBusy(true);
    await apiFetch(`/api/admin/exams/${examId}/questions/${qid}`, {
      method: "PATCH",
      body: JSON.stringify({ order: examQuestions[newIdx].order }),
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Lista de questões na prova */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Questões da Prova ({examQuestions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {examQuestions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <FileText className="size-6 mx-auto mb-2 opacity-50" />
              Nenhuma questão adicionada ainda.
            </div>
          ) : (
            examQuestions.map((eq, idx) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card hover:border-accent/40 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <GripVertical className="size-3.5 text-muted-foreground/50" />
                  <span className="text-xs font-bold text-primary mt-1">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">
                    {eq.question.statement}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {eq.question.subject && (
                      <Badge variant="outline" className="text-xs">
                        {eq.question.subject.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {eq.question.difficulty === "EASY"
                        ? "Fácil"
                        : eq.question.difficulty === "MEDIUM"
                        ? "Média"
                        : "Difícil"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      Gab: {eq.question.correctAnswer}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={busy || idx === 0}
                    onClick={() => move(eq.question.id, -1)}
                    title="Subir"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={busy || idx === examQuestions.length - 1}
                    onClick={() => move(eq.question.id, 1)}
                    title="Descer"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => removeQuestion(eq.question.id)}
                  title="Remover"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Buscar e adicionar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4 text-accent" />
            Adicionar Questões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por enunciado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">Todas</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={diffFilter} onValueChange={setDiffFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="EASY">Fácil</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="HARD">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg max-h-[420px] overflow-y-auto divide-y divide-border">
            {loadingSearch ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin mx-auto" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma questão encontrada.
              </div>
            ) : (
              results.map((q) => {
                const inExam = examQuestionIds.has(q.id);
                return (
                  <div
                    key={q.id}
                    className="flex items-start gap-2 p-3 hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{q.statement}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {q.subject && (
                          <Badge variant="outline" className="text-xs">
                            {q.subject.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {q.difficulty === "EASY"
                            ? "Fácil"
                            : q.difficulty === "MEDIUM"
                            ? "Média"
                            : "Difícil"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={inExam ? "secondary" : "default"}
                      disabled={inExam || busy}
                      onClick={() => addQuestion(q.id)}
                    >
                      {inExam ? (
                        <>
                          <X className="size-3 mr-1" />
                          Adicionada
                        </>
                      ) : (
                        <>
                          <Plus className="size-3 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExamAssignmentsTab({
  examId,
  assignments,
  classId,
  onChanged,
}: {
  examId: string;
  assignments: ExamData["assignments"];
  classId?: string;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [target, setTarget] = useState<"CLASS" | "INDIVIDUAL">("CLASS");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    if (!classId) return;
    setMembersLoading(true);
    const res = await apiFetch<{ members: ClassMember[] }>(
      `/api/admin/classes/${classId}/members`
    );
    if (res.ok && res.data) setMembers(res.data.members || []);
    setMembersLoading(false);
  }

  useEffect(() => {
    if (addOpen) loadMembers();
  }, [addOpen]);

  async function handleCreate() {
    if (target === "INDIVIDUAL" && !selectedUserId) {
      toast.error("Selecione um aluno.");
      return;
    }
    setSaving(true);
    const body: any = {
      userId: target === "INDIVIDUAL" ? selectedUserId : null,
      classId,
      notes: notes || undefined,
    };
    if (useCustom) {
      if (customStart) body.customStart = new Date(customStart).toISOString();
      if (customEnd) body.customEnd = new Date(customEnd).toISOString();
      if (customDuration) body.customDuration = Number(customDuration);
    }
    const res = await apiFetch(`/api/admin/exams/${examId}/assignments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao criar atribuição.");
      return;
    }
    toast.success("Atribuição criada.");
    setAddOpen(false);
    setUseCustom(false);
    setCustomStart("");
    setCustomEnd("");
    setCustomDuration("");
    setNotes("");
    setSelectedUserId("");
    onChanged();
  }

  async function handleDelete(assignmentId: string) {
    if (!confirm("Remover esta atribuição?")) return;
    const res = await apiFetch(
      `/api/admin/exams/${examId}/assignments/${assignmentId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Atribuição removida.");
      onChanged();
    } else {
      toast.error(res.error || "Erro ao remover.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4 mr-1" />
          Nova Atribuição
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Atribuições da Prova ({assignments.length})
          </CardTitle>
          <CardDescription>
            Defina quem pode fazer esta prova e quando.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-50" />
              Nenhuma atribuição criada.
              <p className="text-xs mt-1">
                Crie uma atribuição para a turma inteira ou para um aluno
                específico (prova antecipada).
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "size-10 rounded-lg flex items-center justify-center",
                      a.userId
                        ? "bg-accent/15 text-accent"
                        : "bg-secondary/15 text-secondary"
                    )}
                  >
                    {a.userId ? (
                      <Users className="size-5" />
                    ) : (
                      <Users className="size-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {a.userId
                          ? a.user?.name || "Aluno específico"
                          : "Turma inteira"}
                      </p>
                      <Badge variant={a.userId ? "default" : "secondary"}>
                        {a.userId ? "Individual" : "Turma"}
                      </Badge>
                      {a.userId && a.user && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {maskCpf(a.user.cpf)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {a.customStart || a.customEnd ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Override:{" "}
                          {a.customStart
                            ? formatDateTime(a.customStart)
                            : "—"}{" "}
                          →{" "}
                          {a.customEnd ? formatDateTime(a.customEnd) : "—"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Usa janela padrão da prova
                        </span>
                      )}
                      {a.customDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Duração: {a.customDuration} min
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{a.notes}"
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a.id)}
                    title="Remover"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog nova atribuição */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Atribuição</DialogTitle>
            <DialogDescription>
              Atribua a prova à turma inteira ou a um aluno específico (prova
              antecipada individual).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Destinatário</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as "CLASS" | "INDIVIDUAL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">Turma inteira</SelectItem>
                  <SelectItem value="INDIVIDUAL">Aluno específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {target === "INDIVIDUAL" && (
              <div className="grid gap-2">
                <Label>Aluno *</Label>
                {membersLoading ? (
                  <div className="text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin inline mr-1" />
                    Carregando...
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertCircle className="size-4 inline mr-1" />
                    Nenhum aluno matriculado nesta turma.
                  </div>
                ) : (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {m.user.name} — {maskCpf(m.user.cpf)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="use-custom"
                checked={useCustom}
                onCheckedChange={setUseCustom}
              />
              <Label htmlFor="use-custom">
                Usar janela temporal personalizada (prova antecipada)
              </Label>
            </div>
            {useCustom && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="grid gap-2">
                  <Label htmlFor="cs">Início custom.</Label>
                  <Input
                    id="cs"
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ce">Fim custom.</Label>
                  <Input
                    id="ce"
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cd">Duração (min)</Label>
                  <Input
                    id="cd"
                    type="number"
                    min="1"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground md:col-span-3">
                  Deixe em branco para usar o padrão da prova.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notas internas (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Criar atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
