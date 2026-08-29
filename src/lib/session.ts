import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { createSessionToken, getSessionCookieName, verifySessionToken, type SessionPayload } from '@/lib/auth'

export async function createSession(user: {
  id: string
  cpf: string
  name: string
  role: string
}) {
  const payload: SessionPayload = {
    userId: user.id,
    cpf: user.cpf,
    name: user.name,
    role: user.role as 'ADMIN' | 'STUDENT',
  }
  const token = createSessionToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(getSessionCookieName())
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value
  if (!token) return null
  const payload = verifySessionToken(token)
  if (!payload) return null
  // Verifica se o usuário ainda está ativo no banco
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, active: true, role: true },
  })
  if (!user || !user.active) return null
  return { ...payload, role: user.role as 'ADMIN' | 'STUDENT' }
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return null
  }
  return user
}

export async function requireStudent() {
  const user = await getCurrentUser()
  if (!user) return null
  return user
}
