import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { ScreenShell } from '../ui/ScreenShell'
import { agentDef } from '../../data/agents'
import { formatDayLabel, formatTime } from '../../utils/time'
import type { InternalMail } from '../../types'

export function MailScreen() {
  const mail = useAppStore((s) => s.mail)
  const markMailRead = useAppStore((s) => s.markMailRead)
  const markAllMailRead = useAppStore((s) => s.markAllMailRead)
  const demoMode = useAppStore((s) => s.demoMode)
  const [openId, setOpenId] = useState<string | null>(null)

  const unread = mail.filter((m) => !m.read).length

  const grouped = useMemo(() => {
    const map = new Map<string, InternalMail[]>()
    for (const m of mail) {
      const key = formatDayLabel(m.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return Array.from(map.entries())
  }, [mail])

  const open = mail.find((m) => m.id === openId) ?? null

  return (
    <ScreenShell title="MAIL" subtitle={`Casella interna · ${unread} non lette`} accent="#ff2f6e">
      {!demoMode && mail.length === 0 && (
        <div className="mb-4 rounded-xl border border-vantera-line bg-vantera-panel px-4 py-3 text-xs text-vantera-muted">
          Nessun report ancora. I 6 agenti inviano un Daily Report a fine giornata operativa —
          attiva DEMO MODE in Control per vedere l'unit lavorare e generare i primi report.
        </div>
      )}

      {mail.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button onClick={markAllMailRead} className="text-xs text-vantera-muted underline">
            segna tutte come lette
          </button>
        </div>
      )}

      {grouped.map(([day, items]) => (
        <div key={day} className="mb-4">
          <div className="mb-1.5 font-pixel text-[9px] tracking-wide text-vantera-muted">{day}</div>
          <div className="space-y-2">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setOpenId(m.id)
                  markMailRead(m.id)
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-vantera-line bg-vantera-panel px-3 py-2.5 text-left"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                  style={{ background: agentColor(m), color: '#0b0e1a' }}
                >
                  {m.fromName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-vantera-ink">{m.fromName}</span>
                    {!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vantera-accent" />}
                    {m.isDemo && (
                      <span className="ml-auto shrink-0 rounded-full bg-vantera-warn/20 px-1.5 py-0.5 text-[9px] font-semibold text-vantera-warn">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs font-medium text-vantera-ink/90">{m.subject}</div>
                  <div className="truncate text-[11px] text-vantera-muted">{m.body.split('\n')[0]}</div>
                </div>
                <div className="shrink-0 text-[10px] text-vantera-muted">{formatTime(m.timestamp)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button className="absolute inset-0 bg-black/55" onClick={() => setOpenId(null)} />
          <div className="safe-bottom relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-vantera-line bg-vantera-panel px-5 pb-6 pt-4" style={{ animation: 'sheet-up 200ms ease-out' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-vantera-line" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-vantera-ink">{open.subject}</div>
                <div className="text-xs text-vantera-muted">
                  {open.fromName} · {senderLabelFor(open)}
                </div>
              </div>
              {open.isDemo && (
                <span className="shrink-0 rounded-full bg-vantera-warn/20 px-2 py-0.5 text-[9px] font-semibold text-vantera-warn">
                  DEMO
                </span>
              )}
            </div>
            <div className="mt-4 whitespace-pre-line rounded-xl bg-vantera-panel-2 px-3 py-3 text-sm text-vantera-ink">
              {open.body}
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="mt-4 w-full rounded-xl bg-vantera-panel-2 py-2.5 text-sm text-vantera-muted"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </ScreenShell>
  )
}

function agentColor(m: InternalMail): string {
  if (m.fromAgentId === 'system') return '#97a0c9'
  try {
    return agentDef(m.fromAgentId).colorMain
  } catch {
    return '#97a0c9'
  }
}

function senderLabelFor(m: InternalMail): string {
  if (m.fromAgentId === 'system') return 'system@unit.internal'
  try {
    return agentDef(m.fromAgentId).senderLabel
  } catch {
    return 'system@unit.internal'
  }
}
