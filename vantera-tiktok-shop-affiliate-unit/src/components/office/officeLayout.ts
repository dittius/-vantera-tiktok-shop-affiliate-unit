import type { AgentId, ZoneId } from '../../types'
import type { TilePos } from './iso'

export interface ZoneLayout {
  id: ZoneId
  label: string
  agentId: AgentId | null
  deskTile: TilePos
  tint: string
  labelTile: TilePos
}

/**
 * Moves a tile straight UP on screen (same projected X) by decreasing both
 * col and row equally — since screenX = (col-row)*TILE_W/2 stays constant
 * when col and row shift by the same amount, while screenY moves by
 * -2*k*(TILE_H/2). Keeps zone labels floating cleanly above their own desk
 * instead of drifting into a neighbouring zone.
 */
function above(tile: TilePos, k: number): TilePos {
  return { col: tile.col - k, row: tile.row - k }
}

const RAW_ZONES: Omit<ZoneLayout, 'labelTile'>[] = [
  {
    id: 'product-research',
    label: 'Product Research',
    agentId: 'alessia',
    deskTile: { col: 2.5, row: 2 },
    tint: '#ff2f6e',
  },
  {
    id: 'trend-research',
    label: 'Trend Research',
    agentId: 'tommaso',
    deskTile: { col: 6.5, row: 1.6 },
    tint: '#7c5cff',
  },
  {
    id: 'content-desk',
    label: 'Content Desk',
    agentId: 'marta',
    deskTile: { col: 10.5, row: 2 },
    tint: '#ffb648',
  },
  {
    id: 'video-studio',
    label: 'Video Studio',
    agentId: 'riccardo',
    deskTile: { col: 2.2, row: 5.6 },
    tint: '#35e6c4',
  },
  {
    id: 'publishing-desk',
    label: 'Publishing Desk',
    agentId: 'elena',
    deskTile: { col: 6.5, row: 6 },
    tint: '#ff7ac6',
  },
  {
    id: 'analytics-room',
    label: 'Analytics Room',
    agentId: 'federico',
    deskTile: { col: 10.6, row: 5.6 },
    tint: '#4fa9ff',
  },
  {
    id: 'relax-area',
    label: 'Relax Area',
    agentId: null,
    deskTile: { col: 6.4, row: 8.3 },
    tint: '#35e6c4',
  },
]

export const ZONES: ZoneLayout[] = RAW_ZONES.map((z) => ({
  ...z,
  labelTile: above(z.deskTile, 2.6),
}))

export function zoneById(id: ZoneId): ZoneLayout {
  const z = ZONES.find((z) => z.id === id)
  if (!z) throw new Error(`Unknown zone ${id}`)
  return z
}

/** Character stands slightly in front of the desk, facing it. */
export function standTileFor(zoneId: ZoneId): TilePos {
  const z = zoneById(zoneId)
  return { col: z.deskTile.col, row: z.deskTile.row + 0.7 }
}
