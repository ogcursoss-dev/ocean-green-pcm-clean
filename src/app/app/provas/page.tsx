'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ClipboardList, Clock, CheckCircle2, Lock, Calendar, Play, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/api'

interface ExamItem {
  id: string
  title: string
  className: string
  type: string
  isRecovery: boolean
  startDateTime: string
  endDateTime: string
  durationMinutes: number
  status: 'SCHEDULED' | 'AVAILABLE' | 'COMPLETED' | 'CLOSED'
  hasAttempt: boolean
  score?: number
  isIndividual: boolean
  assignmentNote?: string
}

const statusConfig = {
  SCHEDULED: { label: 'Agendada', variant: 'secondary' as const, icon: Clock, color: 'text-amber-600' },
  AVAILABLE: { label: 'Disponível', variant: 'default' as const, icon: Play, color: 'text-green-600' },
  COMPLETED: { label: 'Realizada', variant: 'outline' as const, icon: CheckCircle2, color: 'text-blue-600' },
  CLOSED: { label: 'Encerrada', variant: 'secondary' as const, icon: Lock, color: 'text-gray-500' },
}

export default function ProvasPage() {
  const [exams, setExams] = useState<ExamItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/student/exams')
      .then(r => r.json())
      .then(data => setExams(data.exams || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const availableExams = exams.filter(e => e.status === 'AVAILABLE' && !e.hasAttempt)
  const scheduledExams = exams.filter(e => e.status === 'SCHEDULED')
  const completedExams = exams.filter(e => e.status === 'COMPLETED')
  const closedExams = exams.filter(e => e.status === 'CLOSED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Provas Oficiais</h1>
        <p className="text-sm text-muted-foreground">
          Avaliações programadas e disponíveis para você realizar
        </p>
      </div>

      {/* Resumo rápido */}
      {!loading && exams.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{availableExams.length}</p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{scheduledExams.length}</p>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{completedExams.length}</p>
              <p className="text-xs text-muted-foreground">Realizadas</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-500">{closedExams.length}</p>
              <p className="text-xs text-muted-foreground">Encerradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            Carregando provas...
          </CardContent>
        </Card>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma prova atribuída a você no momento</p>
            <p className="text-xs mt-1">Aguarde o administrador agendar uma prova para sua turma.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Provas Disponíveis */}
          {availableExams.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-green-700">
                <Play className="h-5 w-5" />
                Disponíveis Agora ({availableExams.length})
              </h2>
              {availableExams.map(exam => (
                <ExamCard key={exam.id} exam={exam} showStartButton />
              ))}
            </div>
          )}

          {/* Provas Agendadas */}
          {scheduledExams.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <Clock className="h-5 w-5" />
                Agendadas ({scheduledExams.length})
              </h2>
              {scheduledExams.map(exam => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}

          {/* Provas Realizadas */}
          {completedExams.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
                <CheckCircle2 className="h-5 w-5" />
                Realizadas ({completedExams.length})
              </h2>
              {completedExams.map(exam => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}

          {/* Provas Encerradas */}
          {closedExams.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-600">
                <Lock className="h-5 w-5" />
                Encerradas ({closedExams.length})
              </h2>
              {closedExams.map(exam => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExamCard({ exam, showStartButton = false }: { exam: ExamItem; showStartButton?: boolean }) {
  const sc = statusConfig[exam.status]
  const Icon = sc.icon
  const now = new Date()
  const start = new Date(exam.startDateTime)
  const end = new Date(exam.endDateTime)
  const isAvailable = exam.status === 'AVAILABLE' && !exam.hasAttempt

  return (
    <Card className={isAvailable ? 'border-green-300 shadow-md' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-base">{exam.title}</h3>
              <Badge variant={sc.variant}>
                <Icon className={`h-3 w-3 mr-1 ${sc.color}`} />
                {sc.label}
              </Badge>
              {exam.isRecovery && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Recuperação
                </Badge>
              )}
              {exam.isIndividual && (
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  Agendamento Individual
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Início: {formatDateTime(exam.startDateTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Fim: {formatDateTime(exam.endDateTime)}
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3 w-3" />
                Duração: {exam.durationMinutes} min
              </span>
              {exam.className && (
                <span className="flex items-center gap-1">
                  Turma: {exam.className}
                </span>
              )}
            </div>

            {exam.assignmentNote && (
              <p className="text-xs text-muted-foreground italic mt-2 bg-muted/50 p-2 rounded">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {exam.assignmentNote}
              </p>
            )}

            {exam.hasAttempt && exam.score != null && (
              <div className="mt-3">
                <Badge className={exam.score >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  Nota: {exam.score.toFixed(1)}% {exam.score >= 60 ? '(Aprovado)' : '(Reprovado)'}
                </Badge>
              </div>
            )}

            {/* Countdown para provas agendadas */}
            {exam.status === 'SCHEDULED' && (
              <Countdown startTime={start} />
            )}
          </div>

          {showStartButton && (
            <Link href={`/app/prova/${exam.id}`}>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-1" />
                Iniciar Prova
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Countdown({ startTime }: { startTime: Date }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const diff = startTime.getTime() - now.getTime()
      if (diff <= 0) {
        setRemaining('Disponível agora')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      if (days > 0) {
        setRemaining(`Faltam ${days}d ${hours}h ${minutes}min`)
      } else if (hours > 0) {
        setRemaining(`Faltam ${hours}h ${minutes}min`)
      } else {
        setRemaining(`Faltam ${minutes}min`)
      }
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <p className="text-xs font-medium text-amber-600 mt-2">
      ⏱️ {remaining}
    </p>
  )
}
