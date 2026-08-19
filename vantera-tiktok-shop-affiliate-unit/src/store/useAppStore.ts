import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Agent,
  AgentId,
  ActivityLogEntry,
  Asset,
  CreativeResearch,
  InternalMail,
  Performance,
  Product,
  Publication,
  Script,
  Task,
  TikTokConnectionStatus,
  VideoVariant,
  ZoneId,
} from '../types'
import { AGENT_ORDER, agentDef, createInitialAgents } from '../data/agents'
import { STAGES } from '../sim/stages'
import {
  DEMO_CATEGORIES,
  DEMO_COMPETITOR_SIGNALS,
  DEMO_CTA_PATTERNS,
  DEMO_FORMAT_INSIGHTS,
  DEMO_HOOK_TEMPLATES,
  DEMO_PRODUCT_NAMES,
  pickN,
} from '../data/demoContent'
import { makeId } from '../utils/id'
import { formatDayLabel } from '../utils/time'
import { randInt, chance } from '../utils/random'

export type Screen = 'office' | 'mail' | 'earnings' | 'control'

interface PipelineRun {
  id: string
  productId: string
  productName: string
  stageIdx: number
  phase: 'WORKING' | 'HANDOFF'
  followUpNote?: string
  videoId?: string
}

interface FollowUpSeed {
  agentId: AgentId
  note: string
  productHint?: string
}

interface AppState {
  agents: Record<AgentId, Agent>
  tasks: Task[]
  products: Product[]
  creativeResearch: CreativeResearch[]
  scripts: Script[]
  assets: Asset[]
  videos: VideoVariant[]
  publications: Publication[]
  performance: Performance[]
  mail: InternalMail[]
  activityLog: ActivityLogEntry[]

  running: boolean
  demoMode: boolean
  tiktokStatus: TikTokConnectionStatus
  run: PipelineRun | null
  followUpQueue: FollowUpSeed[]
  usedProductNames: string[]
  cyclesCompletedToday: number
  pendingReturns: AgentId[]

  screen: Screen
  selectedAgentId: AgentId | null

  setRunning: (v: boolean) => void
  toggleRunning: () => void
  setDemoMode: (v: boolean) => void
  setScreen: (s: Screen) => void
  selectAgent: (id: AgentId | null) => void
  markMailRead: (id: string) => void
  markAllMailRead: () => void
  tick: () => void
  resetAll: () => void
}

function initialAgentsFrozen(): Record<AgentId, Agent> {
  return createInitialAgents()
}

function pushLog(
  log: ActivityLogEntry[],
  kind: ActivityLogEntry['kind'],
  agentId: AgentId | null,
  message: string,
  isDemo: boolean,
) {
  log.unshift({ id: makeId('log'), timestamp: Date.now(), kind, agentId, message, isDemo })
  if (log.length > 300) log.length = 300
}

function pushHistory(agent: Agent, label: string, detail?: string) {
  agent.history.unshift({ id: makeId('hist'), timestamp: Date.now(), label, detail })
  if (agent.history.length > 50) agent.history.length = 50
}

function zoneOf(agentId: AgentId): ZoneId {
  return agentDef(agentId).homeZone
}

