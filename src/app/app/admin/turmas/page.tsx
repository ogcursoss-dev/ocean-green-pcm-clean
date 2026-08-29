"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  Loader2,
  Pencil,
  Users,
  FileText,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ClassItem {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  _count?: { members: number; exams: number };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const res = await apiFetch<{ classes: ClassItem[] }>("/api/admin/classes");
    if (res.ok && res.data) setClasses(res.data.classes || []);
    setLoading(false);
  }

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: ClassItem) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function handleDelete(c: ClassItem) {
    if (
      !confirm(
        `Excluir a turma "${c.name}"? Esta ação não pode ser desfeita.`
      )
    )
      return;
    const res = await apiFetch(`/api/admin/classes/${c.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Turma excluída.");
      refresh();
    } else {
      toast.error(res.error || "Erro ao excluir turma.");
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Turmas</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre turmas, matricule alunos e organize as provas.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="size-4 mr-1" />
          Nova Turma
        </Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar turma por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Carregando turmas...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="size-8 mx-auto mb-2 opacity-50" />
            Nenhuma turma encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card
                className={`h-full hover:border-accent/60 transition-all ${
                  !c.active ? "opacity-70" : ""
                }`}
              >
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {c.description}
                        </p>
                      )}
                    </div>
                    {c.active ? (
                      <Badge className="bg-accent/15 text-accent border-accent/30">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {c._count?.members || 0} alunos
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {c._count?.exams || 0} provas
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/70">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Link href={`/app/admin/turmas/${c.id}`}>
                        Ver alunos
                        <ChevronRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => openEdit(c)}
                      title="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c)}
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSavingChange={setSaving}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function ClassDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onSavingChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ClassItem | null;
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setName(editing?.name || "");
      setDescription(editing?.description || "");
      setActive(editing?.active ?? true);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome da turma é obrigatório.");
      return;
    }
    onSavingChange(true);
    const body = { name: name.trim(), description: description.trim(), active };
    const res = editing
      ? await apiFetch(`/api/admin/classes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/api/admin/classes", {
          method: "POST",
          body: JSON.stringify(body),
        });
    onSavingChange(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao salvar turma.");
      return;
    }
    toast.success(editing ? "Turma atualizada." : "Turma criada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Turma" : "Nova Turma"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize as informações da turma."
                : "Cadastre uma nova turma para organizar alunos e provas."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Turma PC 2026"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active">Turma ativa</Label>
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
