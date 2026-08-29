import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const simulations = await db.simulation.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      questionCount: true,
      score: true,
      createdAt: true,
      timeSpentSeconds: true,
    },
  })

  return NextResponse.json({ simulations })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { subjectIds, difficulty, questionCount } = await req.json()
  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma disciplina' }, { status: 400 })
  }
  const count = Math.min(Math.max(parseInt(questionCount) || 20, 5), 100)

  // Busca questões conforme filtros
  const where: any = { subjectId: { in: subjectIds }, active: true }
  if (difficulty && difficulty !== 'MIXED') {
    where.difficulty = difficulty
  }
  const allQuestions = await db.question.findMany({
    where,
    select: { id: true },
  })

  if (allQuestions.length === 0) {
    return NextResponse.json({ error: 'Nenhuma questão encontrada para os filtros selecionados' }, { status: 404 })
  }

  // Sorteia questões aleatoriamente
  const shuffled = allQuestions.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(count, shuffled.length))

  const simulation = await db.simulation.create({
    data: {
      userId: user.userId,
      subjectIds: JSON.stringify(subjectIds),
      difficulty: difficulty || null,
      questionCount: selected.length,
      questionIds: JSON.stringify(selected.map(q => q.id)),
      answers: JSON.stringify([]),
    },
  })

  return NextResponse.json({ simulationId: simulation.id })
}
