import type { AgentId, TaskType } from '../types'
import { AGENT_ORDER } from '../data/agents'

export interface StageDef {
  agentId: AgentId
  taskType: TaskType
  taskTitle: (productName: string) => string
  progressLabel: string
  totalRange: [number, number]
  workingActivity: (productName: string) => string
  handoffMessage: (productName: string, nextAgentName: string) => string
}

export const STAGES: StageDef[] = [
  {
    agentId: 'alessia',
    taskType: 'PRODUCT_RESEARCH',
    taskTitle: () => 'Scouting nuovi prodotti TikTok Shop',
    progressLabel: 'products',
    totalRange: [8, 20],
    workingActivity: () => 'Analisi catalogo TikTok Shop',
    handoffMessage: (p) => `${p} selezionato`,
  },
  {
    agentId: 'tommaso',
    taskType: 'TREND_RESEARCH',
    taskTitle: (p) => `Ricerca trend per ${p}`,
    progressLabel: 'formats',
    totalRange: [3, 6],
    workingActivity: () => 'Analisi hook e format concorrenti',
    handoffMessage: (p) => `Insight creativi pronti per ${p}`,
  },
  {
    agentId: 'marta',
    taskType: 'CONTENT_SCRIPT',
    taskTitle: (p) => `Script per ${p}`,
    progressLabel: 'variants',
    totalRange: [2, 4],
    workingActivity: () => 'Scrittura hook, script e caption',
    handoffMessage: (p) => `Script pronto: ${p}`,
  },
  {
    agentId: 'riccardo',
    taskType: 'VIDEO_PRODUCTION',
    taskTitle: (p) => `Produzione video ${p}`,
    progressLabel: 'render steps',
    totalRange: [3, 6],
    workingActivity: () => 'Composizione asset e rendering',
    handoffMessage: (p) => `Video pronto: ${p}`,
  },
  {
    agentId: 'elena',
    taskType: 'PUBLISHING',
    taskTitle: (p) => `Review & pubblicazione ${p}`,
    progressLabel: 'checks',
    totalRange: [2, 4],
    workingActivity: () => 'Verifica compliance e disclosure AI',
    handoffMessage: (p) => `${p} inviato ad analytics`,
  },
  {
    agentId: 'federico',
    taskType: 'PERFORMANCE_ANALYSIS',
    taskTitle: (p) => `Analisi performance ${p}`,
    progressLabel: 'metriche',
    totalRange: [3, 5],
    workingActivity: () => 'Elaborazione click, ordini e conversioni',
    handoffMessage: () => 'Report inviato',
  },
]

export function stageIndexForAgent(agentId: AgentId): number {
  return AGENT_ORDER.indexOf(agentId)
}
