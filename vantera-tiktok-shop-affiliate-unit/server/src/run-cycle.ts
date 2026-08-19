// Entrypoint executed on a schedule by .github/workflows/unit-cycle.yml.
// Every run is a single, idempotent, self-contained "tick" of the unit:
// load real state -> sweep stuck tasks -> run each agent once -> persist.
// Safe to run repeatedly, safe to run concurrently-avoided via the
// workflow's concurrency group, safe to interrupt (nothing is left
// half-written thanks to the atomic writeTable in db/store.ts).
import { loadDb, saveDb, logActivity, AGENT_ORDER } from './db/repo.js'
import { nowIso, makeId } from './db/store.js'
import { RealTikTokShopProvider } from './integrations/tiktok/index.js'
import { runAlessia } from './agents/alessia.js'
import { runTommaso } from './agents/tommaso.js'
import { runMarta } from './agents/marta.js'
import { runRiccardo } from './agents/riccardo.js'
import { runElena } from './agents/elena.js'
import { runFederico } from './agents/federico.js'
import { maybeSendDailyReports } from './mail/dailyReport.js'
import type { AgentContext } from './agents/context.js'
import type { AgentId } from './types.js'

const RUNNERS: Record<AgentId, (ctx: AgentContext) => Promise<void>> = {
  alessia: runAlessia,
  tommaso: runTommaso,
  marta: runMarta,
  riccardo: runRiccardo,
  elena: runElena,
  federico: runFederico,
}

function sweepTimeouts(ctx: AgentContext) {
  const now = Date.now()
  for (const task of ctx.db.tasks) {
    if (task.status !== 'IN_PROGRESS') continue
    if (!task.timeoutAt || new Date(task.timeoutAt).getTime() > now) continue
    logActivity(ctx.db, 'TASK_TIMEOUT', task.assigneeId, `${task.title}: timeout dopo 45 min, reset per retry`)
    task.status = task.attempts >= task.maxAttempts ? 'FAILED' : 'QUEUED'
    const agent = ctx.db.agents[task.assigneeId]
    if (agent.currentTaskId === task.id) {
      agent.status = 'IDLE'
      agent.currentTaskId = null
      agent.activity = ''
      agent.progress = null
    }
  }
}

async function main() {
  const startedAt = Date.now()
  const db = await loadDb()
  const now = nowIso()

  db.control.lastHeartbeat = now
  logActivity(db, 'HEARTBEAT', null, 'Cycle started')

  if (db.control.emergencyStop) {
    logActivity(db, 'SYSTEM', null, 'Emergency stop attivo — nessun agente eseguito questo ciclo.')
    await saveDb(db)
    return
  }

  if (!db.control.running) {
    logActivity(db, 'SYSTEM', null, 'Unit in pausa — nessun agente eseguito questo ciclo.')
    await saveDb(db)
    return
  }

  // control.demoMode is a FRONTEND-ONLY presentational toggle (it decides
  // whether the PWA shows this real state or its local showcase
  // simulation) — the backend always does real work, or is honestly
  // blocked. It never fabricates data, so it never needs a "demo" branch.
  const tiktok = new RealTikTokShopProvider()
  const ctx: AgentContext = { db, tiktok, now }

  const status = await tiktok.getConnectionStatus()
  db.control.tiktokStatus = status.status
  db.control.tiktokActionRequired = status.actionRequired

  sweepTimeouts(ctx)

  for (const agentId of AGENT_ORDER) {
    try {
      await RUNNERS[agentId](ctx)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      db.agents[agentId].status = 'ERROR'
      db.agents[agentId].errors.unshift({ id: makeId('err'), timestamp: now, message })
      logActivity(db, 'AGENT_ERROR', agentId, `Errore non gestito: ${message}`)
      db.control.cycleErrors += 1
    }
  }

  maybeSendDailyReports(db, status.status === 'CONNECTED')

  db.control.cyclesCompleted += 1
  db.control.lastCycleAt = now
  db.control.lastCycleDurationMs = Date.now() - startedAt
  logActivity(db, 'HEARTBEAT', null, `Cycle completed in ${db.control.lastCycleDurationMs}ms`)

  await saveDb(db)
}

main().catch((err) => {
  console.error('[run-cycle] fatal error:', err)
  process.exitCode = 1
})
