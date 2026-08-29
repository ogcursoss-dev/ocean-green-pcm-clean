import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [students, classes, questions, exams, attempts, simulations] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.class.count(),
    db.question.count(),
    db.exam.count(),
    db.examAttempt.count({ where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } } }),
    db.simulation.count(),
  ])

  return NextResponse.json({ students, classes, questions, exams, attempts, simulations })
}
