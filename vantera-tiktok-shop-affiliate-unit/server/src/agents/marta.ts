// Marta — Content Writer. Turns Tommaso's real research brief into a real,
// concrete script/storyboard/caption. This is genuinely generated (rule
// based, deterministic from real inputs) — not a fake placeholder and not
// a performance claim. No external API required, so she is never blocked
// once a brief exists (an LLM provider can be swapped in later for higher
// quality copy — see CONTENT_STRATEGY_PROVIDER note below).
import type { AgentContext } from './context.js'
import { agentOf, completeTask, createTask, failTask, findOpenTask, startTask } from './context.js'
import { makeId } from '../db/store.js'
import type { ContentStrategy } from '../types.js'

export async function runMarta(ctx: AgentContext): Promise<void> {
  const agentId = 'marta' as const
  const a = agentOf(ctx, agentId)

  let task = findOpenTask(ctx, agentId)
  if (!task) {
    const pending = ctx.db.tasks.find((t) => t.type === 'CONTENT_STRATEGY' && t.assigneeId === agentId && t.status === 'QUEUED')
    if (!pending) {
      if (a.status !== 'WORKING') {
        a.status = 'IDLE'
        a.activity = ''
        a.lastUpdate = ctx.now
      }
      return
    }
    task = pending
  }

  const product = ctx.db.products.find((p) => p.id === task!.productId)
  const brief = ctx.db.researchBriefs.find((b) => b.productId === task!.productId)
  if (!product || !brief) {
    failTask(ctx, task, agentId, 'Prodotto o research brief mancante — non posso scrivere senza input reali.')
    return
  }

  startTask(ctx, task, agentId, `Scrittura script per ${product.name}`, 1)
  try {
    const hook = brief.hooks[0] ?? `Ecco perché tutti parlano di ${product.name}`
    const painPoint = brief.painPoints[0] ?? 'un problema quotidiano comune'
    const existingVariants = ctx.db.contentStrategies.filter((c) => c.productId === product.id).length

    const strategy: ContentStrategy = {
      id: makeId('strategy'),
      productId: product.id,
      researchBriefId: brief.id,
      concept: `Problema → soluzione: si parte da "${painPoint}", si introduce ${product.name} come soluzione concreta.`,
      hook,
      script: [
        `[0-2s] HOOK: "${hook}"`,
        `[2-8s] PROBLEMA: mostra ${painPoint}`,
        `[8-18s] SOLUZIONE: presenta ${product.name}, in uso, con dettaglio ravvicinato`,
        `[18-24s] PROVA: risultato/beneficio concreto`,
        `[24-28s] CTA: "${brief.angles[0] ?? 'Link in vetrina, prezzo di oggi'}"`,
      ].join('\n'),
      storyboard: [
        { shot: 1, description: `Hook a camera, testo on-screen "${hook}"`, durationSec: 2 },
        { shot: 2, description: `Dimostrazione del problema: ${painPoint}`, durationSec: 6 },
        { shot: 3, description: `${product.name} in primo piano, in uso`, durationSec: 10 },
        { shot: 4, description: 'Risultato/beneficio, espressione soddisfatta', durationSec: 6 },
        { shot: 5, description: 'CTA finale con prodotto in vetrina', durationSec: 4 },
      ],
      onScreenText: [hook, product.name, 'Link in vetrina'],
      voiceoverScript: `Se hai anche tu ${painPoint}, guarda cosa risolve ${product.name}. ${brief.painPoints[1] ?? ''}`.trim(),
      cta: brief.angles[0] ?? 'Link in vetrina, prezzo di oggi',
      caption: `${product.name} — lo trovi nello shop. #tiktokshop #${product.category?.replace(/\s+/g, '') ?? 'shopping'}`,
      hashtags: ['tiktokshop', 'tiktokmademebuyit', (product.category ?? 'shopping').replace(/\s+/g, '').toLowerCase()],
      variantIndex: existingVariants,
      authoredByAgentId: agentId,
      createdAt: ctx.now,
    }
    ctx.db.contentStrategies.unshift(strategy)
    a.todayStats.script_scritti = (a.todayStats.script_scritti ?? 0) + 1

    createTask(ctx, {
      type: 'VIDEO_PRODUCTION',
      title: `Produzione video ${product.name}`,
      assigneeId: 'riccardo',
      createdByAgentId: agentId,
      productId: product.id,
      reason: `Script v${existingVariants + 1} pronto`,
      idempotencyKey: `video-production-${strategy.id}`,
    })

    completeTask(ctx, task, agentId, `Script pronto: ${product.name} (variante ${existingVariants + 1})`)
  } catch (err) {
    failTask(ctx, task, agentId, err instanceof Error ? err.message : String(err))
  }
}
