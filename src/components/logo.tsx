import { cn } from '@/lib/utils'

export function Logo({ className, showText = true, light = false }: { className?: string; showText?: boolean; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Onda estilizada + folha (oceano verde) */}
        <circle cx="24" cy="24" r="22" fill="#0A5C36" />
        <path d="M6 30 Q12 24 18 30 T30 30 T42 30" stroke="#5BA888" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M6 34 Q12 28 18 34 T30 34 T42 34" stroke="#2E8B57" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M24 10 C30 14 32 20 28 26 C26 23 24 20 24 16 C24 20 22 23 20 26 C16 20 18 14 24 10Z" fill="#F4F7F6" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('text-base font-bold tracking-tight', light ? 'text-white' : 'text-primary')}>
            Ocean Green
          </span>
          <span className={cn('text-[10px] font-medium uppercase tracking-widest', light ? 'text-white/70' : 'text-muted-foreground')}>
            Treinamentos
          </span>
        </div>
      )}
    </div>
  )
}
