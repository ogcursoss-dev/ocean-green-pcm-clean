'use client'

import { AppShell, type NavItem } from '@/components/app-shell'
import { LayoutDashboard, Users, GraduationCap, BookOpenText, ClipboardList, FileBarChart2 } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'

const navItems: NavItem[] = [
  { href: '/app/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/app/admin/turmas', label: 'Turmas', icon: GraduationCap },
  { href: '/app/admin/questoes', label: 'Banco de Questões', icon: BookOpenText },
  { href: '/app/admin/provas', label: 'Provas e Avaliações', icon: ClipboardList },
  { href: '/app/admin/relatorios', label: 'Relatórios', icon: FileBarChart2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell
        navItems={navItems}
        dashboardHref="/app/admin"
        title="Painel Administrativo"
        homeHref="/"
      >
        {children}
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  )
}
