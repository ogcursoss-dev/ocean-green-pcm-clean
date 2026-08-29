'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpenText, ClipboardList, Clock, CheckCircle2, Lock, Loader2, Calendar, TrendingUp } from 'lucide-react'

interface ExamItem {
  id: string
  title: string
  className: string
  type: string
  startDateTime: string
  endDateTime: string
  durationMinutes: number
  status: 'SCHEDULED' | 'AVAILABLE' | 'COMPLETED' | 'CLOSED'
  hasAttempt: boolean
  score?: number
}

interface SimItem {
  id: string
  createdAt: string
  questionCount: number
  score: number | null
}

export default function AlunoDashboard() {
  const [exams, setExams] = useState<ExamItem[]>([])
  const [sims, setSims] = useState<SimItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/student/exams').then(r => r.json()),
      fetch('/api/student/simulations?limit=5').then(r => r.json()),
    ]).then(([examsData, simsData]) => {
      setExams(examsData.exams || [])
      setSims(simsData.simulations || [])
    }).finally(() => setLoading(false))
  }, [])

  const statusConfig = {
    SCHEDULED: { label: 'Agendada', variant: 'secondary' as const, icon: Clock },
    AVAILABLE: { label: 'Disponível', variant: 'default' as const, icon: ClipboardList },
    COMPLETED: { label: 'Realizada', variant: 'outline' as const, icon: CheckCircle2 },
    CLOSED: { label: 'Encerrada', variant: 'secondary' as const, icon: Lock },
  }

  const availableExams = exams.filter(e => e.status === 'AVAILABLE' && !e.hasAttempt)
  const scheduledExams = exams.filter(e => e.status === 'SCHEDULED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Bem-vindo(a)!</h1>
        <p className="text-sm text-muted-foreground">Área de estudos e avaliações — Ocean Green Treinamentos</p>
      </div>

      {/* Cards de ação */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <BookOpenText className="h-5 w-5" />
              Modo Estudo
            </CardTitle>
            <CardDescription>Simulados livres para treinar</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Gere simulados personalizados escolhendo disciplinas e dificuldade. Receba feedback imediato com gabarito comentado.
            </p>
            <Link href="/app/estudo">
              <Button className="w-full bg-primary hover:bg-primary/90">
                <BookOpenText className="mr-2 h-4 w-4" />
                Criar Simulado
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-accent/20">
          <CardHeader className="bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-lg text-accent">
              <ClipboardList className="h-5 w-5" />
              Provas Oficiais
            </CardTitle>
            <CardDescription>Avaliações programadas</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{availableExams.length}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">{scheduledExams.length}</p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
            </div>
            <Link href="/app/provas">
              <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                Ver Provas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Provas disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Provas Disponíveis e Agendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma prova atribuída a você no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {exams.slice(0, 5).map((exam) => {
                const sc = statusConfig[exam.status]
                const Icon = sc.icon
                return (
                  <div key={exam.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.className} · {new Date(exam.startDateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {exam.hasAttempt && exam.score != null && (
                        <Badge variant="outline">Nota: {exam.score.toFixed(1)}%</Badge>
                      )}
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      {exam.status === 'AVAILABLE' && !exam.hasAttempt && (
                        <Link href={`/app/prova/${exam.id}`}>
                          <Button size="sm" className="bg-primary hover:bg-primary/90">Iniciar</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulados recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
            Simulados Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : sims.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Você ainda não realizou simulados. Crie o primeiro!
            </p>
          ) : (
            <div className="space-y-2">
              {sims.map((sim) => (
                <div key={sim.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Simulado de {sim.questionCount} questões</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sim.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {sim.score != null ? (
                    <Badge variant={sim.score >= 70 ? 'default' : 'secondary'}>
                      {sim.score.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge variant="outline">Em andamento</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
