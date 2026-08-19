// Tommaso — Trend Researcher. Needs a real, connected content-signal
// source to analyze hooks/formats/angles for a product. No such source is
// hardcoded or invented here: he stays honestly BLOCKED until one is wired
// up (any web-search API works — the provider is swappable, see
// TrendSignalProvider below). He never invents insights from nothing.
import type { AgentContext } from './context.js'
import { agentOf, completeTask, createTask, failTask, findOpenTask, setBlocked, startTask } from './context.js'
import { makeId } from '../db/store.js'
import type { ResearchBrief } from '../types.js'

export interface TrendSignal {
  title: string
  snippet: string
  url: string
}

export interface TrendSignalProvider {
  isConfigured(): boolean
  search(query: string): Promise<TrendSignal[]>
}

/** Generic REST search provider — works with any API that accepts
 * `?q=<query>` and a bearer/api-key header and returns JSON results.
 * Configure via SEARCH_API_URL + SEARCH_API_KEY (+ optional
 * SEARCH_API_KEY_HEADER, defaults to "Authorization: Bearer <key>"). */
export class GenericSearchTrendProvider implements TrendSignalProvider {
  isConfigured(): boolean {
    return Boolean(process.env.SEARCH_API_URL && process.env.SEARCH_API_KEY)
  }

  async search(query: string): Promise<TrendSignal[]> {
    const base = process.env.SEARCH_API_URL!
    const key = process.env.SEARCH_API_KEY!
    const headerName = process.env.SEARCH_API_KEY_HEADER ?? 'Authorization'
    const headerValue = headerName === 'Authorization' ? `Bearer ${key}` : key
    const url = new URL(base)
    url.searchParams.set('q', query)
    const res = await fetch(url, { headers: { [headerName]: headerValue } })
    if (!res.ok) throw new Error(`Search API error: HTTP ${res.status}`)
    const data = (await res.json()) as { results?: { title: string; snippet: string; url: string }[] }
    return (data.results ?? []).slice(0, 8).map((r) => ({ title: r.title, snippet: r.snippet, url: r.url }))
  }
}

function extractInsights(signals: TrendSignal[]) {
  const hooks: string[] = []
  const painPoints: string[] = []
  const formatNotes: string[] = []
  for (const s of signals) {
    const text = `${s.title} ${s.snippet}`
    if (/\?|perch[ée]|come mai/i.test(text)) hooks.push(s.title)
    if (/problema|difficile|non funziona|odio|frustrat/i.test(text)) painPoints.push(s.snippet.slice(0, 140))
    if (/tutorial|recensione|unboxing|prima e dopo|before.*after/i.test(text)) formatNotes.push(s.title)
  }
  return { hooks: hooks.slice(0, 5), painPoints: painPoints.slice(0, 5), formatNotes: formatNotes.slice(0, 5) }
}

export async function runTommaso(ctx: AgentContext, provider: TrendSignalProvider = new GenericSearchTrendProvider()): Promise<void> {
  const agentId = 'tommaso' as const
  const a = agentOf(ctx, agentId)

  if (!provider.isConfigured()) {
    setBlocked(
      ctx,
      agentId,
      'Nessuna fonte di ricerca trend connessa. Aggiungi SEARCH_API_URL e SEARCH_API_KEY (qualsiasi API di web search) come GitHub Actions secret.',
    )
    return
  }

  let task = findOpenTask(ctx, agentId)
  if (!task) {
    const pending = ctx.db.tasks.find((t) => t.type === 'TREND_RESEARCH' && t.assigneeId === agentId && t.status === 'QUEUED')
    if (!pending) {
      setIdleIfNoWork(ctx)
      return
    }
    task = pending
  }

  const product = ctx.db.products.find((p) => p.id === task!.productId)
  if (!product) {
    failTask(ctx, task, agentId, 'Prodotto associato al task non trovato nel database.')
    return
  }

  startTask(ctx, task, agentId, `Analisi trend per ${product.name}`, 1)
  try {
    const signals = await provider.search(`"${product.name}" tiktok recensione OR unboxing OR problema`)
    if (signals.length === 0) {
      failTask(ctx, task, agentId, 'Nessun segnale trovato per questa query — ritento al prossimo ciclo.')
      return
    }
    const { hooks, painPoints, formatNotes } = extractInsights(signals)
    const brief: ResearchBrief = {
      id: makeId('brief'),
      productId: product.id,
      hooks: hooks.length ? hooks : ['Nessun hook chiaro estratto — verificare manualmente'],
      angles: formatNotes,
      painPoints,
      objections: [],
      formatNotes,
      saturationSignal: `${signals.length} risultati analizzati`,
      sourceUrls: signals.map((s) => s.url),
      authoredByAgentId: agentId,
      createdAt: ctx.now,
    }
    ctx.db.researchBriefs.unshift(brief)
    a.todayStats.trend_analizzati = (a.todayStats.trend_analizzati ?? 0) + 1

    createTask(ctx, {
      type: 'CONTENT_STRATEGY',
      title: `Script per ${product.name}`,
      assigneeId: 'marta',
      createdByAgentId: agentId,
      productId: product.id,
      reason: `Brief pronto: ${hooks.length} hook, ${painPoints.length} pain point identificati`,
      idempotencyKey: `content-strategy-${product.id}`,
    })

    completeTask(ctx, task, agentId, `Brief creativo pronto per ${product.name} (${signals.length} fonti)`)
  } catch (err) {
    failTask(ctx, task, agentId, err instanceof Error ? err.message : String(err))
  }
}

function setIdleIfNoWork(ctx: AgentContext) {
  const a = agentOf(ctx, 'tommaso')
  if (a.status !== 'WORKING') {
    a.status = 'IDLE'
    a.blockedReason = null
    a.activity = ''
    a.lastUpdate = ctx.now
  }
}
