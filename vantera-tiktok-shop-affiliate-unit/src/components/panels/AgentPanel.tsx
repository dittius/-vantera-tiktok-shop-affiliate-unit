import type { ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { agentDef } from '../../data/agents'
import { formatTime, relativeShort } from '../../utils/time'
import type { AgentStatus } from '../../types'

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  IDLE: { label: 'IDLE', color: '#97a0c9' },
  WORKING: { label: 'WORKING', color: '#35e6c4' },
  WALKING: { label: 'WALKING', color: '#4fa9ff' },
  RELAX: { label: 'RELAX', color: '#ffb648' },
  ERROR: { label: 'ERROR', color: '#ff5470' },
}

export function AgentPanel() {
  const selectedId = useAppStore((s) => s.selectedAgentId)
  const agent = useAppStore((s) => (selectedId ? s.agents[selectedId] : null))
  const selectAgent = useAppStore((s) => s.selectAgent)
  const demoMode = useAppStore((s) => s.demoMode)

  if (!selectedId || !agent) return null
  const def = agentDef(selectedId)
  const meta = STATUS_META[agent.status]
  const statLabel: Record<string, string> = {
    analizzati: 'Prodotti analizzati',
    selezionati: 'Selezionati',
    scartati: 'Scartati',
    formats: 'Format analizzati',
    variants: 'Varianti scritte',
    'render steps': 'Step di rendering',
    checks: 'Controlli compliance',
    metriche: 'Metriche elaborate',
    vincitori: 'Vincitori identificati',
    da_fermare: 'Da interrompere',
    neutri: 'Performance neutra',
    products: 'Prodotti processati',
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Chiudi"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: 'fade-in 160ms ease-out' }}
        onClick={() => selectAgent(null)}
      />
      <div
        className="safe-bottom relative z-10 max-h-[82vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-vantera-line bg-vantera-panel px-5 pb-6 pt-4 shadow-2xl"
        style={{ animation: 'sheet-up 220ms cubic-bezier(.2,.8,.2,1)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-vantera-line" />

        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
            style={{ background: def.colorMain, color: '#0b0e1a' }}
          >
            {def.name
              .split(' ')
              .map((w) => w[0])
              .join('')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-vantera-ink">{def.name}</div>
            <div className="text-xs text-vantera-muted">{def.role}</div>
          </div>
          <button
            onClick={() => selectAgent(null)}
            className="rounded-full bg-vantera-panel-2 px-3 py-1 text-xs text-vantera-muted"
          >
            Chiudi
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: meta.color, animation: agent.status === 'WORKING' ? 'pulse-dot 1.1s infinite' : undefined }}
          />
          <span className="font-pixel text-[10px] tracking-wide" style={{ color: meta.color }}>
            {meta.label}
          </span>
          {!demoMode && (
            <span className="ml-auto rounded-full bg-vantera-panel-2 px-2 py-0.5 text-[9px] text-vantera-muted">
              Demo Mode OFF
            </span>
          )}
        </div>

        <Section title="Current task">
          {agent.currentTask ? (
            <>
              <div className="text-sm text-vantera-ink">{agent.currentTask}</div>
              {agent.progress && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-vantera-panel-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((agent.progress.current / agent.progress.total) * 100)}%`,
                        background: def.colorMain,
                        transition: 'width 300ms ease-out',
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-vantera-muted">
                    Progress {agent.progress.current} / {agent.progress.total}
                  </div>
                </div>
              )}
              <div className="mt-1 text-[11px] text-vantera-muted">
                Started {formatTime(agent.lastUpdate)}
              </div>
            </>
          ) : (
            <div className="text-sm text-vantera-muted">
              Nessun task in corso — {agent.status === 'RELAX' ? 'in pausa nell’area relax.' : 'in attesa.'}
            </div>
          )}
        </Section>

        <Section title="Today">
          {Object.keys(agent.todayStats).length === 0 ? (
            <div className="text-sm text-vantera-muted">Nessuna attività registrata oggi.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(agent.todayStats).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-vantera-panel-2 px-3 py-2">
                  <div className="text-lg font-semibold text-vantera-ink">{v}</div>
                  <div className="text-[10px] text-vantera-muted">{statLabel[k] ?? k}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Ultimi output">
          {agent.lastOutputs.length === 0 ? (
            <div className="text-sm text-vantera-muted">Nessun output ancora.</div>
          ) : (
            <ul className="space-y-1.5">
              {agent.lastOutputs.slice(0, 6).map((o, i) => (
                <li key={i} className="rounded-lg bg-vantera-panel-2 px-3 py-1.5 text-xs text-vantera-ink">
                  {o}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Cronologia">
          {agent.history.length === 0 ? (
            <div className="text-sm text-vantera-muted">Nessuna cronologia.</div>
          ) : (
            <ul className="space-y-1.5">
              {agent.history.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-vantera-ink">{h.label}</span>
                  <span className="shrink-0 text-vantera-muted">{relativeShort(h.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {agent.errors.length > 0 && (
          <Section title="Errori">
            <ul className="space-y-1.5">
              {agent.errors.slice(0, 5).map((e) => (
                <li key={e.id} className="rounded-lg border border-vantera-err/40 bg-vantera-err/10 px-3 py-1.5 text-xs text-vantera-err">
                  {e.message}
                  <span className="ml-2 text-vantera-muted">{relativeShort(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Ambito di lavoro">
          <div className="flex flex-wrap gap-1.5">
            {def.scope.map((s) => (
              <span key={s} className="rounded-full bg-vantera-panel-2 px-2.5 py-1 text-[10px] text-vantera-muted">
                {s}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 font-pixel text-[9px] uppercase tracking-wider text-vantera-muted">{title}</div>
      {children}
    </div>
  )
}
