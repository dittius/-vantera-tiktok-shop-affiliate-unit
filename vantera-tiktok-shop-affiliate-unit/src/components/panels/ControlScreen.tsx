import { useMemo, type ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { ScreenShell } from '../ui/ScreenShell'
import { AGENT_ORDER, agentDef } from '../../data/agents'

const TIKTOK_LABEL: Record<string, string> = {
  NOT_CONNECTED: 'NOT CONNECTED',
  CONNECTED: 'CONNECTED',
  DEMO: 'DEMO',
}
const TIKTOK_COLOR: Record<string, string> = {
  NOT_CONNECTED: '#97a0c9',
  CONNECTED: '#35e6c4',
  DEMO: '#ffb648',
}

export function ControlScreen() {
  const running = useAppStore((s) => s.running)
  const demoMode = useAppStore((s) => s.demoMode)
  const tiktokStatus = useAppStore((s) => s.tiktokStatus)
  const agents = useAppStore((s) => s.agents)
  const tasks = useAppStore((s) => s.tasks)
  const videos = useAppStore((s) => s.videos)
  const publications = useAppStore((s) => s.publications)
  const activityLog = useAppStore((s) => s.activityLog)
  const setRunning = useAppStore((s) => s.setRunning)
  const setDemoMode = useAppStore((s) => s.setDemoMode)

  const agentsActive = useMemo(
    () => AGENT_ORDER.filter((id) => agents[id].status === 'WORKING' || agents[id].status === 'WALKING').length,
    [agents],
  )
  const tasksRunning = useMemo(() => tasks.filter((t) => t.status === 'IN_PROGRESS').length, [tasks])
  const contentQueue = Math.max(0, videos.length - publications.length)

  return (
    <ScreenShell title="CONTROL" subtitle="Governance dell'unit" accent="#7c5cff">
      <button
        onClick={() => setRunning(!running)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left shadow-lg"
        style={{
          background: running
            ? 'linear-gradient(135deg,#ff2f6e,#c81f52)'
            : 'linear-gradient(135deg,#35e6c4,#1fae95)',
        }}
      >
        <div>
          <div className="font-pixel text-[10px] tracking-wide text-black/70">
            {running ? 'UNIT ATTIVA' : 'UNIT IN PAUSA'}
          </div>
          <div className="mt-1 text-lg font-bold text-black">{running ? 'PAUSE UNIT' : 'START UNIT'}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/15 text-xl text-black">
          {running ? '❚❚' : '▶'}
        </div>
      </button>

      <div className="mt-5 rounded-2xl border border-vantera-line bg-vantera-panel px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-vantera-ink">DEMO MODE</div>
            <div className="text-[11px] text-vantera-muted">
              Simula task, animazioni, mail e statistiche — tutto etichettato DEMO.
            </div>
          </div>
          <Toggle checked={demoMode} onChange={setDemoMode} />
        </div>
        {demoMode && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-vantera-warn/10 px-2.5 py-1.5 text-[10px] text-vantera-warn">
            <span className="rounded-full bg-vantera-warn/20 px-1.5 py-0.5 font-bold">DEMO</span>
            Nessun dato commerciale reale — solo simulazione dell'interfaccia.
          </div>
        )}
      </div>

      <Section title="System status">
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Agents active" value={`${agentsActive} / 6`} color="#35e6c4" />
          <Metric label="Tasks running" value={String(tasksRunning)} color="#4fa9ff" />
          <Metric label="Content queue" value={String(contentQueue)} color="#ffb648" />
          <Metric label="Unit" value={running ? 'RUNNING' : 'PAUSED'} color={running ? '#35e6c4' : '#97a0c9'} />
        </div>
      </Section>

      <Section title="TikTok Shop connection">
        <div className="flex items-center justify-between rounded-xl bg-vantera-panel px-4 py-3">
          <div>
            <div className="text-sm text-vantera-ink">Stato connessione</div>
            <div className="text-[11px] text-vantera-muted">
              {tiktokStatus === 'NOT_CONNECTED'
                ? 'Nessuna credenziale API configurata.'
                : tiktokStatus === 'DEMO'
                  ? 'MockTikTokShopProvider attivo (solo Demo Mode).'
                  : 'RealTikTokShopProvider connesso.'}
            </div>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: `${TIKTOK_COLOR[tiktokStatus]}22`, color: TIKTOK_COLOR[tiktokStatus] }}
          >
            {TIKTOK_LABEL[tiktokStatus]}
          </span>
        </div>
      </Section>

      <Section title="Agenti">
        <div className="space-y-1.5">
          {AGENT_ORDER.map((id) => {
            const a = agents[id]
            const def = agentDef(id)
            return (
              <div key={id} className="flex items-center justify-between rounded-lg bg-vantera-panel px-3 py-2 text-xs">
                <span className="text-vantera-ink">{def.name}</span>
                <span className="text-vantera-muted">{a.status}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Activity log">
        {activityLog.length === 0 ? (
          <div className="rounded-lg bg-vantera-panel px-3 py-2 text-xs text-vantera-muted">
            Nessun evento registrato.
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {activityLog.slice(0, 30).map((e) => (
              <div key={e.id} className="rounded-lg bg-vantera-panel px-3 py-1.5 text-[11px] text-vantera-muted">
                <span className="text-vantera-ink/80">{new Date(e.timestamp).toLocaleTimeString('it-IT')}</span>{' '}
                {e.message}
                {e.isDemo && <span className="ml-1.5 text-vantera-warn">(demo)</span>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </ScreenShell>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-1.5 font-pixel text-[9px] uppercase tracking-wider text-vantera-muted">{title}</div>
      {children}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-vantera-panel px-3 py-2.5">
      <div className="text-lg font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-vantera-muted">{label}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? '#ffb648' : '#2b3358' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: checked ? 26 : 4 }}
      />
    </button>
  )
}
