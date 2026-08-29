'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UserCircle, LogIn } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { maskCpf, cleanCpf } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verifica se já está logado
    fetch('/api/me').then(r => r.json()).then(data => {
      if (data.user) {
        router.replace(data.user.role === 'ADMIN' ? '/app/admin' : '/app/aluno')
      } else {
        setChecking(false)
      }
    }).catch(() => setChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cpf || cleanCpf(cpf).length !== 11) {
      toast.error('CPF inválido. Digite os 11 dígitos.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf(cpf) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao entrar')
      toast.success(`Bem-vindo(a), ${data.name}!`)
      router.replace(data.role === 'ADMIN' ? '/app/admin' : '/app/aluno')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#7CB342]" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 30%, #0D47A1 75%, #00ACC1 100%)' }}>
      {/* Ondas decorativas inspiradas na logo */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '50%' }}>
          <path fill="#0D47A1" fillOpacity="0.6" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L0,320Z" />
          <path fill="#00ACC1" fillOpacity="0.5" d="M0,256L48,266.7C96,277,192,299,288,288C384,277,480,235,576,218.7C672,203,768,213,864,224C960,235,1056,245,1152,240C1248,235,1344,213,1392,202.7L1440,192L1440,320L0,320Z" />
          <path fill="#D4E157" fillOpacity="0.4" d="M0,288L48,277.3C96,267,192,245,288,240C384,235,480,245,576,250.7C672,256,768,256,864,250.7C960,245,1056,235,1152,234.7C1248,235,1344,245,1392,250.7L1440,256L1440,320L0,320Z" />
        </svg>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Logo + Nome da escola */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur-md shadow-lg">
            <img
              src="/logo-ocean-green.jpg"
              alt="Ocean Green Treinamentos"
              className="h-16 w-16 rounded-xl object-cover shadow-md sm:h-20 sm:w-20"
            />
            <div className="flex flex-col leading-none text-left">
              <span className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Ocean Green
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/80 sm:text-sm">
                Treinamentos
              </span>
            </div>
          </div>
          <p className="max-w-md text-sm font-medium text-white/90">
            Plataforma de Simulados e Avaliações — Planejamento e Controle da Manutenção
          </p>
        </div>

        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl" style={{ color: '#0D47A1' }}>
              Acesso ao Sistema
            </CardTitle>
            <CardDescription>
              Entre com seu CPF para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    className="pl-9 text-lg font-medium tracking-wide"
                    maxLength={14}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || cleanCpf(cpf).length !== 11}
                className="w-full text-white shadow-md"
                style={{ backgroundColor: '#7CB342' }}
                size="lg"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="relative z-10 mt-8 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Ocean Green Treinamentos — Todos os direitos reservados
        </p>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
