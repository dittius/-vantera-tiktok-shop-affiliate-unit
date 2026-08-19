// Mirrors the subset of server/src/types.ts the frontend actually reads.
// Kept as plain data shapes (not imported cross-package) since the
// frontend and the backend worker are two separately deployed units.
import type { AgentId } from './index'

export type RealAgentStatus = 'IDLE' | 'WORKING' | 'BLOCKED' | 'ERROR'

export interface RealAgentState {
  id: AgentId
  name: string
  role: string
  status: RealAgentStatus
  currentTaskId: string | null
  activity: string
  blockedReason: string | null
  progress: { current: number; total: number } | null
  lastUpdate: string
  todayStats: Record<string, number>
  lastOutputs: string[]
  history: { id: string; timestamp: string; label: string; detail?: string }[]
  errors: { id: string; timestamp: string; message: string }[]
}

export interface RealTask {
  id: string
  type: string
  title: string
  status: 'QUEUED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'FAILED'
  assigneeId: AgentId
  productId: string | null
  reason: string | null
  createdAt: string
}

export interface RealProduct {
  id: string
  name: string
  category: string | null
  price: { value: number } | null
  currency: string | null
  commissionPct: { value: number } | null
  score: number | null
  scoreExplanation: string | null
  status: 'CANDIDATE' | 'SELECTED' | 'REJECTED'
  sourceUrls: string[]
  createdAt: string
}

export interface RealVideo {
  id: string
  productId: string
  status: 'RENDERING' | 'READY' | 'FAILED'
  durationSec: number | null
  publicUrl: string | null
  createdAt: string
}

export interface RealPublication {
  id: string
  videoId: string
  productId: string
  status: 'PREPARED' | 'PENDING_HUMAN_ACTION' | 'PUBLISHED' | 'REJECTED'
  caption: string
  humanActionInstructions: string | null
  publishedAt: string | null
  createdAt: string
}

export interface RealPerformance {
  id: string
  publicationId: string
  productId: string
  videoId: string
  views: number | null
  clicks: number | null
  orders: number | null
  commission: number | null
  measuredAt: string
  verdict: 'SCALE' | 'ITERATE' | 'RETEST' | 'PAUSE' | 'KILL' | null
  verdictReason: string | null
}

export interface RealMail {
  id: string
  fromAgentId: AgentId | 'system'
  fromName: string
  subject: string
  category: string
  body: string
  stats?: Record<string, number | string>
  timestamp: string
  read: boolean
}

export interface RealActivityLogEntry {
  id: string
  timestamp: string
  kind: string
  agentId: AgentId | null
  message: string
}

export type RealTikTokStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'TOKEN_EXPIRED' | 'ERROR'

export interface RealControlState {
  running: boolean
  demoMode: boolean
  emergencyStop: boolean
  tiktokStatus: RealTikTokStatus
  tiktokActionRequired: string | null
  lastHeartbeat: string | null
  lastCycleAt: string | null
  lastCycleDurationMs: number | null
  cyclesCompleted: number
  cycleErrors: number
  schemaVersion: number
}
