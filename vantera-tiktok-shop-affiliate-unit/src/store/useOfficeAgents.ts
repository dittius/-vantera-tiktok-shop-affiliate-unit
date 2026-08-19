import { useMemo } from 'react'
import { useAppStore } from './useAppStore'
import { useRealStore } from './useRealStore'
import { mapRealAgents } from './mapRealAgent'
import type { Agent, AgentId } from '../types'

/** Single source the office/agent panel render from: the local showcase
 * simulation while Demo Mode is on, the real backend state otherwise.
 * Demo Mode is a purely frontend presentational switch — see
 * server/src/run-cycle.ts's comment on ControlState.demoMode. */
export function useOfficeAgents(): { agents: Record<AgentId, Agent>; isReal: boolean } {
  const demoMode = useAppStore((s) => s.demoMode)
  const demoAgents = useAppStore((s) => s.agents)
  const realAgentsRaw = useRealStore((s) => s.agents)

  const realAgents = useMemo(() => mapRealAgents(realAgentsRaw), [realAgentsRaw])

  return demoMode ? { agents: demoAgents, isReal: false } : { agents: realAgents, isReal: true }
}
