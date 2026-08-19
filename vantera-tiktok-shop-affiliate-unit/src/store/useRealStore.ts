// Reads the REAL backend state (server/data/*.json, kept up to date by the
// GitHub Actions worker) and exposes it to the UI. This store never
// fabricates anything: every field here is exactly what the worker wrote,
// or an honest empty/zero default while nothing has run yet.
import { create } from 'zustand'
import { readTable } from '../integrations/github/client'
import type {
  RealActivityLogEntry,
  RealAgentState,
  RealControlState,
  RealMail,
  RealPerformance,
  RealProduct,
  RealPublication,
  RealTask,
  RealVideo,
} from '../types/real'
import type { AgentId } from '../types'

const DEFAULT_CONTROL: RealControlState = {
  running: false,
  demoMode: false,
  emergencyStop: false,
  tiktokStatus: 'NOT_CONNECTED',
  tiktokActionRequired: null,
  lastHeartbeat: null,
  lastCycleAt: null,
  lastCycleDurationMs: null,
  cyclesCompleted: 0,
  cycleErrors: 0,
  schemaVersion: 0,
}

interface RealState {
  loaded: boolean
  loading: boolean
  lastFetchError: string | null
  control: RealControlState
  agents: Record<AgentId, RealAgentState> | null
  tasks: RealTask[]
  products: RealProduct[]
  videos: RealVideo[]
  publications: RealPublication[]
  performance: RealPerformance[]
  mail: RealMail[]
  activityLog: RealActivityLogEntry[]
  /** Read state for real mail is tracked locally only (not written back to
   * the repo) — the worker owns mail.json and would otherwise fight over
   * it with the browser on every cycle. */
  localReadIds: Record<string, true>
  markRead: (id: string) => void
  markAllRead: () => void
  fetchAll: () => Promise<void>
}

export const useRealStore = create<RealState>()((set) => ({
  loaded: false,
  loading: false,
  lastFetchError: null,
  control: DEFAULT_CONTROL,
  agents: null,
  tasks: [],
  products: [],
  videos: [],
  publications: [],
  performance: [],
  mail: [],
  activityLog: [],
  localReadIds: {},
  markRead: (id) => set((s) => ({ localReadIds: { ...s.localReadIds, [id]: true } })),
  markAllRead: () =>
    set((s) => ({
      localReadIds: { ...s.localReadIds, ...Object.fromEntries(s.mail.map((m) => [m.id, true as const])) },
    })),

  fetchAll: async () => {
    set({ loading: true })
    try {
      const [control, agents, tasks, products, videos, publications, performance, mail, activityLog] = await Promise.all([
        readTable<RealControlState>('control', DEFAULT_CONTROL),
        readTable<Record<AgentId, RealAgentState> | null>('agents', null),
        readTable<RealTask[]>('tasks', []),
        readTable<RealProduct[]>('products', []),
        readTable<RealVideo[]>('videos', []),
        readTable<RealPublication[]>('publications', []),
        readTable<RealPerformance[]>('performance', []),
        readTable<RealMail[]>('mail', []),
        readTable<RealActivityLogEntry[]>('activityLog', []),
      ])
      set({
        loaded: true,
        loading: false,
        lastFetchError: null,
        control,
        agents,
        tasks,
        products,
        videos,
        publications,
        performance,
        mail,
        activityLog,
      })
    } catch (err) {
      set({ loading: false, lastFetchError: err instanceof Error ? err.message : String(err) })
    }
  },
}))
