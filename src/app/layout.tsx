import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Ocean Green Treinamentos | Sistema PCM",
  description: "Plataforma de simulados e avaliações para Planejamento e Controle da Manutenção",
  keywords: ["PCM", "Manutenção", "Simulados", "Ocean Green", "Treinamentos"],
  authors: [{ name: "Ocean Green Treinamentos" }],
}

// Força renderização dinâmica (evita SSG/prerender que causa erro no _global-error)
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
