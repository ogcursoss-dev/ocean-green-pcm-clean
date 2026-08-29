import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'ocean-green-pcm-secret-change-in-production-2024'
const SESSION_COOKIE = 'og_session'

export interface SessionPayload {
  userId: string
  cpf: string
  name: string
  role: 'ADMIN' | 'STUDENT'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload
    return decoded
  } catch {
    return null
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}

// Remove máscara do CPF, mantendo apenas dígitos
export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

// Aplica máscara de CPF: 000.000.000-00
export function maskCpf(cpf: string): string {
  const digits = cleanCpf(cpf).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// Validação básica de CPF (11 dígitos)
export function isValidCpf(cpf: string): boolean {
  const digits = cleanCpf(cpf)
  return digits.length === 11
}
