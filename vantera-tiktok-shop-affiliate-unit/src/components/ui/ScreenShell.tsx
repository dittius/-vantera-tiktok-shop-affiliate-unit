import type { ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'

export function ScreenShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  accent: string
  children: ReactNode
}) {
  const setScreen = useAppStore((s) => s.setScreen)
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-vantera-bg" style={{ animation: 'fade-in 160ms ease-out' }}>
      <div className="safe-top flex items-center gap-3 border-b border-vantera-line px-4 pb-3 pt-3">
        <button
          onClick={() => setScreen('office')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-vantera-panel-2 text-vantera-ink"
          aria-label="Torna all'ufficio"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-[11px] tracking-wide" style={{ color: accent }}>
            {title}
          </div>
          {subtitle && <div className="truncate text-xs text-vantera-muted">{subtitle}</div>}
        </div>
      </div>
      <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-6 pt-3">{children}</div>
    </div>
  )
}
