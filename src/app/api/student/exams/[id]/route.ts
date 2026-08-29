import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const exam = await db.exam.findUnique({
    where: { id },
    include: { class: true, assignments: true },
  })
  if (!exam) return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 })

  // Verifica acesso: turma do aluno OU atribuição individual
  const membership = await db.classMember.findFirst({
    where: { userId: user.userId, classId: exam.classId },
  })
  const individualAssignment = exam.assignments.find((a) => a.userId === user.userId)

  if (!membership && !individualAssignment) {
    return NextResponse.json({ error: 'Você não tem acesso a esta prova' }, { status: 403 })
  }

  // Determina janela temporal (override individual se existir)
  const start = individualAssignment?.customStart || exam.startDateTime
  const end = individualAssignment?.customEnd || exam.endDateTime
  const duration = individualAssignment?.customDuration || exam.durationMinutes
  const now = new Date()

  if (now < start) {
    return NextResponse.json({
      error: 'Esta prova ainda não está disponível',
      status: 'SCHEDULED',
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    }, { status: 403 })
  }
  if (now > end) {
    return NextResponse.json({
      error: 'O período desta prova foi encerrado',
      status: 'CLOSED',
    }, { status: 403 })
  }

  // Verifica se já submeteu
  const attempt = await db.examAttempt.findUnique({
    where: { examId_userId: { examId: exam.id, userId: user.userId } },
  })
  if (attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED')) {
    return NextResponse.json({
      error: 'Você já realizou esta prova',
      status: 'COMPLETED',
      score: attempt.score,
    }, { status: 403 })
  }

  // ===== QUESTÕES: usa as sorteadas para este aluno (randomização) =====
  let questionIds: string[] = []
  if (attempt?.questionIds) {
    questionIds = JSON.parse(attempt.questionIds)
  } else if (exam.questions && exam.questions.length > 0) {
    // Fallback: questões fixas vinculadas ao exam
    const eqs = await db.examQuestion.findMany({
      where: { examId: exam.id },
      orderBy: { order: 'asc' },
      select: { questionId: true },
    })
    questionIds = eqs.map(e => e.questionId)
  }

  if (questionIds.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma questão configurada. Inicie a prova para sortear as questões.',
      needStart: true,
    }, { status: 400 })
  }

  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
    include: { subject: true },
  })
  // Mantém ordem sorteada
  const orderedQuestions = questionIds
    .map(qid => questions.find(q => q.id === qid))
    .filter(Boolean) as typeof questions

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      className: exam.class?.name || '',
      isRecovery: exam.isRecovery,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      durationMinutes: duration,
      passingScore: exam.passingScore,
      questionCount: orderedQuestions.length,
    },
    questions: orderedQuestions.map((q, idx) => ({
      id: q.id,
      order: idx + 1,
      statement: q.statement,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      subjectName: q.subject.name,
    })),
    existingAnswers: attempt ? JSON.parse(attempt.answers) : [],
    startedAt: attempt?.startedAt || null,
    attemptId: attempt?.id || null,
  })
}
