import type { Db } from '../db/repo.js'
import { AGENT_ORDER } from '../db/repo.js'
import { pushMail } from './compose.js'
import { computeEarnings } from '../earnings.js'

/** Sends one real daily report per agent, at most once per UTC calendar
 * day, built strictly from that agent's real todayStats accumulated during
 * the day's cycles — then resets the counters for the next day. */
export function maybeSendDailyReports(db: Db, tiktokConnected: boolean) {
  const todayUtc = new Date().toISOString().slice(0, 10)
  if (db.control.lastDailyReportDateUtc === todayUtc) return

  // Only send once activity has actually happened at least once since the
  // unit started, so day one with nothing connected doesn't spam empty mail.
  const anyActivity = AGENT_ORDER.some((id) => Object.keys(db.agents[id].todayStats).length > 0)
  if (!anyActivity) return

  for (const id of AGENT_ORDER) {
    const agent = db.agents[id]
    const isFederico = id === 'federico'
    const statLines = Object.entries(agent.todayStats)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    pushMail(
      db,
      id,
      isFederico ? 'DAILY_PERFORMANCE_REPORT' : 'DAILY_REPORT',
      isFederico ? 'DAILY PERFORMANCE REPORT' : `DAILY REPORT | ${todayUtc}`,
      statLines || 'Nessuna attività registrata oggi.',
      { ...agent.todayStats },
    )
    agent.todayStats = {}
  }

  if (isFedericoBusy(db)) {
    const earnings = computeEarnings(db, tiktokConnected)
    pushMail(
      db,
      'federico',
      'DAILY_PERFORMANCE_REPORT',
      'DAILY EARNINGS SUMMARY',
      `Today €${earnings.today} · Total €${earnings.total} · Ordini ${earnings.orders}`,
    )
  }

  db.control.lastDailyReportDateUtc = todayUtc
}

function isFedericoBusy(db: Db): boolean {
  return db.performance.length > 0
}
