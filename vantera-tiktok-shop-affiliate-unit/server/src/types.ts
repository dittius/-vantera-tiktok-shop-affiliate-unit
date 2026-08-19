// Server-side domain model — this is now the single source of truth for
// the unit's real operational state. The frontend only ever *reads* this
// (via the published data/*.json), it never fabricates it.

export type AgentId = 'alessia' | 'tommaso' | 'marta' | 'riccardo' | 'elena' | 'federico'

export type AgentRole =
  | 'Product Scout'
  | 'Trend Researcher'
  | 'Content Writer'
  | 'Video Maker'
  | 'Publisher'
  | 'Performance Analyst'

export type AgentStatus = 'IDLE' | 'WORKING' | 'BLOCKED' | 'ERROR'

export interface AgentState {
  id: AgentId
  name: string
  role: AgentRole
  status: AgentStatus
  currentTaskId: string | null
  activity: string
  blockedReason: string | null
  progress: { current: number; total: number } | null
  lastUpdate: string // ISO timestamp
  todayStats: Record<string, number>
  lastOutputs: string[]
  history: { id: string; timestamp: string; label: string; detail?: string }[]
  errors: { id: string; timestamp: string; message: string }[]
}

export type TaskType =
  | 'PRODUCT_RESEARCH'
  | 'TREND_RESEARCH'
  | 'CONTENT_STRATEGY'
  | 'VIDEO_PRODUCTION'
  | 'PUBLISHING'
  | 'PERFORMANCE_ANALYSIS'

export type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'FAILED'

export interface Task {
  id: string
  type: TaskType
  title: string
  status: TaskStatus
  assigneeId: AgentId
  createdByAgentId: AgentId | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  productId: string | null
  reason: string | null // why this task exists (e.g. Federico's decision)
  blockedReason: string | null
  attempts: number
  maxAttempts: number
  timeoutAt: string | null // if IN_PROGRESS past this, considered stuck
  idempotencyKey: string // prevents duplicate creation across cycles
}

export type DataSource = 'TIKTOK_AFFILIATE_API' | 'HUMAN_ENTERED' | 'DERIVED'

export interface SourcedValue<T> {
  value: T
  source: DataSource
  fetchedAt: string
  sourceUrl?: string
}

export interface Product {
  id: string
  name: string
  category: string | null
  price: SourcedValue<number> | null
  currency: string | null
  commissionPct: SourcedValue<number> | null
  saturation: 'LOW' | 'MEDIUM' | 'HIGH' | null
  competitionNotes: string | null
  demandSignal: string | null
  materialAvailability: 'LOW' | 'MEDIUM' | 'HIGH' | null
  score: number | null
  scoreExplanation: string | null
  status: 'CANDIDATE' | 'SELECTED' | 'REJECTED'
  sourceUrls: string[]
  discoveredByAgentId: AgentId
  createdAt: string
  updatedAt: string
}

export interface ResearchBrief {
  id: string
  productId: string
  hooks: string[]
  angles: string[]
  painPoints: string[]
  objections: string[]
  formatNotes: string[]
  saturationSignal: string | null
  sourceUrls: string[]
  authoredByAgentId: AgentId
  createdAt: string
}

export interface ContentStrategy {
  id: string
  productId: string
  researchBriefId: string
  concept: string
  hook: string
  script: string
  storyboard: { shot: number; description: string; durationSec: number }[]
  onScreenText: string[]
  voiceoverScript: string
  cta: string
  caption: string
  hashtags: string[]
  variantIndex: number
  authoredByAgentId: AgentId
  createdAt: string
}

export interface VideoAsset {
  id: string
  contentStrategyId: string
  productId: string
  status: 'RENDERING' | 'READY' | 'FAILED'
  durationSec: number | null
  publicUrl: string | null // GitHub Release asset URL once rendered
  renderLog: string[]
  producedByAgentId: AgentId
  createdAt: string
}

export interface Publication {
  id: string
  videoId: string
  productId: string
  status: 'PREPARED' | 'PENDING_HUMAN_ACTION' | 'PUBLISHED' | 'REJECTED'
  caption: string
  hashtags: string[]
  disclosureAiRequired: true
  humanActionInstructions: string | null
  publishedAt: string | null
  tiktokPostId: string | null
  publishedByAgentId: AgentId
  createdAt: string
}

export interface PerformanceRecord {
  id: string
  publicationId: string
  productId: string
  videoId: string
  views: number | null
  watchTimeSec: number | null
  retentionPct: number | null
  clicks: number | null
  ctr: number | null
  orders: number | null
  gmv: number | null
  commission: number | null
  source: DataSource
  measuredAt: string
  verdict: 'SCALE' | 'ITERATE' | 'RETEST' | 'PAUSE' | 'KILL' | null
  verdictReason: string | null
  analyzedByAgentId: AgentId
  createdAt: string
}

export interface EarningsSnapshot {
  today: number
  week: number
  month: number
  total: number
  pending: number
  confirmed: number
  paid: number
  connected: boolean
  currency: string
  byProduct: { productId: string; productName: string; amount: number }[]
  byVideo: { videoId: string; videoTitle: string; amount: number }[]
  orders: number
  updatedAt: string
}

export type MailCategory =
  | 'PRODUCT_FOUND'
  | 'VIDEO_READY'
  | 'PUBLISH_SUCCESS'
  | 'PUBLISH_FAILED'
  | 'FIRST_ORDER'
  | 'NEW_COMMISSION'
  | 'WINNER'
  | 'ABANDONED'
  | 'ERROR'
  | 'DAILY_REPORT'
  | 'DAILY_PERFORMANCE_REPORT'
  | 'SYSTEM'

export interface InternalMail {
  id: string
  fromAgentId: AgentId | 'system'
  fromName: string
  subject: string
  category: MailCategory
  body: string
  stats?: Record<string, number | string>
  timestamp: string
  read: boolean
}

export type ActivityLogKind =
  | 'TASK_CREATED'
  | 'TASK_HANDOFF'
  | 'TASK_DONE'
  | 'TASK_BLOCKED'
  | 'TASK_RETRY'
  | 'TASK_TIMEOUT'
  | 'AGENT_ERROR'
  | 'MAIL'
  | 'SYSTEM'
  | 'HEARTBEAT'

export interface ActivityLogEntry {
  id: string
  timestamp: string
  kind: ActivityLogKind
  agentId: AgentId | null
  message: string
}

export type TikTokConnectionStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'TOKEN_EXPIRED' | 'ERROR'

export interface ControlState {
  running: boolean
  /** Frontend-only presentational toggle: when true the PWA shows its local
   * showcase simulation instead of this real state. The backend never reads
   * this — it always does real work or is honestly blocked. */
  demoMode: boolean
  emergencyStop: boolean
  tiktokStatus: TikTokConnectionStatus
  tiktokActionRequired: string | null
  lastHeartbeat: string | null
  lastCycleAt: string | null
  lastCycleDurationMs: number | null
  cyclesCompleted: number
  cycleErrors: number
  lastDailyReportDateUtc: string | null
  schemaVersion: number
}

export const SCHEMA_VERSION = 1
