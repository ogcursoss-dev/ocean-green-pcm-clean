"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookCopy,
  CheckCircle2,
  Loader2,
  ListChecks,
  Sliders,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  category: string | null;
  _count?: { questions: number };
}

const DIFF_OPTIONS = [
  { value: "EASY", label: "Fácil", color: "text-emerald-600" },
  { value: "MEDIUM", label: "Média", color: "text-amber-600" },
  { value: "MIXED", label: "Mista", color: "text-secondary" },
];

const COUNT_OPTIONS = [10, 20, 30, 50];

export default function StudyConfigPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState("MIXED");
  const [count, setCount] = useState(20);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    apiFetch<{ subjects: Subject[] }>("/api/student/subjects").then((res) => {
      if (res.ok && res.data) setSubjects(res.data.subjects || []);
      else if (res.error) toast.error(res.error);
      setLoading(false);
    });
  }, []);

  // Agrupa por categoria
  const grouped: Record<string, Subject[]> = {};
  for (const s of subjects) {
    const c = s.category || "Outros";
    (grouped[c] ||= []).push(s);
  }
  const categories = Object.keys(grouped).sort();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(list: Subject[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = list.every((s) => next.has(s.id));
      if (allSelected) list.forEach((s) => next.delete(s.id));
      else list.forEach((s) => next.add(s.id));
      return next;
    });
  }

  const totalAvailable = subjects.reduce(
    (acc, s) => acc + (s._count?.questions || 0),
    0
  );

  async function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Selecione ao menos uma disciplina.");
      return;
    }
    setGenerating(true);
    const res = await apiFetch<{ simulationId: string; questionCount: number }>(
      "/api/student/simulations",
      {
        method: "POST",
        body: JSON.stringify({
          subjectIds: Array.from(selected),
          difficulty: difficulty === "MIXED" ? null : difficulty,
          questionCount: count,
        }),
      }
    );
    setGenerating(false);
    if (!res.ok) {
      toast.error(res.error || "Não foi possível gerar o simulado.");
      return;
    }
    toast.success(
      `Simulado gerado com ${res.data?.questionCount} questões!`
    );
    router.push(`/app/estudo/${res.data?.simulationId}`);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ocean-gradient rounded-2xl p-6 text-primary-foreground shadow-lg"
      >
        <div className="flex items-center gap-3">
          <BookCopy className="size-8" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Modo Estudo</h1>
            <p className="text-white/90 text-sm md:text-base">
              Monte um simulado livre — escolha disciplinas, dificuldade e
              número de questões.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Carregando disciplinas...
          </CardContent>
        </Card>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="size-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma disciplina disponível ainda.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Aguarde o administrador cadastrar questões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Disciplinas" value={subjects.length} icon={<BookCopy className="size-4" />} />
            <StatCard label="Selecionadas" value={selected.size} icon={<CheckCircle2 className="size-4" />} />
            <StatCard label="Questões disponíveis" value={totalAvailable} icon={<ListChecks className="size-4" />} />
            <StatCard label="Categorias" value={categories.length} icon={<Sparkles className="size-4" />} />
          </div>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sliders className="size-4 text-accent" />
                Configurações
              </CardTitle>
              <CardDescription>
                Ajuste o nível de dificuldade e a quantidade de questões.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dificuldade</Label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={setDifficulty}
                  className="grid grid-cols-3 gap-2"
                >
                  {DIFF_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`diff-${opt.value}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors",
                        difficulty === opt.value && "border-accent bg-accent/10"
                      )}
                    >
                      <RadioGroupItem value={opt.value} id={`diff-${opt.value}`} />
                      <span className={cn("text-sm font-medium", opt.color)}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Número de questões</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COUNT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCount(c)}
                      className={cn(
                        "rounded-lg border border-border py-3 text-sm font-semibold transition-colors",
                        count === c
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-accent/50 hover:bg-accent/5"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disciplinas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="size-4 text-secondary" />
                Disciplinas
              </CardTitle>
              <CardDescription>
                Marque as disciplinas que deseja incluir no simulado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1 -mr-1">
                {categories.map((cat) => {
                  const items = grouped[cat];
                  const selectedInCat = items.filter((s) =>
                    selected.has(s.id)
                  ).length;
                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {cat}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {selectedInCat}/{items.length}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleAll(items)}
                          >
                            {selectedInCat === items.length
                              ? "Limpar"
                              : "Todos"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((s) => {
                          const checked = selected.has(s.id);
                          return (
                            <label
                              key={s.id}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                checked
                                  ? "border-accent bg-accent/5"
                                  : "border-border hover:border-accent/40"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(s.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {s.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {s._count?.questions || 0} questões
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border p-4 -mx-4 md:-mx-6 lg:-mx-8 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <p className="text-sm text-muted-foreground">
              {selected.size} disciplina(s) selecionada(s) • {count} questões
            </p>
            <Button
              onClick={handleSubmit}
              disabled={generating || selected.size === 0}
              size="lg"
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Gerando simulado...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Gerar Simulado
                </>
              )}
            </Button>
          </div>
        </>
      )}
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
      <CardContent className="p-3 flex items-center gap-3">
        <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
