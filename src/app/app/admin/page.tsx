'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, GraduationCap, BookOpenText, ClipboardList, FileBarChart2, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface Stats {
  students: number
  classes: number
  questions: number
  exams: number
  attempts: number
  simulations: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Alunos', value: stats?.students ?? 0, icon: Users, href: '/app/admin/usuarios', color: 'text-[#0A5C36]' },
    { label: 'Turmas', value: stats?.classes ?? 0, icon: GraduationCap, href: '/app/admin/turmas', color: 'text-[#2E8B57]' },
    { label: 'Questões', value: stats?.questions ?? 0, icon: BookOpenText, href: '/app/admin/questoes', color: 'text-[#1B4965]' },
    { label: 'Provas', value: stats?.exams ?? 0, icon: ClipboardList, href: '/app/admin/provas', color: 'text-[#0A5C36]' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral do sistema Ocean Green Treinamentos</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/admin/usuarios">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Novo Aluno
            </Button>
          </Link>
          <Link href="/app/admin/provas">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Nova Prova
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href}>
              <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
                    {loading ? (
                      <Loader2 className="mt-1 h-6 w-6 animate-spin text-muted" />
                    ) : (
                      <p className="mt-1 text-3xl font-bold">{card.value}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2.5">
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Atividades e atalhos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
              Atividade do Sistema
            </CardTitle>
            <CardDescription>Tentativas de provas e simulados realizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Provas oficiais realizadas</span>
              <span className="text-xl font-bold text-primary">{loading ? '...' : stats?.attempts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Simulados livres (estudo)</span>
              <span className="text-xl font-bold text-accent">{loading ? '...' : stats?.simulations ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente os módulos do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Gerenciar usuários', href: '/app/admin/usuarios', icon: Users },
              { label: 'Gerenciar turmas', href: '/app/admin/turmas', icon: GraduationCap },
              { label: 'Banco de questões', href: '/app/admin/questoes', icon: BookOpenText },
              { label: 'Provas e agendamentos', href: '/app/admin/provas', icon: ClipboardList },
              { label: 'Relatórios e exportação', href: '/app/admin/relatorios', icon: FileBarChart2 },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <Icon className="h-4 w-4 text-accent" />
                    {item.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
