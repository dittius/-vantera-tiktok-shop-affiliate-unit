// Riccardo — Video Maker. Actually renders a real, playable MP4 (ffmpeg +
// real TTS voiceover, see video/render.ts) from Marta's script and uploads
// it as a real asset (GitHub Release, see media/githubReleaseStorage.ts).
// Never marks a video READY without a real file + real public URL.
import { join } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import type { AgentContext } from './context.js'
import { agentOf, completeTask, createTask, failTask, findOpenTask, startTask } from './context.js'
import { makeId } from '../db/store.js'
import { renderVideo } from '../video/render.js'
import { uploadVideoAsset } from '../media/githubReleaseStorage.js'
import { pushMail } from '../mail/compose.js'
import type { VideoAsset } from '../types.js'

export async function runRiccardo(ctx: AgentContext): Promise<void> {
  const agentId = 'riccardo' as const
  const a = agentOf(ctx, agentId)

  let task = findOpenTask(ctx, agentId)
  if (!task) {
    const pending = ctx.db.tasks.find((t) => t.type === 'VIDEO_PRODUCTION' && t.assigneeId === agentId && t.status === 'QUEUED')
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
  if (!product || !strategy) {
    failTask(ctx, task, agentId, 'Script mancante — non posso produrre un video senza un brief scritto.')
    return
  }

  startTask(ctx, task, agentId, `Rendering video per ${product.name}`, 1)

  const videoId = makeId('video')
  const videoRecord: VideoAsset = {
    id: videoId,
    contentStrategyId: strategy.id,
    productId: product.id,
    status: 'RENDERING',
    durationSec: null,
    publicUrl: null,
    renderLog: [],
    producedByAgentId: agentId,
    createdAt: ctx.now,
  }
  ctx.db.videos.unshift(videoRecord)

  const isGithubActions = Boolean(process.env.GITHUB_ACTIONS)
  let workDir: string | null = null
  try {
    workDir = await mkdtemp(join(tmpdir(), 'vantera-render-'))
    const outPath = join(tmpdir(), `${videoId}.mp4`)
    const { durationSec, log } = await renderVideo({ strategy, productName: product.name, workDir, outMp4Path: outPath })

    let publicUrl: string
    if (isGithubActions) {
      publicUrl = await uploadVideoAsset(outPath, `${videoId}.mp4`)
    } else {
      // Local/dev run outside Actions: no GITHUB_TOKEN to upload with —
      // keep the real rendered file path so it can still be inspected.
      publicUrl = `file://${outPath}`
      log.push('running outside GitHub Actions: skipped upload, kept local file path')
    }

    videoRecord.status = 'READY'
    videoRecord.durationSec = durationSec
    videoRecord.publicUrl = publicUrl
    videoRecord.renderLog = log

    a.todayStats.video_prodotti = (a.todayStats.video_prodotti ?? 0) + 1

    createTask(ctx, {
      type: 'PUBLISHING',
      title: `Review & pubblicazione ${product.name}`,
      assigneeId: 'elena',
      createdByAgentId: agentId,
      productId: product.id,
      reason: `Video pronto (${durationSec.toFixed(1)}s)`,
      idempotencyKey: `publishing-${videoId}`,
    })

    pushMail(
      ctx.db,
      agentId,
      'VIDEO_READY',
      `Video pronto: ${product.name}`,
      `Durata ${durationSec.toFixed(1)}s.\n${publicUrl.startsWith('file://') ? 'File locale (run fuori da GitHub Actions): ' : 'URL pubblico: '}${publicUrl}`,
    )
    completeTask(ctx, task, agentId, `Video renderizzato: ${product.name} (${durationSec.toFixed(1)}s)`)
  } catch (err) {
    videoRecord.status = 'FAILED'
    videoRecord.renderLog.push(err instanceof Error ? err.message : String(err))
    failTask(ctx, task, agentId, `Rendering fallito: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
