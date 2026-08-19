import { readTable, writeTable, nowIso } from './store.js'
import type {
  ActivityLogEntry,
  AgentId,
  AgentState,
  ContentStrategy,
  ControlState,
  InternalMail,
  PerformanceRecord,
  Product,
  Publication,
  ResearchBrief,
  Task,
  VideoAsset,
} from '../types.js'
import { SCHEMA_VERSION } from '../types.js'

export const AGENT_ORDER: AgentId[] = ['alessia', 'tommaso', 'marta', 'riccardo', 'elena', 'federico']

const AGENT_DEFS: { id: AgentId; name: string; role: AgentState['role'] }[] = [
  { id: 'alessia', name: 'Alessia Riva', role: 'Product Scout' },
  { id: 'tommaso', name: 'Tommaso Greco', role: 'Trend Researcher' },
  { id: 'marta', name: 'Marta Bellini', role: 'Content Writer' },
  { id: 'riccardo', name: 'Riccardo Sala', role: 'Video Maker' },
  { id: 'elena', name: 'Elena Moretti', role: 'Publisher' },
  { id: 'federico', name: 'Federico Conti', role: 'Performance Analyst' },
]

function defaultAgents(): Record<AgentId, AgentState> {
  const out = {} as Record<AgentId, AgentState>
  for (const def of AGENT_DEFS) {
    out[def.id] = {
      id: def.id,
      name: def.name,
      role: def.role,
      status: 'IDLE',
      currentTaskId: null,
      activity: '',
      blockedReason: null,
      progress: null,
      lastUpdate: nowIso(),
      todayStats: {},
      lastOutputs: [],
      history: [],
      errors: [],
    }
  }
  return out
}

function defaultControl(): ControlState {
  return {
    running: false,
    demoMode: false,
    emergencyStop: false,
    tiktokStatus: 'NOT_CONNECTED',
    tiktokActionRequired: 'Connect TikTok Shop Partner Center to let Alessia start real product research.',
    lastHeartbeat: null,
    lastCycleAt: null,
    lastCycleDurationMs: null,
    cyclesCompleted: 0,
    cycleErrors: 0,
    lastDailyReportDateUtc: null,
    schemaVersion: SCHEMA_VERSION,
  }
}

export interface Db {
  control: ControlState
  agents: Record<AgentId, AgentState>
  tasks: Task[]
  products: Product[]
  researchBriefs: ResearchBrief[]
  contentStrategies: ContentStrategy[]
  videos: VideoAsset[]
  publications: Publication[]
  performance: PerformanceRecord[]
  mail: InternalMail[]
  activityLog: ActivityLogEntry[]
}

export async function loadDb(): Promise<Db> {
  const [control, agents, tasks, products, researchBriefs, contentStrategies, videos, publications, performance, mail, activityLog] =
    await Promise.all([
      readTable('control', defaultControl()),
      readTable('agents', defaultAgents()),
      readTable<Task[]>('tasks', []),
      readTable<Product[]>('products', []),
      readTable<ResearchBrief[]>('researchBriefs', []),
      readTable<ContentStrategy[]>('contentStrategies', []),
      readTable<VideoAsset[]>('videos', []),
      readTable<Publication[]>('publications', []),
      readTable<PerformanceRecord[]>('performance', []),
      readTable<InternalMail[]>('mail', []),
      readTable<ActivityLogEntry[]>('activityLog', []),
    ])
  return { control, agents, tasks, products, researchBriefs, contentStrategies, videos, publications, performance, mail, activityLog }
}

export async function saveDb(db: Db): Promise<void> {
  await Promise.all([
    writeTable('control', db.control),
    writeTable('agents', db.agents),
    writeTable('tasks', db.tasks.slice(0, 500)),
    writeTable('products', db.products.slice(0, 500)),
    writeTable('researchBriefs', db.researchBriefs.slice(0, 500)),
    writeTable('contentStrategies', db.contentStrategies.slice(0, 500)),
    writeTable('videos', db.videos.slice(0, 500)),
    writeTable('publications', db.publications.slice(0, 500)),
    writeTable('performance', db.performance.slice(0, 1000)),
    writeTable('mail', db.mail.slice(0, 500)),
    writeTable('activityLog', db.activityLog.slice(0, 1000)),
  ])
}

export function logActivity(db: Db, kind: ActivityLogEntry['kind'], agentId: AgentId | null, message: string) {
  db.activityLog.unshift({ id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: nowIso(), kind, agentId, message })
  if (db.activityLog.length > 1000) db.activityLog.length = 1000
}
