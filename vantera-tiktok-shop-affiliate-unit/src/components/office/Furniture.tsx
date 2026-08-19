import type { TilePos } from './iso'
import { toScreen } from './iso'

interface BoxProps {
  tile: TilePos
  w: number // footprint half-width in tile units (0..1)
  d: number // footprint half-depth in tile units (0..1)
  h: number // height in screen px
  top: string
  left: string
  right: string
  liftY?: number // extra vertical offset (e.g. sits on a desk)
}

const TILE_W = 64
const TILE_H = 32

/** A flat-top 3-face iso box: the basic primitive for all furniture. */
export function IsoBox({ tile, w, d, h, top, left, right, liftY = 0 }: BoxProps) {
  const { x, y } = toScreen(tile)
  const hw = w * (TILE_W / 2)
  const hd = d * (TILE_H / 2)
  const baseY = y - liftY
  const topPts = [
    [0, -hd],
    [hw, 0],
    [0, hd],
    [-hw, 0],
  ]
    .map((p) => `${p[0]},${p[1]}`)
    .join(' ')
  return (
    <g transform={`translate(${x},${baseY})`}>
      <polygon points={`${-hw},0 0,${hd} 0,${hd - h} ${-hw},${-h}`} fill={left} />
      <polygon points={`${hw},0 0,${hd} 0,${hd - h} ${hw},${-h}`} fill={right} />
      <polygon points={topPts} fill={top} transform={`translate(0,${-h})`} />
    </g>
  )
}

export function Desk({ tile }: { tile: TilePos }) {
  return (
    <g>
      <IsoBox tile={tile} w={0.85} d={0.85} h={20} top="#8a5a3b" left="#5f3c26" right="#71481f" />
      {/* monitor */}
      <IsoBox tile={tile} w={0.32} d={0.06} h={18} top="#0e1220" left="#0a0d18" right="#05070c" liftY={20} />
      <MonitorGlow tile={tile} />
      {/* keyboard */}
      <IsoBox tile={tile} w={0.24} d={0.14} h={2} top="#2b3358" left="#1c2140" right="#171b33" liftY={20} />
    </g>
  )
}

function MonitorGlow({ tile }: { tile: TilePos }) {
  const { x, y } = toScreen(tile)
  return (
    <rect
      x={x - 7}
      y={y - 46}
      width={14}
      height={9}
      fill="#35e6c4"
      opacity={0.85}
      style={{ animation: 'flicker 2.6s ease-in-out infinite' }}
    />
  )
}

export function Chair({ tile, facing = 'south' }: { tile: TilePos; facing?: 'south' | 'north' }) {
  const dy = facing === 'south' ? 0.55 : -0.55
  const t: TilePos = { col: tile.col, row: tile.row + dy }
  return <IsoBox tile={t} w={0.28} d={0.28} h={12} top="#3a3f5c" left="#262a44" right="#1d2036" />
}

export function Plant({ tile }: { tile: TilePos }) {
  const { x, y } = toScreen(tile)
  return (
    <g transform={`translate(${x},${y})`}>
      <IsoBox tile={{ col: 0, row: 0 }} w={0.22} d={0.22} h={10} top="#a3603a" left="#7a4527" right="#623520" />
      <g style={{ transformOrigin: '0px -24px', animation: 'leaf-sway 4.5s ease-in-out infinite' }}>
        <ellipse cx={0} cy={-26} rx={11} ry={9} fill="#2f8f5b" />
        <ellipse cx={-6} cy={-31} rx={7} ry={6} fill="#3aa96a" />
        <ellipse cx={7} cy={-30} rx={7} ry={6} fill="#249160" />
      </g>
    </g>
  )
}

export function Sofa({ tile, color = '#7c5cff' }: { tile: TilePos; color?: string }) {
  return (
    <g>
      <IsoBox tile={tile} w={0.9} d={0.5} h={14} top={color} left={shade(color, -30)} right={shade(color, -50)} />
      <IsoBox
        tile={{ col: tile.col, row: tile.row - 0.42 }}
        w={0.9}
        d={0.12}
        h={16}
        top={shade(color, 10)}
        left={shade(color, -20)}
        right={shade(color, -40)}
      />
    </g>
  )
}

export function CoffeeTable({ tile }: { tile: TilePos }) {
  return <IsoBox tile={tile} w={0.35} d={0.35} h={8} top="#c9c2a8" left="#a49c82" right="#8d8569" />
}

export function BigScreen({ tile }: { tile: TilePos }) {
  const { x, y } = toScreen(tile)
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-30} y={-96} width={60} height={36} rx={2} fill="#0a0d18" />
      <rect x={-26} y={-92} width={52} height={28} fill="#12213f" />
      <rect x={-24} y={-90} width={22} height={9} fill="#35e6c4" opacity={0.75} style={{ animation: 'flicker 3.1s ease-in-out infinite' }} />
      <rect x={0} y={-90} width={22} height={20} fill="#ff2f6e" opacity={0.55} style={{ animation: 'flicker 2.3s ease-in-out infinite' }} />
      <rect x={-24} y={-79} width={10} height={7} fill="#7c5cff" opacity={0.7} />
    </g>
  )
}

export function Corkboard({ tile }: { tile: TilePos }) {
  const { x, y } = toScreen(tile)
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-24} y={-84} width={48} height={32} fill="#b6895a" />
      <rect x={-24} y={-84} width={48} height={32} fill="none" stroke="#7a5636" strokeWidth={2} />
      <rect x={-18} y={-78} width={12} height={9} fill="#ffe08a" transform="rotate(-4)" />
      <rect x={-2} y={-76} width={12} height={9} fill="#ff9ab0" transform="rotate(3)" />
      <rect x={12} y={-80} width={10} height={8} fill="#8ce0d0" transform="rotate(-2)" />
    </g>
  )
}

export function FolderStack({ tile }: { tile: TilePos }) {
  return (
    <g>
      <IsoBox tile={tile} w={0.14} d={0.14} h={4} top="#ff9ab0" left="#e0708f" right="#c05a76" liftY={20} />
      <IsoBox tile={tile} w={0.14} d={0.14} h={4} top="#8ce0d0" left="#5cc3b0" right="#41a897" liftY={24} />
    </g>
  )
}

export function RingLight({ tile }: { tile: TilePos }) {
  const { x, y } = toScreen(tile)
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-2} y={-46} width={4} height={46} fill="#3a3f5c" />
      <circle cx={0} cy={-56} r={13} fill="none" stroke="#ffe9a8" strokeWidth={4} opacity={0.9} style={{ animation: 'flicker 4s ease-in-out infinite' }} />
      <circle cx={0} cy={-56} r={7} fill="#fff6db" opacity={0.7} />
    </g>
  )
}

export function RugTile({ tile, color }: { tile: TilePos; color: string }) {
  const { x, y } = toScreen(tile)
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  return (
    <polygon
      points={`${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`}
      fill={color}
      opacity={0.35}
    />
  )
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
