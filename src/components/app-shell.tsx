'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Menu, LogOut, Loader2, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface AppUser {
  userId: string
  name: string
  cpf: string
  role: 'ADMIN' | 'STUDENT'
}

export function AppShell({
  children,
  navItems,
  dashboardHref,
  title,
  homeHref,
}: {
  children: React.ReactNode
  navItems: NavItem[]
  dashboardHref: string
  title: string
  homeHref: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) {
          router.replace(homeHref)
          return
        }
        setUser(data.user)
      })
      .catch(() => router.replace(homeHref))
      .finally(() => setLoading(false))
  }, [router, homeHref])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sessão encerrada')
    router.replace(homeHref)
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Logo light />
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-lg bg-white/10 p-3">
          <p className="text-xs font-medium text-white/60">Logado como</p>
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-white/50">CPF: {user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 ocean-gradient lg:block">
        {SidebarContent}
      </aside>

      {/* Sidebar mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0 ocean-gradient">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <Logo />
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <footer className="mt-auto border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ocean Green Treinamentos — {title}
        </footer>
      </div>
    </div>
  )
}
