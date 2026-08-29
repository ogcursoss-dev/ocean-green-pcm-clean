import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cleanCpf } from '@/lib/auth'
import { createSession } from '@/lib/session'

// Login apenas por CPF (sem senha)
export async function POST(req: NextRequest) {
  try {
    const { cpf } = await req.json()
    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 })
    }
    const cleanCpfValue = cleanCpf(cpf)
    if (cleanCpfValue.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido. Informe os 11 dígitos.' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { cpf: cleanCpfValue } })
    if (!user) {
      return NextResponse.json({ error: 'CPF não cadastrado no sistema' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Seu acesso está inativo. Contate o administrador.' }, { status: 403 })
    }
    await createSession({ id: user.id, cpf: user.cpf, name: user.name, role: user.role })
    return NextResponse.json({
      ok: true,
      userId: user.id,
      name: user.name,
      role: user.role,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 })
  }
}
