// Real video rendering via ffmpeg — no external video-generation API, no
// stock footage license needed: kinetic-typography clips (colored
// segments + on-screen text + burned captions + real TTS voiceover) built
// entirely from the product's own real script. Output is an actual MP4
// file, playable, saved to disk (then uploaded as a real asset).
//
// This is deliberately swappable: RICCARDO_VIDEO_PROVIDER could later
// point at a paid AI video generator without touching agents/riccardo.ts,
// which only calls renderVideo().
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { synthesizeVoiceover } from './tts.js'
import type { ContentStrategy } from '../types.js'

const execFileAsync = promisify(execFile)

const PALETTE = ['0x0B0E1A', '0xFF2F6E', '0x7C5CFF', '0x35E6C4', '0xFFB648']
const WIDTH = 1080
const HEIGHT = 1920

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\u2019").replace(/%/g, '\\%')
}

function srtTimestamp(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000))
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const msPart = String(ms % 1000).padStart(3, '0')
  return `${h}:${m}:${s},${msPart}`
}

async function ffprobeDuration(path: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path])
  const val = parseFloat(stdout.trim())
  return Number.isFinite(val) && val > 0 ? val : 0
}

function buildSubtitlesSrt(voiceoverScript: string, totalDurationSec: number): string {
  const sentences = voiceoverScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length === 0) return ''
  const perSentence = totalDurationSec / sentences.length
  let out = ''
  sentences.forEach((sentence, i) => {
    const start = i * perSentence
    const end = (i + 1) * perSentence
    out += `${i + 1}\n${srtTimestamp(start)} --> ${srtTimestamp(end)}\n${sentence}\n\n`
  })
  return out
}

export interface RenderInput {
  strategy: ContentStrategy
  productName: string
  workDir: string
  outMp4Path: string
}

export interface RenderResult {
  durationSec: number
  log: string[]
}

export async function renderVideo({ strategy, productName, workDir, outMp4Path }: RenderInput): Promise<RenderResult> {
  const log: string[] = []
  await mkdir(workDir, { recursive: true })

  // 1) Real TTS voiceover.
  const voPath = join(workDir, 'voiceover.wav')
  await synthesizeVoiceover(strategy.voiceoverScript || `${strategy.hook}. ${productName}.`, voPath)
  const voDuration = await ffprobeDuration(voPath)
  log.push(`voiceover: ${voDuration.toFixed(1)}s`)

  const shots = strategy.storyboard.length > 0 ? strategy.storyboard : [{ shot: 1, description: strategy.hook, durationSec: Math.max(6, voDuration) }]
  const shotsTotalSec = shots.reduce((s, sh) => s + sh.durationSec, 0)
  const scale = voDuration > 0 ? Math.max(1, voDuration / shotsTotalSec) : 1

  // 2) Build one lavfi color+drawtext segment per shot, scaled to match voiceover length.
  const segmentPaths: string[] = []
  const captions = [strategy.hook, productName, ...(strategy.onScreenText ?? []), strategy.cta]
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    const dur = Math.max(1, shot.durationSec * scale)
    const color = PALETTE[i % PALETTE.length]
    const caption = escapeDrawtext(captions[i] ?? captions[captions.length - 1] ?? productName)
    const segPath = join(workDir, `seg${i}.mp4`)
    // Keep the on-screen caption in the upper third so it never collides
    // with the burned voiceover captions, which sit near the bottom.
    const drawtext = [
      `drawtext=text='${caption}':fontcolor=white:fontsize=58:box=1:boxcolor=black@0.4:boxborderw=22`,
      `x=(w-text_w)/2:y=h*0.22:line_spacing=10`,
    ].join(':')
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=${WIDTH}x${HEIGHT}:d=${dur.toFixed(2)}`,
      '-vf',
      drawtext,
      '-r',
      '30',
      '-pix_fmt',
      'yuv420p',
      segPath,
    ])
    segmentPaths.push(segPath)
  }
  log.push(`rendered ${segmentPaths.length} segments`)

  // 3) Concat segments into one silent visual track.
  const concatListPath = join(workDir, 'concat.txt')
  await writeFile(concatListPath, segmentPaths.map((p) => `file '${p}'`).join('\n'), 'utf8')
  const visualPath = join(workDir, 'visual.mp4')
  await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', visualPath])

  // 4) Burn captions (from the real voiceover script) + mux the real voiceover audio.
  const visualDuration = await ffprobeDuration(visualPath)
  const srt = buildSubtitlesSrt(strategy.voiceoverScript || strategy.hook, visualDuration)
  const srtPath = join(workDir, 'captions.srt')
  await writeFile(srtPath, srt, 'utf8')

  const subtitleStyle = "FontName=DejaVu Sans,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=2,MarginV=90"
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    visualPath,
    '-i',
    voPath,
    '-vf',
    `subtitles=${srtPath.replace(/:/g, '\\:')}:force_style='${subtitleStyle}'`,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    outMp4Path,
  ])

  const finalDuration = await ffprobeDuration(outMp4Path)
  log.push(`final duration: ${finalDuration.toFixed(1)}s`)

  await rm(workDir, { recursive: true, force: true }).catch(() => {})
  return { durationSec: finalDuration, log }
}
