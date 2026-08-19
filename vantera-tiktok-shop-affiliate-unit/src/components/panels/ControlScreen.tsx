import { useMemo, useState, type ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useRealStore } from '../../store/useRealStore'
import { ScreenShell } from '../ui/ScreenShell'
import { AGENT_ORDER, agentDef } from '../../data/agents'
import * as github from '../../integrations/github/client'
import { relativeShort } from '../../utils/time'

const TIKTOK_LABEL: Record<string, string> = {
  NOT_CONNECTED: 'NOT CONNECTED',
  CONNECTED: 'CONNECTED',
  TOKEN_EXPIRED: 'TOKEN EXPIRED',
  ERROR: 'ERROR',
  DEMO: 'DEMO',
}
const TIKTOK_COLOR: Record<string, string> = {
  NOT_CONNECTED: '#97a0c9',
  CONNECTED: '#35e6c4',
  TOKEN_EXPIRED: '#ffb648',
  ERROR: '#ff5470',
  DEMO: '#ffb648',
}

export function ControlScreen() {
  const demoMode = useAppStore((s) => s.demoMode)
  const setDemoMode = useAppStore((s) => s.setDemoMode)

  // --- demo-path state (unchanged local simulation) ---
  const demoRunning = useAppStore((s) => s.running)
  const demoTiktokStatus = useAppStore((s) => s.tiktokStatus)
  const demoAgents = useAppStore((s) => s.agents)
  const demoTasks = useAppStore((s) => s.tasks)
  const demoVideos = useAppStore((s) => s.videos)
  const demoPublications = useAppStore((s) => s.publications)
  const demoActivityLog = useAppStore((s) => s.activityLog)
  const setDemoRunning = useAppStore((s) => s.setRunning)

  // --- real-path state ---
  const real = useRealStore()
  const [ghToken, setGhToken] = useState('')
  const [ghBusy, setGhBusy] = useState(false)
  const [ghError, setGhError] = useState<string | null>(null)
  const [connected, setConnected] = useState(github.isConnected())
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const running = demoMode ? demoRunning : real.control.running
  const tiktokStatus = demoMode ? demoTiktokStatus : real.control.tiktokStatus
  const activityLog = demoMode ? demoActivityLog : real.activityLog

  const agentsActive = useMemo(() => {
    if (demoMode) return AGENT_ORDER.filter((id) => demoAgents[id].status === 'WORKING' || demoAgents[id].status === 'WALKING').length
    return AGENT_ORDER.filter((id) => real.agents?.[id]?.status === 'WORKING').length
  }, [demoMode, demoAgents, real.agents])

  const tasksRunning = useMemo(() => {
    if (demoMode) return demoTasks.filter((t) => t.status === 'IN_PROGRESS').length
    return real.tasks.filter((t) => t.status === 'IN_PROGRESS').length
  }, [demoMode, demoTasks, real.tasks])

  const contentQueue = demoMode
    ? Math.max(0, demoVideos.length - demoPublications.length)
    : real.publications.filter((p) => p.status === 'PENDING_HUMAN_ACTION').length

  async function connectGithub() {
    setGhBusy(true)
    setGhError(null)
    try {
      await github.verifyToken(ghToken)
      github.setToken(ghToken)
      setConnected(true)
      setGhToken('')
      await real.fetchAll()
    } catch (err) {
      setGhError(err instanceof Error ? err.message : String(err))
    } finally {
      setGhBusy(false)
    }
  }

  function disconnectGithub() {
    github.clearToken()
    setConnected(false)
  }

  async function toggleRunning() {
    if (demoMode) {
      setDemoRunning(!running)
      return
    }
    setActionBusy('running')
    setActionError(null)
    try {
      await github.writeTable('control', (c) => ({ ...(c as object), running: !running }))
      await real.fetchAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function emergencyStop() {
    if (demoMode) return
    setActionBusy('estop')
    setActionError(null)
    try {
      await github.writeTable('control', (c) => ({ ...(c as object), running: false, emergencyStop: true }))
      await real.fetchAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function clearEmergencyStop() {
    setActionBusy('clear-estop')
    setActionError(null)
    try {
      await github.writeTable('control', (c) => ({ ...(c as object), emergencyStop: false }))
      await real.fetchAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function runNow() {
    setActionBusy('run-now')
    setActionError(null)
    try {
      await github.triggerCycleNow()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <ScreenShell title="CONTROL" subtitle="Governance dell'unit" accent="#7c5cff">
      <button
        onClick={toggleRunning}
        disabled={actionBusy === 'running' || (!demoMode && real.control.emergencyStop)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left shadow-lg disabled:opacity-50"
        style={{
          background: running ? 'linear-gradient(135deg,#ff2f6e,#c81f52)' : 'linear-gradient(135deg,#35e6c4,#1fae95)',
        }}
      >
        <div>
          <div className="font-pixel text-[10px] tracking-wide text-black/70">{running ? 'UNIT ATTIVA' : 'UNIT IN PAUSA'}</div>
          <div className="mt-1 text-lg font-bold text-black">
            {actionBusy === 'running' ? '...' : running ? 'PAUSE UNIT' : 'START UNIT'}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/15 text-xl text-black">
          {running ? '❚❚' : '▶'}
        </div>
      </button>

      {!demoMode && real.control.emergencyStop && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-vantera-err/40 bg-vantera-err/10 px-4 py-3">
          <span className="text-xs text-vantera-err">EMERGENCY STOP attivo — l'unit non eseguirà cicli finché non lo disattivi.</span>
          <button onClick={clearEmergencyStop} disabled={actionBusy === 'clear-estop'} className="shrink-0 rounded-full bg-vantera-err/20 px-3 py-1 text-[10px] font-bold text-vantera-err">
            Disattiva
          </button>
        </div>
      )}

      {!demoMode && (
        <button
          onClick={emergencyStop}
          disabled={actionBusy === 'estop' || real.control.emergencyStop}
          className="mt-3 w-full rounded-xl border border-vantera-err/40 py-2 text-xs font-semibold text-vantera-err disabled:opacity-40"
        >
          EMERGENCY STOP
        </button>
      )}

      {actionError && <div className="mt-3 rounded-lg bg-vantera-err/10 px-3 py-2 text-[11px] text-vantera-err">{actionError}</div>}

      <div className="mt-5 rounded-2xl border border-vantera-line bg-vantera-panel px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-vantera-ink">DEMO MODE</div>
            <div className="text-[11px] text-vantera-muted">Simula task, animazioni, mail e statistiche — tutto etichettato DEMO.</div>
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

      <Section title="GitHub — canale di controllo">
        <div className="rounded-xl bg-vantera-panel px-4 py-3">
          {connected ? (
            <div className="flex items-center justify-between">
              <div className="text-xs text-vantera-muted">
                Connesso. Puoi avviare/mettere in pausa l'unit e leggere lo stato reale.
              </div>
              <button onClick={disconnectGithub} className="shrink-0 rounded-full bg-vantera-panel-2 px-3 py-1 text-[10px] text-vantera-muted">
                Disconnetti
              </button>
            </div>
          ) : (
            <div>
              <div className="text-xs text-vantera-muted">
                Per avviare/mettere in pausa l'unit da questa app serve un Personal Access Token
                GitHub (fine-grained), scoped SOLO a questo repository, permessi Contents:
                Read&amp;write e Actions: Read&amp;write. Resta salvato solo in questo browser.
              </div>
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="github_pat_..."
                className="mt-2.5 w-full rounded-lg border border-vantera-line bg-vantera-bg px-3 py-2 text-xs text-vantera-ink outline-none"
              />
              {ghError && <div className="mt-1.5 text-[11px] text-vantera-err">{ghError}</div>}
              <button
                onClick={connectGithub}
                disabled={ghBusy || !ghToken.trim()}
                className="mt-2.5 w-full rounded-lg bg-vantera-accent-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {ghBusy ? 'Verifica...' : 'Connetti GitHub'}
              </button>
            </div>
          )}
        </div>
        {!demoMode && connected && (
          <button
            onClick={runNow}
            disabled={actionBusy === 'run-now'}
            className="mt-2 w-full rounded-xl bg-vantera-panel-2 py-2 text-xs text-vantera-ink disabled:opacity-40"
          >
            {actionBusy === 'run-now' ? 'Avvio...' : '▶ Esegui un ciclo ora'}
          </button>
        )}
      </Section>

      <Section title="System status">
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Agents active" value={`${agentsActive} / 6`} color="#35e6c4" />
          <Metric label="Tasks running" value={String(tasksRunning)} color="#4fa9ff" />
          <Metric label="Content queue" value={String(contentQueue)} color="#ffb648" />
          <Metric label="Unit" value={running ? 'RUNNING' : 'PAUSED'} color={running ? '#35e6c4' : '#97a0c9'} />
        </div>
        {!demoMode && (
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <Metric label="Cycles completed" value={String(real.control.cyclesCompleted)} color="#7c5cff" />
            <Metric
              label="Last heartbeat"
              value={real.control.lastHeartbeat ? relativeShort(Date.parse(real.control.lastHeartbeat)) : 'N/A'}
              color="#97a0c9"
            />
          </div>
        )}
      </Section>

      <Section title="TikTok Shop connection">
        <div className="flex items-center justify-between rounded-xl bg-vantera-panel px-4 py-3">
          <div className="min-w-0 flex-1 pr-3">
            <div className="text-sm text-vantera-ink">Stato connessione</div>
            <div className="text-[11px] text-vantera-muted">
              {demoMode
                ? 'MockTikTokShopProvider attivo (solo Demo Mode).'
                : real.control.tiktokActionRequired ?? 'RealTikTokShopProvider connesso.'}
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: `${TIKTOK_COLOR[tiktokStatus] ?? '#97a0c9'}22`, color: TIKTOK_COLOR[tiktokStatus] ?? '#97a0c9' }}
          >
            {demoMode ? 'DEMO' : (TIKTOK_LABEL[tiktokStatus] ?? tiktokStatus)}
          </span>
        </div>
      </Section>

      <Section title="Agenti">
        <div className="space-y-1.5">
          {AGENT_ORDER.map((id) => {
            const def = agentDef(id)
            const status = demoMode ? demoAgents[id].status : (real.agents?.[id]?.status ?? 'IDLE')
            return (
              <div key={id} className="flex items-center justify-between rounded-lg bg-vantera-panel px-3 py-2 text-xs">
                <span className="text-vantera-ink">{def.name}</span>
                <span className="text-vantera-muted">{status}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Activity log">
        {activityLog.length === 0 ? (
          <div className="rounded-lg bg-vantera-panel px-3 py-2 text-xs text-vantera-muted">Nessun evento registrato.</div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {activityLog.slice(0, 30).map((e) => (
              <div key={e.id} className="rounded-lg bg-vantera-panel px-3 py-1.5 text-[11px] text-vantera-muted">
                <span className="text-vantera-ink/80">
                  {new Date(demoMode ? (e as { timestamp: number }).timestamp : Date.parse((e as { timestamp: string }).timestamp)).toLocaleTimeString('it-IT')}
                </span>{' '}
                {e.message}
                {demoMode && <span className="ml-1.5 text-vantera-warn">(demo)</span>}
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
      <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: checked ? 26 : 4 }} />
    </button>
  )
}
