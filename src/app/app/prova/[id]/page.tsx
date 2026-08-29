"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Lock,
  Hourglass,
  Trophy,
  AlertOctagon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { apiFetch, formatDuration, formatPct, formatDateTime } from "@/lib/api";
import { toast } from "sonner";
import {
  STATUS_LABEL,
  STATUS_VARIANT,
  type ExamStatus,
} from "@/lib/exam-window";

interface Question {
  id: string;
  order: number;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  subject?: string;
  correctAnswer?: string;
  explanation?: string;
}

interface Attempt {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  correctCount: number | null;
  totalCount: number | null;
  timeSpentSeconds: number | null;
}

interface ExamData {
  exam: {
    id: string;
    title: string;
    description?: string;
    type: string;
    passingScore: number;
    showResults: string;
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    status: ExamStatus;
    hasIndividualAssignment: boolean;
    window: { start: string; end: string; durationMinutes: number; isIndividual: boolean };
    class?: { name: string };
  };
  attempt: Attempt | null;
  questions: Question[];
  answers: Record<string, string>;
}

export default function ExamTakingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submittedRef = useRef(false);

  // Carrega dados
  useEffect(() => {
    if (!id) return;
    apiFetch<ExamData>(`/api/student/exams/${id}`).then((res) => {
      if (!res.ok || !res.data) {
        toast.error(res.error || "Prova não encontrada.");
        router.replace("/app/aluno");
        return;
      }
      setData(res.data);
      setAnswers(res.data.answers || {});
      if (res.data.attempt && res.data.attempt.status !== "IN_PROGRESS") {
        setShowResult(true);
      }
      setLoading(false);
    });
  }, [id, router]);

  // Tick do relógio a cada segundo
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const attempt = data?.attempt;
  const examWindow = data?.exam?.window;
  const deadlineMs = examWindow ? new Date(examWindow.end).getTime() : 0;
  const startedAtMs = attempt ? new Date(attempt.startedAt).getTime() : 0;
  const durationMs = (examWindow?.durationMinutes || 0) * 60_000;

  // Tempo restante = min(deadline - now, startedAt + duration - now)
  const remainingMs = useMemo(() => {
    if (!attempt || !examWindow) return null;
    const byDeadline = deadlineMs - now;
    const byDuration = startedAtMs + durationMs - now;
    return Math.min(byDeadline, byDuration);
  }, [attempt, examWindow, deadlineMs, startedAtMs, durationMs, now]);

  useEffect(() => {
    if (remainingMs === null) return;
    setRemaining(Math.max(0, Math.floor(remainingMs / 1000)));
    if (remainingMs <= 0 && !submittedRef.current) {
      submittedRef.current = true;
      toast.error("Tempo esgotado! Submetendo prova automaticamente...");
      submit(true);
    }
  }, [remainingMs]);

  const submit = useCallback(
    async (auto = false) => {
      if (!data || submitting) return;
      if (!auto) {
        const unanswered = data.questions.filter((q) => !answers[q.id]);
        if (unanswered.length > 0) {
          if (
            !confirm(
              `Você deixou ${unanswered.length} questão(ões) sem resposta. Finalizar a prova mesmo assim?`
            )
          ) {
            return;
          }
        }
      }
      setSubmitting(true);
      const res = await apiFetch<{ score: number; correctCount: number; totalCount: number; passed: boolean }>(
        `/api/student/exams/${id}/submit`,
        { method: "POST" }
      );
      setSubmitting(false);
      if (!res.ok) {
        toast.error(res.error || "Erro ao enviar prova.");
        return;
      }
      toast.success(
        auto
          ? "Prova finalizada automaticamente."
          : `Prova enviada! Score: ${formatPct(res.data?.score)}`
      );
      // Recarrega
      const fresh = await apiFetch<ExamData>(`/api/student/exams/${id}`);
      if (fresh.ok && fresh.data) {
        setData(fresh.data);
        setAnswers(fresh.data.answers || {});
        setShowResult(true);
        setCurrentIdx(0);
      }
    },
    [data, submitting, answers, id]
  );

  const selectAnswer = useCallback(
    async (qid: string, opt: string) => {
      if (!data || showResult) return;
      const next = { ...answers, [qid]: opt };
      setAnswers(next);
      setSavedAt(null);
      // Salvamento automático (debounced)
      const res = await apiFetch(`/api/student/exams/${id}/answer`, {
        method: "PUT",
        body: JSON.stringify({ questionId: qid, selected: opt }),
      });
      if (res.ok) {
        setSavedAt(new Date());
      } else if (res.status === 410) {
        // Tempo esgotado
        toast.error("Tempo esgotado. Sua prova foi finalizada.");
        submit(true);
      } else {
        toast.error(res.error || "Erro ao salvar resposta.");
      }
    },
    [data, showResult, answers, id, submit]
  );

  async function handleStart() {
    setStarting(true);
    const res = await apiFetch<{ attemptId: string }>(
      `/api/student/exams/${id}/start`,
      { method: "POST" }
    );
    setStarting(false);
    if (!res.ok) {
      toast.error(res.error || "Não foi possível iniciar a prova.");
      return;
    }
    toast.success("Prova iniciada! Boa sorte.");
    const fresh = await apiFetch<ExamData>(`/api/student/exams/${id}`);
    if (fresh.ok && fresh.data) {
      setData(fresh.data);
      setAnswers(fresh.data.answers || {});
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showResult && attempt) {
    return <ExamResult data={data} attempt={attempt} answers={answers} />;
  }

  // Se ainda não começou: tela de "boas-vindas" / instruções
  if (!attempt || attempt.status !== "IN_PROGRESS") {
    return (
      <ExamIntro
        data={data}
        now={now}
        onBegin={handleStart}
        starting={starting}
      />
    );
  }

  const total = data.questions.length;
  const answered = data.questions.filter((q) => answers[q.id]).length;
  const current = data.questions[currentIdx];
  const options = [
    { key: "A", text: current.optionA },
    { key: "B", text: current.optionB },
    { key: "C", text: current.optionC },
    { key: "D", text: current.optionD },
  ];
  const lowTime = remaining !== null && remaining < 60;
  const veryLowTime = remaining !== null && remaining < 30;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com cronômetro */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Logo variant="white" showText={false} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 uppercase tracking-wider">
              Prova Oficial
            </p>
            <p className="text-sm font-semibold truncate">{data.exam.title}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold",
              veryLowTime
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : lowTime
                ? "bg-amber-500 text-white"
                : "bg-primary-foreground/10"
            )}
          >
            <Clock className="size-4" />
            {remaining !== null ? formatDuration(remaining) : "--:--"}
          </div>
        </div>
        <div className="h-1 bg-primary-foreground/10">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-4">
        {/* Navigator */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {data.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "size-8 rounded-md text-xs font-medium border transition-colors",
                    i === currentIdx
                      ? "border-primary bg-primary text-primary-foreground"
                      : answers[q.id]
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    Questão {currentIdx + 1} de {total}
                  </Badge>
                  {current.subject && (
                    <Badge variant="outline" className="text-secondary">
                      {current.subject}
                    </Badge>
                  )}
                  {answers[current.id] && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="size-3 mr-1" />
                      Respondida
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base md:text-lg font-medium leading-snug whitespace-pre-wrap">
                  {current.statement}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {options.map((opt) => {
                  const selected = answers[current.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => selectAnswer(current.id, opt.key)}
                      className={cn(
                        "w-full flex items-start gap-3 text-left p-3 rounded-xl border-2 transition-all",
                        selected
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/40 hover:bg-accent/5"
                      )}
                    >
                      <div
                        className={cn(
                          "size-7 rounded-md flex items-center justify-center font-semibold text-sm shrink-0",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {opt.key}
                      </div>
                      <p className="text-sm md:text-base pt-0.5">{opt.text}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="size-4 mr-1" />
            Anterior
          </Button>
          {currentIdx === total - 1 ? (
            <Button
              onClick={() => submit(false)}
              disabled={submitting}
              className="bg-accent hover:bg-accent/90"
            >
              {submitting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              Finalizar prova
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}>
              Próxima
              <ArrowRight className="size-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Status de salvamento */}
        <Card className="bg-muted/40 sticky bottom-3 z-20 shadow-md">
          <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              {savedAt ? (
                <>
                  <CheckCircle2 className="size-4 text-accent" />
                  <span className="text-accent font-medium">Salvo</span>
                  <span className="text-muted-foreground text-xs">
                    {savedAt.toLocaleTimeString("pt-BR")}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="size-4 text-muted-foreground animate-spin" />
                  <span className="text-muted-foreground">Salvando...</span>
                </>
              )}
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-muted-foreground text-xs">
                {answered} / {total} respondidas
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submit(false)}
              disabled={submitting}
              className="text-accent hover:text-accent"
            >
              <Send className="size-3 mr-1" />
              Finalizar agora
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ExamIntro({
  data,
  now,
  onBegin,
  starting,
}: {
  data: ExamData;
  now: number;
  onBegin: () => void;
  starting: boolean;
}) {
  const exam = data.exam;
  const startMs = new Date(exam.window.start).getTime();
  const endMs = new Date(exam.window.end).getTime();
  const isAvailable = now >= startMs && now <= endMs;
  const isBefore = now < startMs;
  const minsToStart = isBefore ? Math.ceil((startMs - now) / 60_000) : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <Card className="overflow-hidden">
          <div className="ocean-gradient px-6 py-5 text-primary-foreground flex items-center gap-3">
            <Logo variant="white" showText={false} />
            <div className="flex-1">
              <p className="text-xs text-white/70 uppercase tracking-wider">
                Prova Oficial
              </p>
              <h1 className="text-xl font-bold">{exam.title}</h1>
            </div>
            <Badge variant={STATUS_VARIANT[exam.status]}>
              {STATUS_LABEL[exam.status]}
            </Badge>
          </div>
          <CardContent className="p-6 space-y-4">
            {exam.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {exam.description}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <InfoBox
                label="Turma"
                value={exam.class?.name || "—"}
              />
              <InfoBox
                label="Duração"
                value={`${exam.window.durationMinutes} min`}
              />
              <InfoBox
                label="Início"
                value={formatDateTime(exam.window.start)}
              />
              <InfoBox
                label="Encerramento"
                value={formatDateTime(exam.window.end)}
              />
              <InfoBox
                label="Total de questões"
                value={data.questions.length.toString()}
              />
              <InfoBox
                label="Nota mínima"
                value={`${exam.passingScore}%`}
              />
            </div>

            {exam.hasIndividualAssignment && (
              <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30 flex items-start gap-2">
                <AlertOctagon className="size-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-sm text-secondary">
                  Esta prova tem horário personalizado para você (atribuição
                  individual / antecipada).
                </p>
              </div>
            )}

            {isBefore ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                <Hourglass className="size-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">
                    Prova começa em {minsToStart} min
                  </p>
                  <p className="text-amber-800/80">
                    Volte aqui após {formatDateTime(exam.window.start)}.
                  </p>
                </div>
              </div>
            ) : !isAvailable ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
                <Lock className="size-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Prova encerrada</p>
                  <p className="text-destructive/80">
                    A janela de aplicação terminou em{" "}
                    {formatDateTime(exam.window.end)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-accent flex items-start gap-2">
                <AlertTriangle className="size-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Pronto para começar?</p>
                  <p className="text-accent/90">
                    Ao iniciar, o cronômetro regredirá {exam.window.durationMinutes}{" "}
                    minutos. Suas respostas são salvas automaticamente.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/app/aluno">
                  <ArrowLeft className="size-4 mr-1" />
                  Voltar
                </Link>
              </Button>
              <Button
                onClick={onBegin}
                disabled={!isAvailable || starting}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {starting ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Trophy className="size-4 mr-2" />
                )}
                {starting ? "Iniciando..." : "Iniciar prova"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function ExamResult({
  data,
  attempt,
  answers,
}: {
  data: ExamData;
  attempt: Attempt;
  answers: Record<string, string>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const total = attempt.totalCount ?? data.questions.length;
  const correct = attempt.correctCount ?? 0;
  const score = attempt.score ?? 0;
  const passed = score >= data.exam.passingScore;
  // Se showResults == IMMEDIATE ou AFTER_END e já submeteu, mostra gabarito
  const showGabarito = data.exam.showResults !== "MANUAL";

  return (
    <div className="min-h-screen bg-background">
      <header className="ocean-gradient text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <Link
            href="/app/aluno"
            className="p-1.5 rounded-md hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo variant="white" showText={false} />
          <div className="flex-1">
            <p className="text-xs text-white/70 uppercase tracking-wider">
              Resultado da Prova
            </p>
            <h1 className="text-xl md:text-2xl font-bold">{data.exam.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Card
          className={cn(
            "border-2",
            passed ? "border-accent" : "border-destructive/40"
          )}
        >
          <CardContent className="p-6 text-center">
            <div
              className={cn(
                "size-16 mx-auto rounded-full flex items-center justify-center mb-3",
                passed ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive"
              )}
            >
              {passed ? <Trophy className="size-8" /> : <AlertTriangle className="size-8" />}
            </div>
            <h2 className={cn("text-2xl font-bold", passed ? "text-accent" : "text-foreground")}>
              {passed ? "Aprovado(a)!" : "Reprovado(a)"}
            </h2>
            <p className="text-3xl font-bold mt-1">{formatPct(score)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {correct} de {total} acertos • Tempo:{" "}
              {formatDuration(attempt.timeSpentSeconds)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Nota mínima para aprovação: {data.exam.passingScore}%
            </p>
          </CardContent>
        </Card>

        {!showGabarito ? (
          <Card className="bg-muted/40">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <Lock className="size-5 mx-auto mb-1 text-muted-foreground" />
              O gabarito será divulgado posteriormente pelo administrador.
            </CardContent>
          </Card>
        ) : (
          <>
            {data.questions.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {data.questions.map((q, i) => {
                      const sel = answers[q.id];
                      const isCorrect = sel === q.correctAnswer;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIdx(i)}
                          className={cn(
                            "size-8 rounded-md text-xs font-medium border-2 transition-colors flex items-center justify-center",
                            i === currentIdx && "ring-2 ring-primary ring-offset-1",
                            !sel
                              ? "border-border bg-muted text-muted-foreground"
                              : isCorrect
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-destructive bg-destructive/10 text-destructive"
                          )}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.questions[currentIdx] && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={data.questions[currentIdx].id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ExamQuestionReview
                    question={data.questions[currentIdx]}
                    selected={answers[data.questions[currentIdx].id]}
                    index={currentIdx}
                    total={total}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="size-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={currentIdx === total - 1}
                onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              >
                Próxima
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        <Button asChild className="w-full">
          <Link href="/app/aluno">
            <ArrowLeft className="size-4 mr-2" />
            Voltar para o dashboard
          </Link>
        </Button>
      </main>
    </div>
  );
}

function ExamQuestionReview({
  question,
  selected,
  index,
  total,
}: {
  question: Question;
  selected?: string;
  index: number;
  total: number;
}) {
  const options = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];
  const isCorrect = selected === question.correctAnswer;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Questão {index + 1} de {total}</Badge>
            {question.subject && (
              <Badge variant="outline" className="text-secondary">
                {question.subject}
              </Badge>
            )}
          </div>
          <Badge
            className={
              !selected
                ? "bg-muted text-muted-foreground"
                : isCorrect
                ? "bg-accent text-accent-foreground"
                : "bg-destructive text-destructive-foreground"
            }
          >
            {!selected ? (
              <>
                <XCircle className="size-3 mr-1" />
                Sem resposta
              </>
            ) : isCorrect ? (
              <>
                <CheckCircle2 className="size-3 mr-1" />
                Acertou
              </>
            ) : (
              <>
                <XCircle className="size-3 mr-1" />
                Errou
              </>
            )}
          </Badge>
        </div>
        <CardTitle className="text-base md:text-lg font-medium leading-snug whitespace-pre-wrap">
          {question.statement}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((opt) => {
          const isAns = opt.key === question.correctAnswer;
          const isSel = opt.key === selected;
          return (
            <div
              key={opt.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border-2",
                isAns
                  ? "border-accent bg-accent/10"
                  : isSel
                  ? "border-destructive bg-destructive/5"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "size-7 rounded-md flex items-center justify-center font-semibold text-sm shrink-0",
                  isAns
                    ? "bg-accent text-accent-foreground"
                    : isSel
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt.key}
              </div>
              <p className="text-sm md:text-base pt-0.5 flex-1">{opt.text}</p>
              {isAns && (
                <Badge variant="outline" className="border-accent text-accent">
                  <CheckCircle2 className="size-3 mr-1" />
                  Correta
                </Badge>
              )}
              {isSel && !isAns && (
                <Badge variant="outline" className="border-destructive text-destructive">
                  <XCircle className="size-3 mr-1" />
                  Sua resposta
                </Badge>
              )}
            </div>
          );
        })}

        {question.explanation && (
          <div className="mt-3 p-3 rounded-xl bg-muted/60 border border-border">
            <div className="flex items-start gap-2">
              <AlertOctagon className="size-4 text-secondary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-foreground mb-1">
                  Gabarito comentado
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
