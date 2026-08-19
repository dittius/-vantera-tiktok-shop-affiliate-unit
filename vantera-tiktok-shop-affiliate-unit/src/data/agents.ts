import type { Agent, AgentId, ZoneId } from '../types'

export interface AgentDefinition {
  id: AgentId
  name: string
  role: Agent['role']
  homeZone: ZoneId
  senderLabel: string // internal mail "from" identity, not a real email
  colorMain: string
  colorSkin: string
  colorHair: string
  scope: string[]
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'alessia',
    name: 'Alessia Riva',
    role: 'Product Scout',
    homeZone: 'product-research',
    senderLabel: 'alessia.riva@unit.internal',
    colorMain: '#ff2f6e',
    colorSkin: '#f2c29a',
    colorHair: '#3b2a20',
    scope: ['Ricerca prodotti', 'Valutazione opportunità', 'Ranking prodotti'],
  },
  {
    id: 'tommaso',
    name: 'Tommaso Greco',
    role: 'Trend Researcher',
    homeZone: 'trend-research',
    senderLabel: 'tommaso.greco@unit.internal',
    colorMain: '#7c5cff',
    colorSkin: '#e8b48a',
    colorHair: '#1c1c1c',
    scope: ['Analisi trend', 'Format performanti', 'Analisi creativa concorrenti'],
  },
  {
    id: 'marta',
    name: 'Marta Bellini',
    role: 'Content Writer',
    homeZone: 'content-desk',
    senderLabel: 'marta.bellini@unit.internal',
    colorMain: '#ffb648',
    colorSkin: '#f4d0ad',
    colorHair: '#7a3b1e',
    scope: ['Script', 'Hook', 'Caption', 'Varianti creative'],
  },
  {
    id: 'riccardo',
    name: 'Riccardo Sala',
    role: 'Video Maker',
    homeZone: 'video-studio',
    senderLabel: 'riccardo.sala@unit.internal',
    colorMain: '#35e6c4',
    colorSkin: '#e3ab7a',
    colorHair: '#111827',
    scope: ['Produzione video', 'Montaggio', 'Rendering', 'Varianti video'],
  },
  {
    id: 'elena',
    name: 'Elena Moretti',
    role: 'Publisher',
    homeZone: 'publishing-desk',
    senderLabel: 'elena.moretti@unit.internal',
    colorMain: '#ff7ac6',
    colorSkin: '#f2c29a',
    colorHair: '#4a2a12',
    scope: ['Compliance', 'Disclosure AI', 'Pubblicazione'],
  },
  {
    id: 'federico',
    name: 'Federico Conti',
    role: 'Performance Analyst',
    homeZone: 'analytics-room',
    senderLabel: 'federico.conti@unit.internal',
    colorMain: '#4fa9ff',
    colorSkin: '#e8b48a',
    colorHair: '#232323',
    scope: ['Performance', 'Conversion', 'Vincitori', 'Decisioni replica/stop'],
  },
]

export function createInitialAgents(): Record<AgentId, Agent> {
  const now = Date.now()
  const agents = {} as Record<AgentId, Agent>
  for (const def of AGENT_DEFINITIONS) {
    agents[def.id] = {
      id: def.id,
      name: def.name,
      role: def.role,
      status: 'IDLE',
      currentTask: null,
      currentTaskId: null,
      currentLocation: def.homeZone,
      homeZone: def.homeZone,
      activity: '',
      progress: null,
      lastUpdate: now,
      todayStats: {},
      lastOutputs: [],
      history: [],
      errors: [],
    }
  }
  return agents
}

export const AGENT_ORDER: AgentId[] = [
  'alessia',
  'tommaso',
  'marta',
  'riccardo',
  'elena',
  'federico',
]

export function agentDef(id: AgentId): AgentDefinition {
  const def = AGENT_DEFINITIONS.find((a) => a.id === id)
  if (!def) throw new Error(`Unknown agent id ${id}`)
  return def
}