function nextProductName(usedRecently: string[], hint?: string): string {
  if (hint) return hint
  const pool = DEMO_PRODUCT_NAMES.filter((n) => !usedRecently.includes(n))
  const source = pool.length > 0 ? pool : DEMO_PRODUCT_NAMES
  return source[randInt(0, source.length - 1)]
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      agents: initialAgentsFrozen(),
      tasks: [],
      products: [],
      creativeResearch: [],
      scripts: [],
      assets: [],
      videos: [],
      publications: [],
      performance: [],
      mail: [],
      activityLog: [],

      running: false,
      demoMode: false,
      tiktokStatus: 'NOT_CONNECTED',
      run: null,
      followUpQueue: [],
      usedProductNames: [],
      cyclesCompletedToday: 0,
      pendingReturns: [],

      screen: 'office',
      selectedAgentId: null,

      setRunning: (v) =>
        set((s) => {
          s.running = v
          pushLog(s.activityLog, 'SYSTEM', null, v ? 'Unit AVVIATA' : 'Unit IN PAUSA', s.demoMode)
        }),
      toggleRunning: () => get().setRunning(!get().running),
      setDemoMode: (v) =>
        set((s) => {
          s.demoMode = v
          s.tiktokStatus = v ? 'DEMO' : 'NOT_CONNECTED'
          pushLog(
            s.activityLog,
            'SYSTEM',
            null,
            v ? 'DEMO MODE attivata' : 'DEMO MODE disattivata',
            true,
          )
          if (!v) {
            // Leaving demo mode: drop any in-flight simulated run/state so
            // no fabricated task keeps animating once demo data is off.
            s.run = null
            for (const id of AGENT_ORDER) {
              const a = s.agents[id]
              a.status = 'IDLE'
              a.currentTask = null
              a.currentTaskId = null
              a.progress = null
              a.activity = ''
              a.currentLocation = a.homeZone
            }
          }
        }),
      setScreen: (screen) => set((s) => void (s.screen = screen)),
      selectAgent: (id) => set((s) => void (s.selectedAgentId = id)),
      markMailRead: (id) =>
        set((s) => {
          const m = s.mail.find((m) => m.id === id)
          if (m) m.read = true
        }),
      markAllMailRead: () =>
        set((s) => {
          for (const m of s.mail) m.read = true
        }),

      resetAll: () =>
        set((s) => {
          s.agents = initialAgentsFrozen()
          s.tasks = []
          s.products = []
          s.creativeResearch = []
          s.scripts = []
          s.assets = []
          s.videos = []
          s.publications = []
          s.performance = []
          s.mail = []
          s.activityLog = []
          s.running = false
          s.demoMode = false
          s.tiktokStatus = 'NOT_CONNECTED'
          s.run = null
          s.followUpQueue = []
          s.usedProductNames = []
          s.cyclesCompletedToday = 0
          s.pendingReturns = []
        }),

      tick: () =>
        set((s) => {
          if (!s.running) return

          // Agents who delivered a handoff last tick have finished standing
          // at their colleague's desk — send them back home now, before
          // anything else runs this tick.
          if (s.pendingReturns.length > 0) {
            for (const id of s.pendingReturns) {
              const a = s.agents[id]
              if (a.status === 'WALKING') {
                a.currentLocation = a.homeZone
                a.activity = ''
              }
            }
            s.pendingReturns = []
          }

          // --- Ambient ripple: agents not tied to the active run wander gently ---
          for (const id of AGENT_ORDER) {
            const a = s.agents[id]
            const isRunAgent = s.run ? STAGES[s.run.stageIdx].agentId === id : false
            if (isRunAgent) continue
            if (a.status === 'WALKING' && a.currentLocation === a.homeZone) {
              a.status = 'IDLE'
              continue
            }
            if (a.status === 'WALKING' && a.currentLocation === 'relax-area') {
              a.status = 'RELAX'
              continue
            }
            if (!s.demoMode || !s.run) {
              if (a.status === 'IDLE' && chance(6)) {
                a.status = 'WALKING'
                a.currentLocation = 'relax-area'
                a.activity = ''
              } else if (a.status === 'RELAX' && chance(10)) {
                a.status = 'WALKING'
                a.currentLocation = a.homeZone
                a.activity = ''
              }
            }
          }

          if (!s.demoMode) return

          // --- Demo pipeline engine ---
          if (!s.run) {
            const seed = s.followUpQueue.shift()
            const startStageIdx = seed ? STAGES.findIndex((st) => st.agentId === seed.agentId) : 0
            const stage = STAGES[Math.max(0, startStageIdx)]
            const productName = nextProductName(s.usedProductNames, seed?.productHint)
            s.usedProductNames.push(productName)
            if (s.usedProductNames.length > 6) s.usedProductNames.shift()

            const productId = makeId('prod')
            // Even when a Federico follow-up starts the run past Alessia's
            // stage, the product still needs a real record so later stages
            // (and the Earnings breakdowns) can reference it by name.
            s.products.push({
              id: productId,
              name: productName,
              category: DEMO_CATEGORIES[randInt(0, DEMO_CATEGORIES.length - 1)],
              price: Math.round((randInt(9, 60) + Math.random()) * 100) / 100,
              currency: 'EUR',
              commissionPct: randInt(8, 25),
              saturation: (['LOW', 'MEDIUM', 'HIGH'] as const)[randInt(0, 2)],
              materialAvailability: (['LOW', 'MEDIUM', 'HIGH'] as const)[randInt(0, 2)],
              score: randInt(55, 98),
              status: startStageIdx <= 0 ? 'CANDIDATE' : 'SELECTED',
              discoveredByAgentId: 'alessia',
              isDemo: true,
              createdAt: Date.now(),
            })

            const run: PipelineRun = {
              id: makeId('run'),
              productId,
              productName,
              stageIdx: Math.max(0, startStageIdx),
              phase: 'WORKING',
              followUpNote: seed?.note,
            }
            s.run = run
            const total = randInt(stage.totalRange[0], stage.totalRange[1])
            const agent = s.agents[stage.agentId]
            agent.status = 'WORKING'
            agent.currentTask = stage.taskTitle(productName)
            agent.currentTaskId = run.id
            agent.currentLocation = agent.homeZone
            agent.activity = stage.workingActivity(productName)
            agent.progress = { current: 0, total }
            agent.lastUpdate = Date.now()
            pushHistory(agent, `Avviato: ${agent.currentTask}`, seed?.note)
            pushLog(
              s.activityLog,
              'TASK_CREATED',
              agent.id,
              `${agent.name} inizia: ${agent.currentTask}`,
              true,
            )
            const task: Task = {
              id: run.id,
              type: stage.taskType,
              title: agent.currentTask,
              status: 'IN_PROGRESS',
              assigneeId: agent.id,
              createdByAgentId: seed ? 'federico' : null,
              createdAt: Date.now(),
              startedAt: Date.now(),
              completedAt: null,
              productId,
              isDemo: true,
              reason: seed?.note,
              progress: { current: 0, total },
            }
            s.tasks.unshift(task)
            if (s.tasks.length > 200) s.tasks.length = 200
            return
          }

          const run = s.run
          const stage = STAGES[run.stageIdx]
          const agent = s.agents[stage.agentId]

          if (agent.progress) {
            agent.progress.current = Math.min(
              agent.progress.total,
              agent.progress.current + randInt(1, 2),
            )
            agent.lastUpdate = Date.now()
            const task = s.tasks.find((t) => t.id === run.id)
            if (task) task.progress.current = agent.progress.current

            if (agent.progress.current >= agent.progress.total) {
              completeStage(s, run, stage, agent)
              return
            }
          }
        }),
    })),
    {
      name: 'vantera-tiktok-affiliate-unit',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        agents: s.agents,
        tasks: s.tasks,
        products: s.products,
        creativeResearch: s.creativeResearch,
        scripts: s.scripts,
        assets: s.assets,
        videos: s.videos,
        publications: s.publications,
        performance: s.performance,
        mail: s.mail,
        activityLog: s.activityLog,
        running: s.running,
        demoMode: s.demoMode,
        tiktokStatus: s.tiktokStatus,
        run: s.run,
        followUpQueue: s.followUpQueue,
        usedProductNames: s.usedProductNames,
        cyclesCompletedToday: s.cyclesCompletedToday,
        pendingReturns: s.pendingReturns,
      }),
    },
  ),
)

