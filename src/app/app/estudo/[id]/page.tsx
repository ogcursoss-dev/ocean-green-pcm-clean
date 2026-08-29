"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  Trophy,
  XCircle,
  Send,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiFetch, formatDuration, formatPct } from "@/lib/api";
import { toast } from "sonner";
import { Logo } from "@/components/logo";

interface Question {
  id: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: string;
  subject: string;
  correctAnswer?: string;
  explanation?: string;
  selected?: string;
}

interface SimulationData {
  simulation: {
    id: string;
    score: number | null;
    correctCount: number | null;
    timeSpentSeconds: number | null;
    createdAt: string;
    difficulty: string | null;
    submittedAt: string | null;
  };
  questions: Question[];
  answers: Record<string, string | undefined>;
}

export default function SimulationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!id) return;
    apiFetch<SimulationData>(`/api/student/simulations/${id}`).then((res) => {
      if (!res.ok || !res.data) {
        toast.error(res.error || "Simulado não encontrado.");
        router.replace("/app/estudo");
        return;
      }
      setData(res.data);
      setAnswers(res.data.answers || {});
      if (res.data.simulation.score !== null) {
        setShowResult(true);
      }
      setLoading(false);
    });
  }, [id, router]);

  // Cronômetro opcional — conta o tempo decorrido
  useEffect(() => {
    if (!data || showResult) return;
    const i = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [data, showResult, startTime]);

  async function selectAnswer(qid: string, opt: string) {
    if (showResult) return;
    setAnswers((prev) => ({ ...prev, [qid]: opt }));
  }

  async function handleSubmit() {
    if (!data) return;
    const unanswered = data.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      if (
        !confirm(
          `Você deixou ${unanswered.length} questão(ões) sem resposta. Finalizar mesmo assim?`
        )
      ) {
        return;
      }
    }
    setSubmitting(true);
    const res = await apiFetch<{ score: number; correctCount: number; totalCount: number }>(
      `/api/student/simulations/${id}/submit`,
      {
        method: "POST",
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selected]) => ({
            questionId,
            selected,
          })),
        }),
      }
    );
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao finalizar simulado.");
      return;
    }
    toast.success(
      `Simulado finalizado! Score: ${formatPct(res.data?.score)}`
    );
    // Recarrega simulado com gabarito
    const fresh = await apiFetch<SimulationData>(`/api/student/simulations/${id}`);
    if (fresh.ok && fresh.data) {
      setData(fresh.data);
      setShowResult(true);
      setCurrentIdx(0);
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showResult) {
    return (
      <ResultView data={data} answers={answers} />
    );
  }

  const total = data.questions.length;
  const answered = data.questions.filter((q) => answers[q.id]).length;
  const current = data.questions[currentIdx];
  const progress = (answered / total) * 100;
  const options = [
    { key: "A", text: current.optionA },
    { key: "B", text: current.optionB },
    { key: "C", text: current.optionC },
    { key: "D", text: current.optionD },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/app/estudo"
            className="p-1.5 rounded-md hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo variant="white" showText={false} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 uppercase tracking-wider">
              Simulado Livre
            </p>
            <p className="text-sm font-semibold truncate">
              {answered} / {total} respondidas
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-lg text-sm font-mono">
            <Clock className="size-4" />
            {formatDuration(elapsed)}
          </div>
        </div>
        <div className="h-1 bg-primary-foreground/10">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-4">
        {/* Question navigator */}
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

        {/* Question card */}
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Questão {currentIdx + 1} de {total}</Badge>
                    {current.subject && (
                      <Badge variant="outline" className="text-secondary">
                        {current.subject}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {current.difficulty === "EASY" ? "Fácil" : current.difficulty === "MEDIUM" ? "Média" : "Difícil"}
                    </Badge>
                  </div>
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

        {/* Nav buttons */}
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
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-accent hover:bg-accent/90"
            >
              {submitting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              Finalizar
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}>
              Próxima
              <ArrowRight className="size-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Footer summary */}
        <Card className="bg-muted/40">
          <CardContent className="p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="size-4" />
              <span>{answered} respondidas • {total - answered} pendentes</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-accent hover:text-accent"
            >
              <Flag className="size-3 mr-1" />
              Finalizar agora
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ResultView({
  data,
  answers,
}: {
  data: SimulationData;
  answers: Record<string, string>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const sim = data.simulation;
  const total = data.questions.length;
  const correct = sim.correctCount ?? 0;
  const score = sim.score ?? 0;
  const passed = score >= 70;

  return (
    <div className="min-h-screen bg-background">
      <header className="ocean-gradient text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <Link
            href="/app/estudo"
            className="p-1.5 rounded-md hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo variant="white" showText={false} />
          <div className="flex-1">
            <p className="text-xs text-white/70 uppercase tracking-wider">
              Resultado do Simulado
            </p>
            <h1 className="text-xl md:text-2xl font-bold">
              {passed ? "Parabéns!" : "Continue praticando!"}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="size-6 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground uppercase">Score</p>
              <p className={cn("text-2xl font-bold", passed ? "text-accent" : "text-foreground")}>
                {formatPct(score)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="size-6 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground uppercase">Acertos</p>
              <p className="text-2xl font-bold">{correct}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="size-6 mx-auto mb-1 text-destructive" />
              <p className="text-xs text-muted-foreground uppercase">Erros</p>
              <p className="text-2xl font-bold">{total - correct}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="size-6 mx-auto mb-1 text-secondary" />
              <p className="text-xs text-muted-foreground uppercase">Tempo</p>
              <p className="text-xl font-bold">{formatDuration(sim.timeSpentSeconds)}</p>
            </CardContent>
          </Card>
        </div>

        <Progress value={score} className="h-2" />

        {/* Navigator */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {data.questions.map((q, i) => {
                const isCorrect = q.correctAnswer === answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "size-8 rounded-md text-xs font-medium border-2 transition-colors flex items-center justify-center",
                      i === currentIdx && "ring-2 ring-primary ring-offset-1",
                      !answers[q.id]
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

        {/* Gabarito comentado */}
        <AnimatePresence mode="wait">
          <motion.div
            key={data.questions[currentIdx].id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <QuestionReview
              question={data.questions[currentIdx]}
              selected={answers[data.questions[currentIdx].id]}
              index={currentIdx}
              total={total}
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
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

        <Card className="bg-muted/40">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="size-4" />
              Quer tentar de novo?
            </div>
            <Button asChild>
              <Link href="/app/estudo">
                <Trophy className="size-4 mr-1" />
                Novo simulado
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function QuestionReview({
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
              <BookOpen className="size-4 text-secondary mt-0.5 shrink-0" />
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
