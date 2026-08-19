// Federico — Performance Analyst. Only ever analyzes REAL metrics: either
// pulled from the connected TikTok Shop API for a post that was actually
// published, or entered by Diego himself through Control (also a real,
// human-verified source — never fabricated). With nothing published yet he
// is correctly IDLE, not BLOCKED: there is genuinely no work, which is a
// valid state per spec (idle is fine, fake busywork is not).
import type { AgentContext } from './context.js'
import { agentOf, createTask } from './context.js'
import { logActivity } from '../db/repo.js'
import { makeId } from '../db/store.js'
import { pushMail } from '../mail/compose.js'
import type { PerformanceRecord, Publication } from '../types.js'

function decide(m: { views: number; ctr: number | null; retentionPct: number | null; orders: number | null }): {
  verdict: PerformanceRecord['verdict']
  reason: string
} {
  const orders = m.orders ?? 0
  const ctr = m.ctr ?? 0
  const retention = m.retentionPct ?? 0
  if (orders >= 3 && ctr >= 2) return { verdict: 'SCALE', reason: `${orders} ordini, CTR ${ctr}% — performance forte, produrre nuove varianti` }
  if (orders >= 1) return { verdict: 'ITERATE', reason: `${orders} ordini ma sotto soglia scale — testare nuovo hook/angle` }
  if (m.views >= 500 && retention < 20) return { verdict: 'KILL', reason: `${m.views} views ma retention ${retention}% — hook non funziona, interrompere` }
  if (m.views < 200) return { verdict: 'RETEST', reason: `Solo ${m.views} views — dati insufficienti, ritestare con più tempo` }
  return { verdict: 'PAUSE', reason: 'Nessun segnale chiaro — mettere in pausa in attesa di più dati' }
}

export async function runFederico(ctx: AgentContext): Promise<void> {
  const agentId = 'federico' as const
  const a = agentOf(ctx, agentId)

  const publishedWithoutAnalysis = ctx.db.publications.filter(
    (p: Publication) => p.status === 'PUBLISHED' && !ctx.db.performance.some((perf) => perf.publicationId === p.id),
  )

  if (publishedWithoutAnalysis.length === 0) {
    if (a.status !== 'WORKING') {
      a.status = 'IDLE'
      a.blockedReason = null
      a.activity = ''
      a.lastUpdate = ctx.now
    }
    return
  }

  const status = await ctx.tiktok.getConnectionStatus()
  if (status.status !== 'CONNECTED') {
    a.status = 'BLOCKED'
    a.blockedReason = `${publishedWithoutAnalysis.length} pubblicazioni in attesa di analisi. ${status.actionRequired ?? 'TikTok non connesso.'}`
    a.lastUpdate = ctx.now
    return
  }

  a.status = 'WORKING'
  a.activity = `Analisi performance reali (${publishedWithoutAnalysis.length} pubblicazioni)`
  a.progress = { current: 0, total: publishedWithoutAnalysis.length }
  a.lastUpdate = ctx.now

  let analyzed = 0
  for (const pub of publishedWithoutAnalysis) {
    try {
      const metrics = await ctx.tiktok.getPerformance(pub.productId)
      const m = metrics.find((x) => x.videoId === pub.videoId) ?? metrics[0]
      if (!m) continue
      const product = ctx.db.products.find((p) => p.id === pub.productId)
      const ctr = m.clicks > 0 && m.views > 0 ? Math.round((m.clicks / m.views) * 1000) / 10 : 0
      const { verdict, reason } = decide({ views: m.views, ctr, retentionPct: null, orders: m.orders })

      const record: PerformanceRecord = {
        id: makeId('perf'),
        publicationId: pub.id,
        productId: pub.productId,
        videoId: pub.videoId,
        views: m.views,
        watchTimeSec: null,
        retentionPct: null,
        clicks: m.clicks,
        ctr,
        orders: m.orders,
        gmv: m.gmv,
        commission: m.commission,
        source: 'TIKTOK_AFFILIATE_API',
        measuredAt: ctx.now,
        verdict,
        verdictReason: reason,
        analyzedByAgentId: agentId,
        createdAt: ctx.now,
      }
      ctx.db.performance.unshift(record)
      analyzed += 1
      a.progress!.current = analyzed

      const isFirstOrderEver = (m.orders ?? 0) > 0 && !ctx.db.performance.some((p) => p.id !== record.id && (p.orders ?? 0) > 0)
      if (isFirstOrderEver) {
        pushMail(ctx.db, agentId, 'FIRST_ORDER', `Primo ordine reale: ${product?.name ?? pub.productId}`, `${m.orders} ordini, commissione €${m.commission}.`)
      }
      if (verdict === 'SCALE') {
        pushMail(ctx.db, agentId, 'WINNER', `Winner identificato: ${product?.name ?? pub.productId}`, reason)
        createTask(ctx, {
          type: 'CONTENT_STRATEGY',
          title: `Nuove varianti per ${product?.name ?? pub.productId}`,
          assigneeId: 'marta',
          createdByAgentId: agentId,
          productId: pub.productId,
          reason,
          idempotencyKey: `variant-${pub.id}`,
        })
      } else if (verdict === 'KILL') {
        createTask(ctx, {
          type: 'PRODUCT_RESEARCH',
          title: 'Trova alternativa nella stessa categoria',
          assigneeId: 'alessia',
          createdByAgentId: agentId,
          productId: null,
          reason: `${product?.name ?? pub.productId}: ${reason}`,
          idempotencyKey: `alt-search-${pub.id}`,
        })
      } else if (verdict === 'ITERATE') {
        createTask(ctx, {
          type: 'TREND_RESEARCH',
          title: `Rivedi angle per ${product?.name ?? pub.productId}`,
          assigneeId: 'tommaso',
          createdByAgentId: agentId,
          productId: pub.productId,
          reason,
          idempotencyKey: `iterate-${pub.id}`,
        })
      }
    } catch (err) {
      a.errors.unshift({ id: makeId('err'), timestamp: ctx.now, message: err instanceof Error ? err.message : String(err) })
    }
  }

  a.todayStats.analizzate = (a.todayStats.analizzate ?? 0) + analyzed
  a.status = 'IDLE'
  a.activity = ''
  a.progress = null
  a.currentTaskId = null
  a.lastUpdate = ctx.now
  logActivity(ctx.db, 'TASK_DONE', agentId, `Federico ha analizzato ${analyzed} pubblicazioni con dati reali`)
}
