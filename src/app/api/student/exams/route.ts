import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

function computeStatus(
  start: Date,
  end: Date,
  hasAttempt: boolean
): 'SCHEDULED' | 'AVAILABLE' | 'COMPLETED' | 'CLOSED' {
  const now = new Date()
  if (hasAttempt) return 'COMPLETED'
  if (now < start) return 'SCHEDULED'
  if (now > end) return 'CLOSED'
  return 'AVAILABLE'
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Busca turmas do aluno
  const memberships = await db.classMember.findMany({
    where: { userId: user.userId },
    select: { classId: true },
  })
  const classIds = memberships.map(m => m.classId)

  // Busca provas das turmas do aluno
  const classExams = await db.exam.findMany({
    where: { classId: { in: classIds }, active: true },
    include: { class: true },
  })

  // Busca atribuições individuais para o aluno
  const individualAssignments = await db.examAssignment.findMany({
    where: { userId: user.userId },
    include: { exam: { include: { class: true } } },
  })

  // Mapa de override de horário por examId (atribuição individual)
  const overrides = new Map<string, { start?: Date; end?: Date; duration?: number }>()
  for (const a of individualAssignments) {
    overrides.set(a.examId, {
      start: a.customStart || undefined,
      end: a.customEnd || undefined,
      duration: a.customDuration || undefined,
    })
  }

  // Junta todos os examIds
  const examMap = new Map<string, typeof classExams[number] & { assignmentNote?: string }>()
  for (const e of classExams) {
    examMap.set(e.id, { ...e, assignmentNote: undefined })
  }
  for (const a of individualAssignments) {
    // Se já existe (prova da turma também tem atribuição individual), mantém mas marca
    examMap.set(a.exam.id, { ...a.exam, assignmentNote: a.notes || 'Prova individual' })
  }

  // Busca tentativas do aluno
  const attempts = await db.examAttempt.findMany({
    where: { userId: user.userId },
    select: { examId: true, score: true, status: true },
  })
  const attemptMap = new Map<string, { score: number | null; status: string }>()
  for (const a of attempts) {
    attemptMap.set(a.examId, { score: a.score, status: a.status })
  }

  const exams = Array.from(examMap.values()).map(e => {
    const ov = overrides.get(e.id)
    const start = ov?.start || e.startDateTime
    const end = ov?.end || e.endDateTime
    const hasAttempt = attemptMap.has(e.id)
    const attempt = attemptMap.get(e.id)
    return {
      id: e.id,
      title: e.title,
      className: e.class?.name || '',
      type: e.type,
      isRecovery: e.isRecovery,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      durationMinutes: ov?.duration || e.durationMinutes,
      status: computeStatus(start, end, hasAttempt),
      hasAttempt,
      score: attempt?.score ?? undefined,
      isIndividual: !!ov,
      assignmentNote: (e as any).assignmentNote,
    }
  })

  // Ordena: disponíveis primeiro, depois agendadas, depois realizadas/encerradas
  const order = { AVAILABLE: 0, SCHEDULED: 1, COMPLETED: 2, CLOSED: 3 }
  exams.sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order])

  return NextResponse.json({ exams })
}