// ---------------------------------------------------------------------------
// Stage completion + handoff logic (kept outside the store body for clarity)
// ---------------------------------------------------------------------------

function completeStage(
  s: ReturnType<typeof useAppStore.getState>,
  run: PipelineRun,
  stage: (typeof STAGES)[number],
  agent: Agent,
) {
  const task = s.tasks.find((t) => t.id === run.id)
  if (task) {
    task.status = 'DONE'
    task.completedAt = Date.now()
  }
  agent.todayStats[stage.progressLabel] = (agent.todayStats[stage.progressLabel] ?? 0) + (agent.progress?.total ?? 0)

  switch (stage.agentId) {
    case 'alessia': {
      const product = s.products.find((p) => p.id === run.productId)
      const selected = chance(80)
      if (product) product.status = selected ? 'SELECTED' : 'REJECTED'
      agent.todayStats.analizzati = (agent.todayStats.analizzati ?? 0) + 1
      agent.todayStats[selected ? 'selezionati' : 'scartati'] =
        (agent.todayStats[selected ? 'selezionati' : 'scartati'] ?? 0) + 1
      agent.lastOutputs.unshift(
        selected ? `${run.productName} — selezionato` : `${run.productName} — scartato`,
      )
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20
      if (!selected) {
        // Rejected: end this run quietly, agent returns to desk, no handoff.
        finishRunEarly(s, agent, `${run.productName} scartato (bassa opportunità)`)
        return
      }
      break
    }
    case 'tommaso': {
      s.creativeResearch.push({
        id: makeId('cr'),
        productId: run.productId,
        hookIdeas: pickN(DEMO_HOOK_TEMPLATES, 2),
        formatInsights: pickN(DEMO_FORMAT_INSIGHTS, 2),
        avgDurationSec: randInt(12, 34),
        ctaPatterns: pickN(DEMO_CTA_PATTERNS, 2),
        competitorSignals: pickN(DEMO_COMPETITOR_SIGNALS, 2),
        authoredByAgentId: 'tommaso',
        isDemo: true,
        createdAt: Date.now(),
      })
      agent.lastOutputs.unshift(`Insight creativi — ${run.productName}`)
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20
      break
    }
    case 'marta': {
      const cr = [...s.creativeResearch].reverse().find((c) => c.productId === run.productId)
      s.scripts.push({
        id: makeId('script'),
        productId: run.productId,
        concept: `Demo/proof format per ${run.productName}`,
        hook: cr?.hookIdeas[0] ?? DEMO_HOOK_TEMPLATES[0],
        body: `Presentazione rapida di ${run.productName}, problema → soluzione → prova.`,
        voiceover: `Se hai ancora questo problema, guarda cosa risolve ${run.productName}.`,
        onScreenText: ['Prima', 'Dopo', 'Link in vetrina'],
        cta: cr?.ctaPatterns[0] ?? DEMO_CTA_PATTERNS[0],
        caption: `${run.productName} — lo trovi nello shop 🛍️ #tiktokshop`,
        variants: agent.progress?.total ?? 2,
        authoredByAgentId: 'marta',
        isDemo: true,
        createdAt: Date.now(),
      })
      agent.lastOutputs.unshift(`Script pronto — ${run.productName}`)
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20
      break
    }
    case 'riccardo': {
      const script = [...s.scripts].reverse().find((sc) => sc.productId === run.productId)
      const videoId = makeId('video')
      s.assets.push(
        { id: makeId('asset'), scriptId: script?.id ?? '', kind: 'IMAGE', name: `${run.productName} — B-roll`, isDemo: true, createdAt: Date.now() },
        { id: makeId('asset'), scriptId: script?.id ?? '', kind: 'VOICEOVER', name: `${run.productName} — voiceover.mp3`, isDemo: true, createdAt: Date.now() },
        { id: makeId('asset'), scriptId: script?.id ?? '', kind: 'SUBTITLE', name: `${run.productName} — subtitles.srt`, isDemo: true, createdAt: Date.now() },
      )
      s.videos.push({
        id: videoId,
        scriptId: script?.id ?? '',
        productId: run.productId,
        title: `${run.productName} — v1`,
        durationSec: randInt(14, 32),
        status: 'READY',
        producedByAgentId: 'riccardo',
        isDemo: true,
        createdAt: Date.now(),
      })
      agent.lastOutputs.unshift(`Video renderizzato — ${run.productName}`)
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20
      run.videoId = videoId
      break
    }
    case 'elena': {
      const video = run.videoId
        ? s.videos.find((v) => v.id === run.videoId)
        : [...s.videos].reverse().find((v) => v.productId === run.productId)
      s.publications.push({
        id: makeId('pub'),
        videoId: video?.id ?? '',
        productId: run.productId,
        status: 'PUBLISHED',
        disclosureAiRequired: true,
        publishedByAgentId: 'elena',
        publishedAt: Date.now(),
        isDemo: true,
        createdAt: Date.now(),
      })
      agent.lastOutputs.unshift(`Pubblicato (demo) — ${run.productName}`)
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20
      break
    }
    case 'federico': {
      const pub = [...s.publications].reverse().find((p) => p.productId === run.productId)
      const product = s.products.find((p) => p.id === run.productId)
      const views = randInt(600, 15000)
      const clicks = Math.floor(views * (randInt(2, 7) / 100))
      const orders = Math.floor(clicks * (randInt(2, 10) / 100))
      const conversionRate = clicks > 0 ? Math.round((orders / clicks) * 1000) / 10 : 0
      const commission = Math.round(orders * (product?.price ?? 20) * ((product?.commissionPct ?? 15) / 100) * 100) / 100
      const verdict: 'WINNER' | 'LOSER' | 'NEUTRAL' =
        conversionRate >= 6 ? 'WINNER' : conversionRate <= 2 ? 'LOSER' : 'NEUTRAL'
      s.performance.push({
        id: makeId('perf'),
        publicationId: pub?.id ?? '',
        productId: run.productId,
        videoId: pub?.videoId ?? '',
        views,
        clicks,
        orders,
        conversionRate,
        commission,
        hookLabel: DEMO_HOOK_TEMPLATES[randInt(0, DEMO_HOOK_TEMPLATES.length - 1)],
        verdict,
        analyzedByAgentId: 'federico',
        isDemo: true,
        createdAt: Date.now(),
      })
      agent.todayStats[verdict === 'WINNER' ? 'vincitori' : verdict === 'LOSER' ? 'da_fermare' : 'neutri'] =
        (agent.todayStats[verdict === 'WINNER' ? 'vincitori' : verdict === 'LOSER' ? 'da_fermare' : 'neutri'] ?? 0) + 1
      agent.lastOutputs.unshift(`${run.productName}: ${verdict} · ${conversionRate}% conv.`)
      if (agent.lastOutputs.length > 20) agent.lastOutputs.length = 20

      if (chance(45)) {
        if (verdict === 'WINNER') {
          s.followUpQueue.push({
            agentId: 'marta',
            note: `Replica hook vincente di "${run.productName}" su un prodotto simile`,
            productHint: undefined,
          })
        } else if (verdict === 'LOSER') {
          s.followUpQueue.push({
            agentId: 'alessia',
            note: `${run.productName} in calo: cerca alternativa nella stessa categoria`,
          })
        } else {
          s.followUpQueue.push({
            agentId: 'tommaso',
            note: `Rivedi il format per "${run.productName}", performance nella media`,
          })
        }
      }
      break
    }
  }

  const nextStageIdx = run.stageIdx + 1
  if (nextStageIdx >= STAGES.length) {
    // Full cycle complete → end of (simulated) day: daily reports for everyone.
    finishCycle(s)
    return
  }

  const nextStage = STAGES[nextStageIdx]
  const nextAgent = s.agents[nextStage.agentId]

  agent.status = 'WALKING'
  agent.currentLocation = zoneOf(nextStage.agentId)
  agent.activity = stage.handoffMessage(run.productName, nextAgent.name)
  agent.currentTask = null
  agent.currentTaskId = null
  agent.progress = null
  pushLog(s.activityLog, 'TASK_HANDOFF', agent.id, `${agent.activity} → ${nextAgent.name}`, true)
  // One tick standing at the colleague's desk to deliver the handoff, then walk home.
  s.pendingReturns.push(agent.id)

  const total = randInt(nextStage.totalRange[0], nextStage.totalRange[1])
  nextAgent.status = 'WORKING'
  nextAgent.currentTask = nextStage.taskTitle(run.productName)
  nextAgent.currentTaskId = run.id
  nextAgent.currentLocation = nextAgent.homeZone
  nextAgent.activity = nextStage.workingActivity(run.productName)
  nextAgent.progress = { current: 0, total }
  nextAgent.lastUpdate = Date.now()
  pushHistory(nextAgent, `Avviato: ${nextAgent.currentTask}`)

  const nextTask: Task = {
    id: run.id,
    type: nextStage.taskType,
    title: nextAgent.currentTask ?? nextStage.taskTitle(run.productName),
    status: 'IN_PROGRESS',
    assigneeId: nextAgent.id,
    createdByAgentId: agent.id,
    createdAt: Date.now(),
    startedAt: Date.now(),
    completedAt: null,
    productId: run.productId,
    isDemo: true,
    progress: { current: 0, total },
  }
  s.tasks.unshift(nextTask)
  if (s.tasks.length > 200) s.tasks.length = 200

  run.stageIdx = nextStageIdx
  run.phase = 'WORKING'

  // Clear the departing agent's activity bubble shortly after the handoff
  // is logged; the office view keeps them WALKING until they reach home.
}

