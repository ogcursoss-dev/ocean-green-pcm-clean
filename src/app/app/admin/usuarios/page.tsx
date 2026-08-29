"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Pencil,
  Power,
  Shield,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { maskCpf, cleanCpf, isValidCpf } from "@/lib/auth";
import { formatDateTime } from "@/lib/api";
import { motion } from "framer-motion";

interface UserItem {
  id: string;
  cpf: string;
  name: string;
  email?: string | null;
  role: string;
  active: boolean;
  createdAt: string;
  classes: { id: string; name: string }[];
}

interface ClassItem {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
    apiFetch<{ classes: ClassItem[] }>("/api/admin/classes").then((r) => {
      if (r.ok && r.data) setClasses(r.data.classes || []);
    });
  }, []);

  async function refresh(searchTerm = search, role = roleFilter) {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (role !== "ALL") params.set("role", role);
    const res = await apiFetch<{ users: UserItem[] }>(
      `/api/admin/users?${params.toString()}`
    );
    if (res.ok && res.data) setUsers(res.data.users || []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => refresh(search, roleFilter), 350);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditing(user);
    setDialogOpen(true);
  }

  async function toggleActive(user: UserItem) {
    const action = user.active ? "desativar" : "ativar";
    if (!confirm(`Deseja ${action} o usuário ${user.name}?`)) return;
    const res = await apiFetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(`Usuário ${action === "desativar" ? "desativado" : "ativado"}.`);
      refresh();
    } else {
      toast.error(res.error || "Erro ao alterar status.");
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie alunos e administradores da plataforma.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="size-4 mr-1" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CPF, nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os perfis</SelectItem>
              <SelectItem value="ADMIN">Administradores</SelectItem>
              <SelectItem value="STUDENT">Alunos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-50" />
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Turmas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className={u.active ? "" : "opacity-60"}
                    >
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        {u.email && (
                          <div className="text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {maskCpf(u.cpf)}
                      </TableCell>
                      <TableCell>
                        {u.role === "ADMIN" ? (
                          <Badge className="bg-secondary text-secondary-foreground">
                            <Shield className="size-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <GraduationCap className="size-3 mr-1" />
                            Aluno
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.classes.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            u.classes.slice(0, 2).map((c) => (
                              <Badge key={c.id} variant="secondary" className="text-xs">
                                {c.name}
                              </Badge>
                            ))
                          )}
                          {u.classes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{u.classes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <Badge className="bg-accent/15 text-accent border-accent/30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(u)}
                            className="size-8"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleActive(u)}
                            className="size-8"
                            title={u.active ? "Desativar" : "Ativar"}
                          >
                            <Power
                              className={`size-4 ${
                                u.active ? "text-destructive" : "text-accent"
                              }`}
                            />
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

      <UserDialog
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
    </div>
  );
}

function UserDialog({
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
  editing: UserItem | null;
  classes: ClassItem[];
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setName(editing?.name || "");
      setCpf(editing ? maskCpf(editing.cpf) : "");
      setEmail(editing?.email || "");
      setPassword("");
      setRole(editing?.role || "STUDENT");
      setSelectedClasses(new Set(editing?.classes?.map((c) => c.id) || []));
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !cpf.trim()) {
      toast.error("Nome e CPF são obrigatórios.");
      return;
    }
    // Senha é opcional — se não informada, usa o CPF como senha padrão
    const cleaned = cleanCpf(cpf);
    if (!isValidCpf(cleaned)) {
      toast.error("CPF inválido. Informe 11 dígitos.");
      return;
    }
    onSavingChange(true);
    const body = {
      name: name.trim(),
      cpf: cleaned,
      email: email.trim() || undefined,
      password: password || undefined,
      role,
      classIds: Array.from(selectedClasses),
    };
    const res = editing
      ? await apiFetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
    onSavingChange(false);
    if (!res.ok) {
      toast.error(res.error || "Erro ao salvar usuário.");
      return;
    }
    toast.success(editing ? "Usuário atualizado." : "Usuário criado.");
    onSaved();
  }

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do usuário. Deixe a senha em branco para manter a atual."
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="font-mono"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Perfil</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Aluno</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
              <p className="text-xs text-accent font-medium flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                Login apenas por CPF
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O acesso à plataforma é feito apenas com o CPF. Não é necessário cadastrar senha — o sistema valida se o CPF está cadastrado e ativo.
              </p>
            </div>
            {role === "STUDENT" && (
              <div className="grid gap-2">
                <Label>Turmas (matrículas)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {classes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma turma cadastrada.
                    </p>
                  ) : (
                    classes.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={selectedClasses.has(c.id)}
                          onCheckedChange={() => toggleClass(c.id)}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
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
              {editing ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
