// Elena — Publisher. TikTok's Content Posting API only allows unaudited
// apps to push videos as private drafts to the connecting creator's own
// account (not public, not third-party); full public auto-publish needs an
// audited app under TikTok's stricter review. Rather than pretend to
// auto-publish, Elena prepares everything real (final video, caption,
// hashtags, AI-disclosure, metadata) and creates exactly one minimal
// human-handoff action — never fakes a "published" status.
import type { AgentContext } from './context.js'
import { agentOf, completeTask, failTask, findOpenTask, startTask } from './context.js'
import { makeId } from '../db/store.js'
import { pushMail } from '../mail/compose.js'
import type { Publication } from '../types.js'

export async function runElena(ctx: AgentContext): Promise<void> {
  const agentId = 'elena' as const
  const a = agentOf(ctx, agentId)

  let task = findOpenTask(ctx, agentId)
  if (!task) {
    const pending = ctx.db.tasks.find((t) => t.type === 'PUBLISHING' && t.assigneeId === agentId && t.status === 'QUEUED')
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
  const strategy = ctx.db.contentStrategies.find((s) => s.productId === task!.productId)
  const video = [...ctx.db.videos].find((v) => v.productId === task!.productId && v.status === 'READY')
  if (!product || !strategy || !video || !video.publicUrl) {
    failTask(ctx, task, agentId, 'Video pronto non trovato — non pubblico senza un asset reale.')
    return
  }

  startTask(ctx, task, agentId, `Verifica compliance e preparazione pubblicazione ${product.name}`, 1)
  try {
    const compliance: string[] = []
    if (!strategy.caption) compliance.push('caption mancante')
    if (video.durationSec != null && video.durationSec > 60) compliance.push('durata oltre 60s, valutare taglio')
    const disclosureNote = 'Contenuto creato con assistenza AI — disclosure AI richiesta da TikTok per contenuti sintetici/assistiti.'

    const publication: Publication = {
      id: makeId('pub'),
      videoId: video.id,
      productId: product.id,
      status: compliance.length > 0 ? 'REJECTED' : 'PENDING_HUMAN_ACTION',
      caption: `${strategy.caption}\n\n${disclosureNote}`,
      hashtags: strategy.hashtags,
      disclosureAiRequired: true,
      humanActionInstructions:
        compliance.length > 0
          ? null
          : [
              `1. Apri TikTok e crea un nuovo post.`,
              `2. Carica il video: ${video.publicUrl}`,
              `3. Incolla la caption preparata (disclosure AI inclusa).`,
              `4. Collega il prodotto "${product.name}" dalla tua vetrina TikTok Shop.`,
              `5. Attiva l'etichetta "Contenuto creato con AI" nelle impostazioni del post.`,
              `6. Pubblica.`,
            ].join('\n'),
      publishedAt: null,
      tiktokPostId: null,
      publishedByAgentId: agentId,
      createdAt: ctx.now,
    }
    ctx.db.publications.unshift(publication)

    if (compliance.length > 0) {
      a.todayStats.bloccati_compliance = (a.todayStats.bloccati_compliance ?? 0) + 1
      pushMail(ctx.db, agentId, 'PUBLISH_FAILED', `Pubblicazione bloccata: ${product.name}`, `Problemi di compliance: ${compliance.join(', ')}`)
      completeTask(ctx, task, agentId, `${product.name}: bloccato in compliance (${compliance.join(', ')})`)
      return
    }

    a.todayStats.pronti_per_pubblicazione = (a.todayStats.pronti_per_pubblicazione ?? 0) + 1
    pushMail(
      ctx.db,
      agentId,
      'PUBLISH_SUCCESS',
      `ACTION REQUIRED: pubblica ${product.name}`,
      `Tutto pronto. Unica azione manuale necessaria:\n\n${publication.humanActionInstructions}`,
    )
    completeTask(ctx, task, agentId, `${product.name}: pronto per pubblicazione — azione umana richiesta`)
  } catch (err) {
    failTask(ctx, task, agentId, err instanceof Error ? err.message : String(err))
  }
}
