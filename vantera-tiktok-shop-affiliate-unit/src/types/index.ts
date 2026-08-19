// Core domain model for the Vantera TikTok Shop Affiliate Unit.
// This is the "database schema" for V1 (persisted client-side), designed so
// each entity can later be backed by a real database/API without changing
// the shape consumed by the UI.

export type AgentId =
  | 'alessia'
  | 'tommaso'
  | 'marta'
  | 'riccardo'
  | 'elena'
  | 'federico'

export type AgentRole =
  | 'Product Scout'
  | 'Trend Researcher'
  | 'Content Writer'
  | 'Video Maker'
  | 'Publisher'
  | 'Performance Analyst'

export type AgentStatus = 'IDLE' | 'WORKING' | 'WALKING' | 'RELAX' | 'ERROR' | 'BLOCKED'

export type ZoneId =
  | 'product-research'
  | 'trend-research'
  | 'content-desk'
  | 'video-studio'
  | 'publishing-desk'
  | 'analytics-room'
  | 'relax-area'

export interface AgentTodayStats {
  [metric: string]: number
}

export interface AgentHistoryEntry {
  id: string
  timestamp: number
  label: string
  detail?: string
}

export interface AgentError {
  id: string
  timestamp: number
  message: string
}

export interface Agent {
  id: AgentId
  name: string
  role: AgentRole
  status: AgentStatus
  currentTask: string | null
  currentTaskId: string | null
  currentLocation: ZoneId
  homeZone: ZoneId
  activity: string
  blockedReason?: string | null
  progress: { current: number; total: number } | null
  lastUpdate: number
  todayStats: AgentTodayStats
  lastOutputs: string[]
  history: AgentHistoryEntry[]
  errors: AgentError[]
}

export type TaskType =
  | 'PRODUCT_RESEARCH'
  | 'TREND_RESEARCH'
  | 'CONTENT_SCRIPT'
  | 'VIDEO_PRODUCTION'
  | 'PUBLISHING'
  | 'PERFORMANCE_ANALYSIS'

export type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'FAILED'

export interface Task {
  id: string
  type: TaskType
  title: string
  status: TaskStatus
  assigneeId: AgentId
  createdByAgentId: AgentId | null
  createdAt: number
  startedAt: number | null
  completedAt: number | null
  productId: string | null
  isDemo: boolean
  reason?: string // why Federico generated this follow-up task
  progress: { current: number; total: number }
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  currency: string
  commissionPct: number
  saturation: 'LOW' | 'MEDIUM' | 'HIGH'
  materialAvailability: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number
  status: 'CANDIDATE' | 'SELECTED' | 'REJECTED'
  discoveredByAgentId: AgentId
  isDemo: boolean
  createdAt: number
}

export interface CreativeResearch {
  id: string
  productId: string
  hookIdeas: string[]
  formatInsights: string[]
  avgDurationSec: number
  ctaPatterns: string[]
  competitorSignals: string[]
  authoredByAgentId: AgentId
  isDemo: boolean
  createdAt: number
}

export interface Script {
  id: string
  productId: string
  concept: string
  hook: string
  body: string
  voiceover: string
  onScreenText: string[]
  cta: string
  caption: string
  variants: number
  authoredByAgentId: AgentId
  isDemo: boolean
  createdAt: number
}

export interface Asset {
  id: string
  scriptId: string
  kind: 'IMAGE' | 'VOICEOVER' | 'SUBTITLE' | 'TEMPLATE'
  name: string
  isDemo: boolean
  createdAt: number
}

export interface VideoVariant {
  id: string
  scriptId: string
  productId: string
  title: string
  durationSec: number
  status: 'RENDERING' | 'READY' | 'FAILED'
  producedByAgentId: AgentId
  isDemo: boolean
  createdAt: number
}

export interface Publication {
  id: string
  videoId: string
  productId: string
  status: 'PENDING_REVIEW' | 'COMPLIANCE_OK' | 'PUBLISHED' | 'REJECTED'
  disclosureAiRequired: boolean
  publishedByAgentId: AgentId
  publishedAt: number | null
  isDemo: boolean
  createdAt: number
}

export interface Performance {
  id: string
  publicationId: string
  productId: string
  videoId: string
  views: number
  clicks: number
  orders: number
  conversionRate: number
  commission: number
  hookLabel: string
  verdict: 'WINNER' | 'LOSER' | 'NEUTRAL' | null
  analyzedByAgentId: AgentId
  isDemo: boolean
  createdAt: number
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
  isDemo: boolean
  byProduct: { productId: string; productName: string; amount: number }[]
  byVideo: { videoId: string; videoTitle: string; amount: number }[]
  orders: number
  conversions: number
}

export type MailCategory =
  | 'DAILY_REPORT'
  | 'DAILY_PERFORMANCE_REPORT'
  | 'SYSTEM'
  // Real-backend categories (server/src/types.ts MailCategory)
  | 'PRODUCT_FOUND'
  | 'VIDEO_READY'
  | 'PUBLISH_SUCCESS'
  | 'PUBLISH_FAILED'
  | 'FIRST_ORDER'
  | 'NEW_COMMISSION'
  | 'WINNER'
  | 'ABANDONED'
  | 'ERROR'

export interface InternalMail {
  id: string
  fromAgentId: AgentId | 'system'
  fromName: string
  subject: string
  category: MailCategory
  body: string
  stats?: Record<string, number | string>
  timestamp: number
  read: boolean
  isDemo: boolean
}

export type ActivityLogKind =
  | 'TASK_CREATED'
  | 'TASK_HANDOFF'
  | 'TASK_DONE'
  | 'AGENT_MOVE'
  | 'AGENT_ERROR'
  | 'MAIL'
  | 'SYSTEM'

export interface ActivityLogEntry {
  id: string
  timestamp: number
  kind: ActivityLogKind
  agentId: AgentId | null
  message: string
  isDemo: boolean
}

export type TikTokConnectionStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'DEMO'

export interface UnitControlState {
  running: boolean
  demoMode: boolean
  tiktokStatus: TikTokConnectionStatus
}