function finishRunEarly(
  s: ReturnType<typeof useAppStore.getState>,
  agent: Agent,
  reason: string,
) {
  pushLog(s.activityLog, 'TASK_DONE', agent.id, reason, true)
  agent.status = 'WALKING'
  agent.currentLocation = agent.homeZone
  agent.currentTask = null
  agent.currentTaskId = null
  agent.progress = null
  agent.activity = ''
  s.run = null
}

function finishCycle(s: ReturnType<typeof useAppStore.getState>) {
  const federico = s.agents.federico
  federico.status = 'WALKING'
  federico.currentLocation = federico.homeZone
  federico.currentTask = null
  federico.currentTaskId = null
  federico.progress = null
  federico.activity = ''

  const now = Date.now()
  const dayLabel = formatDayLabel(now)
  let minuteOffset = 0
  for (const id of AGENT_ORDER) {
    const agent = s.agents[id]
    const isFederico = id === 'federico'
    const statsLines = Object.entries(agent.todayStats)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')
    s.mail.unshift({
      id: makeId('mail'),
      fromAgentId: id,
      fromName: agent.name,
      subject: isFederico ? 'DAILY PERFORMANCE REPORT' : `DAILY REPORT | ${dayLabel}`,
      category: isFederico ? 'DAILY_PERFORMANCE_REPORT' : 'DAILY_REPORT',
      body:
        statsLines.length > 0
          ? `Riepilogo attività — ${agent.role}.\n${statsLines}`
          : `Nessuna attività registrata oggi — ${agent.role}.`,
      stats: { ...agent.todayStats },
      timestamp: now + minuteOffset * 60000,
      read: false,
      isDemo: true,
    })
    minuteOffset += 2
    pushHistory(agent, 'Daily report inviato', dayLabel)
    agent.todayStats = {}
  }
  if (s.mail.length > 300) s.mail.length = 300
  pushLog(s.activityLog, 'MAIL', null, `Daily reports generati per tutto il team (${dayLabel})`, true)
  s.cyclesCompletedToday += 1
  s.run = null
}
