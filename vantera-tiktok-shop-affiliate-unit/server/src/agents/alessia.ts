// Alessia — Product Scout. Real product research against the connected
// TikTok Shop Affiliate catalogue. Does nothing fabricated: if TikTok is
// not connected, she is honestly BLOCKED with the exact action required.
import type { AgentContext } from './context.js'
import { agentOf, completeTask, createTask, failTask, findOpenTask, setBlocked, startTask } from './context.js'
import { makeId } from '../db/store.js'
import { pushMail } from '../mail/compose.js'
import type { Product } from '../types.js'

const SEARCH_QUERIES = ['trending', 'best seller', 'viral']

function scoreProduct(p: { price: number; commissionPct: number | null }): { score: number; explanation: string } {
  // Explainable v1 scoring: only uses fields TikTok's API actually returns
  // (price, commission%). Saturation/competition/material-availability need
  // additional connected data sources and are left null until available —
  // never guessed.
  const commission = p.commissionPct ?? 0
  const commissionScore = Math.min(50, commission * 2) // up to 50pts at 25%+ commission
  const priceScore = p.price > 0 && p.price <= 40 ? 30 : p.price > 40 && p.price <= 80 ? 18 : 8 // sweet spot for impulse buys
  const score = Math.round(commissionScore + priceScore)
  return {
    score,
    explanation: `commissione ${commission}% (+${Math.round(commissionScore)}pt), prezzo €${p.price} (+${priceScore}pt). Saturazione/concorrenza non ancora valutabili: nessuna fonte connessa per quei segnali.`,
  }
}

export async function runAlessia(ctx: AgentContext): Promise<void> {
  const agentId = 'alessia' as const
  const a = agentOf(ctx, agentId)

  const status = await ctx.tiktok.getConnectionStatus()
  if (status.status !== 'CONNECTED') {
    setBlocked(ctx, agentId, status.actionRequired ?? 'TikTok Shop non connesso.')
    return
  }

  let task = findOpenTask(ctx, agentId)
  if (!task) {
    const query = SEARCH_QUERIES[new Date().getUTCHours() % SEARCH_QUERIES.length]
    task = createTask(ctx, {
      type: 'PRODUCT_RESEARCH',
      title: `Scouting prodotti reali — query "${query}"`,
      assigneeId: agentId,
      createdByAgentId: null,
      productId: null,
      reason: null,
      idempotencyKey: `alessia-scout-${new Date().toISOString().slice(0, 13)}`, // at most one scouting run per hour
    })
  }

  if (task.status === 'QUEUED') {
    startTask(ctx, task, agentId, 'Ricerca prodotti reali su TikTok Shop Affiliate', 1)
  }

  try {
    const candidates = await ctx.tiktok.searchAffiliateProducts(task.title.split('"')[1] ?? '')
    a.todayStats.analizzati = (a.todayStats.analizzati ?? 0) + candidates.length

    let selected = 0
    let rejected = 0
    for (const c of candidates) {
      const existing = ctx.db.products.find((p) => p.name === c.name)
      if (existing) continue
      const { score, explanation } = scoreProduct(c)
      const isSelected = score >= 55
      const product: Product = {
        id: makeId('prod'),
        name: c.name,
        category: c.category,
        price: { value: c.price, source: 'TIKTOK_AFFILIATE_API', fetchedAt: ctx.now, sourceUrl: c.sourceUrl },
        currency: c.currency,
        commissionPct: c.commissionPct != null ? { value: c.commissionPct, source: 'TIKTOK_AFFILIATE_API', fetchedAt: ctx.now, sourceUrl: c.sourceUrl } : null,
        saturation: null,
        competitionNotes: null,
        demandSignal: null,
        materialAvailability: null,
        score,
        scoreExplanation: explanation,
        status: isSelected ? 'SELECTED' : 'REJECTED',
        sourceUrls: [c.sourceUrl],
        discoveredByAgentId: agentId,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      }
      ctx.db.products.unshift(product)
      if (isSelected) selected += 1
      else rejected += 1

      if (isSelected) {
        pushMail(
          ctx.db,
          agentId,
          'PRODUCT_FOUND',
          `Prodotto interessante trovato: ${product.name}`,
          `${product.name} — score ${score}/100.\n${explanation}\nFonte: ${c.sourceUrl}`,
          { score },
        )
        createTask(ctx, {
          type: 'TREND_RESEARCH',
          title: `Ricerca trend per ${product.name}`,
          assigneeId: 'tommaso',
          createdByAgentId: agentId,
          productId: product.id,
          reason: `Alessia: score ${score}/100 — ${explanation}`,
          idempotencyKey: `trend-research-${product.id}`,
        })
      }
    }
    a.todayStats.selezionati = (a.todayStats.selezionati ?? 0) + selected
    a.todayStats.scartati = (a.todayStats.scartati ?? 0) + rejected
    ctx.db.products = ctx.db.products.slice(0, 500)

    completeTask(ctx, task, agentId, `Scouting completato: ${candidates.length} candidati, ${selected} selezionati, ${rejected} scartati`)
  } catch (err) {
    failTask(ctx, task, agentId, err instanceof Error ? err.message : String(err))
  }
}
