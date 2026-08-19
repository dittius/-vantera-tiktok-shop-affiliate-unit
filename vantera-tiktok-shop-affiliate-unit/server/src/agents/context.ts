import type { Db } from '../db/repo.js'
import type { TikTokShopProvider } from '../integrations/tiktok/types.js'
import { makeId, nowIso } from '../db/store.js'
import { logActivity } from '../db/repo.js'
import type { AgentId, Task } from '../types.js'

export interface AgentContext {
  db: Db
  tiktok: TikTokShopProvider
  now: string
}

export function agentOf(ctx: AgentContext, id: AgentId) {
  return ctx.db.agents[id]
}

export function setBlocked(ctx: AgentContext, id: AgentId, reason: string) {
  const a = agentOf(ctx, id)
  const changed = a.status !== 'BLOCKED' || a.blockedReason !== reason
  a.status = 'BLOCKED'
  a.blockedReason = reason
  a.activity = ''
  a.progress = null
  a.lastUpdate = ctx.now
  if (changed) logActivity(ctx.db, 'TASK_BLOCKED', id, `${a.name}: ${reason}`)
}

export function setIdle(ctx: AgentContext, id: AgentId) {
  const a = agentOf(ctx, id)
  a.status = 'IDLE'
  a.blockedReason = null
  a.activity = ''
  a.currentTaskId = null
  a.progress = null
  a.lastUpdate = ctx.now
}

export function findOpenTask(ctx: AgentContext, assigneeId: AgentId): Task | undefined {
  return ctx.db.tasks.find((t) => t.assigneeId === assigneeId && (t.status === 'QUEUED' || t.status === 'IN_PROGRESS'))
}

export function findExistingTask(ctx: AgentContext, idempotencyKey: string): Task | undefined {
  return ctx.db.tasks.find((t) => t.idempotencyKey === idempotencyKey && t.status !== 'FAILED')
}

export function createTask(
  ctx: AgentContext,
  input: {
    type: Task['type']
    title: string
    assigneeId: AgentId
    createdByAgentId: AgentId | null
    productId: string | null
    reason: string | null
    idempotencyKey: string
  },
): Task {
  const existing = findExistingTask(ctx, input.idempotencyKey)
  if (existing) return existing
  const task: Task = {
    id: makeId('task'),
    type: input.type,
    title: input.title,
    status: 'QUEUED',
    assigneeId: input.assigneeId,
    createdByAgentId: input.createdByAgentId,
    createdAt: ctx.now,
    startedAt: null,
    completedAt: null,
    productId: input.productId,
    reason: input.reason,
    blockedReason: null,
    attempts: 0,
    maxAttempts: 3,
    timeoutAt: null,
    idempotencyKey: input.idempotencyKey,
  }
  ctx.db.tasks.unshift(task)
  logActivity(ctx.db, 'TASK_CREATED', input.assigneeId, `${input.title}`)
  return task
}

export function startTask(ctx: AgentContext, task: Task, agentId: AgentId, activity: string, total: number) {
  task.status = 'IN_PROGRESS'
  task.startedAt = task.startedAt ?? ctx.now
  task.attempts += 1
  task.timeoutAt = new Date(Date.now() + 45 * 60 * 1000).toISOString() // 45 min timeout
  const a = agentOf(ctx, agentId)
  a.status = 'WORKING'
  a.currentTaskId = task.id
  a.activity = activity
  a.blockedReason = null
  a.progress = { current: 0, total }
  a.lastUpdate = ctx.now
}

export function completeTask(ctx: AgentContext, task: Task, agentId: AgentId, outputSummary: string) {
  task.status = 'DONE'
  task.completedAt = ctx.now
  const a = agentOf(ctx, agentId)
  a.lastOutputs.unshift(outputSummary)
  if (a.lastOutputs.length > 20) a.lastOutputs.length = 20
  a.history.unshift({ id: makeId('hist'), timestamp: ctx.now, label: outputSummary })
  if (a.history.length > 50) a.history.length = 50
  setIdle(ctx, agentId)
  logActivity(ctx.db, 'TASK_DONE', agentId, outputSummary)
}

export function failTask(ctx: AgentContext, task: Task, agentId: AgentId, message: string) {
  const a = agentOf(ctx, agentId)
  a.errors.unshift({ id: makeId('err'), timestamp: ctx.now, message })
  if (a.errors.length > 30) a.errors.length = 30
  if (task.attempts >= task.maxAttempts) {
    task.status = 'FAILED'
    logActivity(ctx.db, 'TASK_TIMEOUT', agentId, `${task.title}: failed permanently — ${message}`)
    setIdle(ctx, agentId)
  } else {
    task.status = 'QUEUED' // retry on next cycle
    logActivity(ctx.db, 'TASK_RETRY', agentId, `${task.title}: retry ${task.attempts}/${task.maxAttempts} — ${message}`)
    a.status = 'ERROR'
    a.activity = `Retry ${task.attempts}/${task.maxAttempts}: ${message}`
    a.lastUpdate = ctx.now
  }
}
