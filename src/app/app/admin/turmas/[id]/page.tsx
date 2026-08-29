"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Loader2,
  UserPlus,
  UserMinus,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { maskCpf } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

interface Member {
  user: {
    id: string;
    name: string;
    cpf: string;
    email?: string | null;
    active: boolean;
  };
}

interface UserItem {
  id: string;
  name: string;
  cpf: string;
  email?: string | null;
  role: string;
  active: boolean;
  classes: { id: string; name: string }[];
}

interface ExamItem {
  id: string;
  title: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
}

interface ClassData {
  class: {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
  };
  members: Member[];
  exams: ExamItem[];
}

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function refresh() {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<{ class: ClassData }>(`/api/admin/classes/${id}`);
    if (!res.ok || !res.data) {
      toast.error(res.error || "Turma não encontrada.");
      router.replace("/app/admin/turmas");
      return;
    }
    setData(res.data.class);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  async function loadUsers() {
    setUsersLoading(true);
    const res = await apiFetch<{ users: UserItem[] }>(
      `/api/admin/users?role=STUDENT`
    );
    if (res.ok && res.data) setUsers(res.data.users || []);
    setUsersLoading(false);
  }

  async function enroll(userId: string) {
    const res = await apiFetch(`/api/admin/classes/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      toast.success("Aluno matriculado.");
      refresh();
    } else {
      toast.error(res.error || "Erro ao matricular.");
    }
  }

  async function unenroll(userId: string, name: string) {
    if (!confirm(`Desmatricular ${name} desta turma?`)) return;
    const res = await apiFetch(`/api/admin/classes/${id}/members/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Aluno desmatriculado.");
      refresh();
    } else {
      toast.error(res.error || "Erro ao desmatricular.");
    }
  }

  if (loading || !data) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  const enrolledIds = new Set(data.members.map((m) => m.user.id));
  const availableUsers = users.filter(
    (u) =>
      !enrolledIds.has(u.id) &&
      (search
        ? u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.cpf.includes(search.replace(/\D/g, ""))
        : true)
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/app/admin/turmas">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="size-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
          <GraduationCap className="size-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{data.class.name}</h1>
          {data.class.description && (
            <p className="text-sm text-muted-foreground">
              {data.class.description}
            </p>
          )}
        </div>
        {data.class.active ? (
          <Badge className="bg-accent/15 text-accent border-accent/30">Ativa</Badge>
        ) : (
          <Badge variant="secondary">Inativa</Badge>
        )}
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Alunos
              </p>
              <Users className="size-4 text-accent" />
            </div>
            <p className="text-2xl font-bold mt-1">{data.members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Provas
              </p>
              <GraduationCap className="size-4 text-secondary" />
            </div>
            <p className="text-2xl font-bold mt-1">{data.exams.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-accent" />
              Alunos Matriculados
            </CardTitle>
            <CardDescription>
              {data.members.length} aluno(s) nesta turma.
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setAddDialog(true);
              loadUsers();
            }}
          >
            <UserPlus className="size-4 mr-1" />
            Matricular
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-50" />
              Nenhum aluno matriculado ainda.
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((m, idx) => (
                    <motion.tr
                      key={m.user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <TableCell>
                        <div className="font-medium">{m.user.name}</div>
                        {m.user.email && (
                          <div className="text-xs text-muted-foreground">
                            {m.user.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {maskCpf(m.user.cpf)}
                      </TableCell>
                      <TableCell>
                        {m.user.active ? (
                          <Badge className="bg-accent/15 text-accent border-accent/30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => unenroll(m.user.id, m.user.name)}
                          title="Desmatricular"
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provas da turma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="size-5 text-secondary" />
            Provas da Turma
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.exams.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma prova associada a esta turma.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.exams.map((e) => (
                <Link
                  key={e.id}
                  href={`/app/admin/provas/${e.id}`}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.startDateTime).toLocaleString("pt-BR")} —{" "}
                      {new Date(e.endDateTime).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {e.type === "OFFICIAL" ? "Oficial" : "Simulado"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de matrícula */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matricular aluno em {data.class.name}</DialogTitle>
            <DialogDescription>
              Selecione um aluno da lista para matriculá-lo nesta turma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-lg max-h-80 overflow-y-auto">
              {usersLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin mx-auto" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum aluno disponível para matrícula.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {availableUsers.slice(0, 100).map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {maskCpf(u.cpf)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => enroll(u.id)}
                      >
                        <UserPlus className="size-3 mr-1" />
                        Matricular
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
