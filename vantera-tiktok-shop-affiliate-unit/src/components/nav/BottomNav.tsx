import { useAppStore } from '../../store/useAppStore'
import type { Screen } from '../../store/useAppStore'

const ITEMS: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'mail', label: 'MAIL', icon: '✉' },
  { screen: 'earnings', label: 'EARNINGS', icon: '€' },
  { screen: 'control', label: 'CONTROL', icon: '⏻' },
]

export function BottomNav() {
  const setScreen = useAppStore((s) => s.setScreen)
  const mail = useAppStore((s) => s.mail)
  const running = useAppStore((s) => s.running)
  const demoMode = useAppStore((s) => s.demoMode)
  const unread = mail.filter((m) => !m.read).length

  return (
    <div className="safe-bottom safe-left safe-right pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-3">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-vantera-line bg-vantera-panel/95 p-1.5 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-1.5 pl-2 pr-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: running ? '#35e6c4' : '#ff5470', animation: running ? 'pulse-dot 1.4s infinite' : undefined }}
          />
          {demoMode && (
            <span className="rounded-full bg-vantera-warn/20 px-1.5 py-0.5 text-[8px] font-bold text-vantera-warn">
              DEMO
            </span>
          )}
        </div>
        {ITEMS.map((item) => (
          <button
            key={item.screen}
            onClick={() => setScreen(item.screen)}
            className="relative flex min-w-[76px] flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-vantera-ink active:bg-vantera-panel-2"
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="font-pixel text-[8px] tracking-wide">{item.label}</span>
            {item.screen === 'mail' && unread > 0 && (
              <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vantera-accent px-1 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
