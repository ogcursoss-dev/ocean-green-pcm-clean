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
  const simulation = await db.simulation.findUnique({
    where: { id },
  })
  if (!simulation || simulation.userId !== user.userId) {
    return NextResponse.json({ error: 'Simulado não encontrado' }, { status: 404 })
  }

  const questionIds: string[] = JSON.parse(simulation.questionIds)
  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
    include: { subject: true },
  })
  // Mantém ordem original
  const orderedQuestions = questionIds
    .map(qid => questions.find(q => q.id === qid))
    .filter(Boolean) as typeof questions

  const answers: { questionId: string; selected: string }[] = JSON.parse(simulation.answers)

  return NextResponse.json({
    simulation: {
      id: simulation.id,
      questionCount: simulation.questionCount,
      score: simulation.score,
      createdAt: simulation.createdAt,
      submittedAt: simulation.submittedAt,
      timeSpentSeconds: simulation.timeSpentSeconds,
    },
    questions: orderedQuestions.map(q => ({
      id: q.id,
      statement: q.statement,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      subjectName: q.subject.name,
    })),
    answers,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Submeter simulado
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const simulation = await db.simulation.findUnique({ where: { id } })
  if (!simulation || simulation.userId !== user.userId) {
    return NextResponse.json({ error: 'Simulado não encontrado' }, { status: 404 })
  }

  const { answers, timeSpentSeconds } = await req.json()
  const parsedAnswers: { questionId: string; selected: string }[] = answers || []

  const questionIds: string[] = JSON.parse(simulation.questionIds)
  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, correctAnswer: true, explanation: true },
  })

  let correct = 0
  const results = questions.map(q => {
    const ans = parsedAnswers.find(a => a.questionId === q.id)
    const isCorrect = ans?.selected === q.correctAnswer
    if (isCorrect) correct++
    return {
      questionId: q.id,
      selected: ans?.selected || null,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    }
  })

  const total = questions.length
  const score = total > 0 ? (correct / total) * 100 : 0

  await db.simulation.update({
    where: { id },
    data: {
      answers: JSON.stringify(parsedAnswers),
      score,
      correctCount: correct,
      timeSpentSeconds: timeSpentSeconds || null,
      submittedAt: new Date(),
    },
  })

  return NextResponse.json({ score, correctCount: correct, totalCount: total, results })
}
