import { AGENT_DEFINITIONS } from '../data/agents'
import type { Agent, AgentId, AgentStatus } from '../types'
import type { RealAgentState } from '../types/real'

function toMillis(iso: string): number {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

function mapStatus(status: RealAgentState['status']): AgentStatus {
  switch (status) {
    case 'WORKING':
      return 'WORKING'
    case 'BLOCKED':
      return 'BLOCKED'
    case 'ERROR':
      return 'ERROR'
    default:
      return 'IDLE'
  }
}

/** Real agents never walk between desks (there is no turn-based staging in
 * the backend) — they simply show real status at their own desk, which is
 * exactly what the spec asks for: the office reflects real backend state,
 * not a choreographed animation. */
export function mapRealAgents(real: Record<AgentId, RealAgentState> | null): Record<AgentId, Agent> {
  const out = {} as Record<AgentId, Agent>
  for (const def of AGENT_DEFINITIONS) {
    const r = real?.[def.id]
    out[def.id] = {
      id: def.id,
      name: def.name,
      role: def.role,
      status: r ? mapStatus(r.status) : 'IDLE',
      currentTask: r?.status === 'WORKING' ? r.activity || 'In lavorazione' : null,
      currentTaskId: r?.currentTaskId ?? null,
      currentLocation: def.homeZone,
      homeZone: def.homeZone,
      activity: r?.activity ?? '',
      blockedReason: r?.blockedReason ?? null,
      progress: r?.progress ?? null,
      lastUpdate: r ? toMillis(r.lastUpdate) : 0,
      todayStats: r?.todayStats ?? {},
      lastOutputs: r?.lastOutputs ?? [],
      history: (r?.history ?? []).map((h) => ({ id: h.id, timestamp: toMillis(h.timestamp), label: h.label, detail: h.detail })),
      errors: (r?.errors ?? []).map((e) => ({ id: e.id, timestamp: toMillis(e.timestamp), message: e.message })),
    }
  }
  return out
}
