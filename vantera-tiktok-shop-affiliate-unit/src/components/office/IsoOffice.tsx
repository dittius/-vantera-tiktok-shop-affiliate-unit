import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { AGENT_DEFINITIONS } from '../../data/agents'
import { CANVAS, GRID_COLS, GRID_ROWS, TILE_H, TILE_W, WALL_HEIGHT, toScreen } from './iso'
import { ZONES, standTileFor } from './officeLayout'
import { Character } from './Character'
import {
  BigScreen,
  Chair,
  CoffeeTable,
  Corkboard,
  Desk,
  FolderStack,
  Plant,
  RingLight,
  RugTile,
  Sofa,
} from './Furniture'
import { usePanZoom } from './usePanZoom'

function FloorTiles() {
  const tiles = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = toScreen({ col, row })
      const hw = TILE_W / 2
      const hh = TILE_H / 2
      const even = (col + row) % 2 === 0
      tiles.push(
        <polygon
          key={`${col}-${row}`}
          points={`${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`}
          fill={even ? '#171d38' : '#151a32'}
          stroke="#0d1126"
          strokeWidth={0.5}
        />,
      )
    }
  }
  return <g>{tiles}</g>
}

function BackWalls() {
  const wallH = WALL_HEIGHT
  const topLeft = toScreen({ col: 0, row: 0 })
  const topRight = toScreen({ col: GRID_COLS, row: 0 })
  const topBottom = toScreen({ col: 0, row: GRID_ROWS })
  return (
    <g>
      {/* left wall (following the col=0 edge) */}
      <polygon
        points={`${topLeft.x},${topLeft.y - wallH} ${topBottom.x},${topBottom.y - wallH} ${topBottom.x},${topBottom.y} ${topLeft.x},${topLeft.y}`}
        fill="#1b2142"
      />
      <polygon
        points={`${topLeft.x},${topLeft.y - wallH} ${topBottom.x},${topBottom.y - wallH} ${topBottom.x},${topBottom.y - wallH + 10} ${topLeft.x},${topLeft.y - wallH + 10}`}
        fill="#232a52"
      />
      {/* right wall (following the row=0 edge) */}
      <polygon
        points={`${topLeft.x},${topLeft.y - wallH} ${topRight.x},${topRight.y - wallH} ${topRight.x},${topRight.y} ${topLeft.x},${topLeft.y}`}
        fill="#20264a"
      />
      <polygon
        points={`${topLeft.x},${topLeft.y - wallH} ${topRight.x},${topRight.y - wallH} ${topRight.x},${topRight.y - wallH + 10} ${topLeft.x},${topLeft.y - wallH + 10}`}
        fill="#2a3160"
      />
      {/* windows on right wall */}
      {[3, 7, 11].map((c) => {
        const p = toScreen({ col: c, row: 0 })
        return (
          <rect
            key={c}
            x={p.x - 14}
            y={p.y - wallH + 40}
            width={28}
            height={44}
            rx={2}
            fill="#0b1330"
            stroke="#3a4270"
            strokeWidth={2}
          />
        )
      })}
    </g>
  )
}

function ZoneLabel({ text, tile, color }: { text: string; tile: { col: number; row: number }; color: string }) {
  const { x, y } = toScreen(tile)
  const w = text.length * 6.4 + 20
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w / 2} y={-11} width={w} height={20} rx={10} fill="#0d1126" stroke={color} strokeWidth={1.4} opacity={0.92} />
      <circle cx={-w / 2 + 12} cy={-1} r={3} fill={color} />
      <text x={4} y={2.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#eef1ff" letterSpacing={0.3}>
        {text.toUpperCase()}
      </text>
    </g>
  )
}

function ZoneFurniture({ zoneId }: { zoneId: string }) {
  const zone = ZONES.find((z) => z.id === zoneId)!
  const desk = zone.deskTile

  switch (zoneId) {
    case 'product-research':
      return (
        <>
          <Desk tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col - 1.1, row: desk.row - 0.2 }} />
        </>
      )
    case 'trend-research':
      return (
        <>
          <Corkboard tile={{ col: desk.col, row: desk.row - 0.75 }} />
          <Desk tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col + 1.15, row: desk.row + 0.1 }} />
        </>
      )
    case 'content-desk':
      return (
        <>
          <Desk tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col + 1.1, row: desk.row - 0.2 }} />
        </>
      )
    case 'video-studio':
      return (
        <>
          <RingLight tile={{ col: desk.col - 0.95, row: desk.row - 0.55 }} />
          <Desk tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col + 1.1, row: desk.row + 0.2 }} />
        </>
      )
    case 'publishing-desk':
      return (
        <>
          <Desk tile={desk} />
          <FolderStack tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col - 1.1, row: desk.row + 0.1 }} />
        </>
      )
    case 'analytics-room':
      return (
        <>
          <BigScreen tile={{ col: desk.col, row: desk.row - 0.8 }} />
          <Desk tile={desk} />
          <Chair tile={desk} />
          <Plant tile={{ col: desk.col + 1.1, row: desk.row + 0.15 }} />
        </>
      )
    case 'relax-area':
      return (
        <>
          <Sofa tile={{ col: desk.col - 0.55, row: desk.row + 0.1 }} color="#7c5cff" />
          <Sofa tile={{ col: desk.col + 1.1, row: desk.row + 0.7 }} color="#ff2f6e" />
          <CoffeeTable tile={{ col: desk.col + 0.25, row: desk.row + 0.45 }} />
          <Plant tile={{ col: desk.col - 1.3, row: desk.row + 0.9 }} />
        </>
      )
    default:
      return null
  }
}

export function IsoOffice() {
  const agents = useAppStore((s) => s.agents)
  const selectAgent = useAppStore((s) => s.selectAgent)

  const { transform, handlers } = usePanZoom({ x: 0, y: 0, scale: 1 })

  const width = CANVAS.maxX - CANVAS.minX
  const height = CANVAS.maxY - CANVAS.minY

  const charactersSorted = useMemo(() => {
    return AGENT_DEFINITIONS.map((def) => {
      const agent = agents[def.id]
      return { def, agent }
    }).sort((a, b) => {
      const ta = standTileFor(a.agent.currentLocation)
      const tb = standTileFor(b.agent.currentLocation)
      return ta.col + ta.row - (tb.col + tb.row)
    })
  }, [agents])

  return (
    <div
      className="absolute inset-0 touch-none overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, #171d3d 0%, #0b0e1a 65%)',
      }}
      {...handlers}
    >
      <svg
        viewBox={`${CANVAS.minX} ${CANVAS.minY} ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '50% 50%',
        }}
        className="pixelated select-none"
      >
        <BackWalls />
        <FloorTiles />

        {ZONES.map((z) => (
          <RugTile key={`rug-${z.id}`} tile={z.deskTile} color={z.tint} />
        ))}
        {ZONES.map((z) => (
          <ZoneFurniture key={`furn-${z.id}`} zoneId={z.id} />
        ))}
        {ZONES.map((z) => (
          <ZoneLabel key={`label-${z.id}`} text={z.label} tile={z.labelTile} color={z.tint} />
        ))}

        {charactersSorted.map(({ def, agent }) => {
          const tile = standTileFor(agent.currentLocation)
          const { x, y } = toScreen(tile)
          const facing = tile.col < 6.5 ? 'right' : 'left'
          const seated = agent.status === 'WORKING' || agent.status === 'RELAX'
          const showBubble =
            (agent.status === 'WORKING' || agent.status === 'WALKING') && agent.activity
          return (
            <g
              key={def.id}
              transform={`translate(${x},${y})`}
              style={{ transition: 'transform 1.1s cubic-bezier(.4,0,.2,1)' }}
            >
              <Character
                def={def}
                status={agent.status}
                seated={seated}
                facing={facing}
                bubbleText={showBubble ? agent.activity : undefined}
                onTap={() => selectAgent(def.id)}
              />
            </g>
          )
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="rounded-full bg-black/30 px-3 py-1 text-[10px] text-vantera-muted backdrop-blur">
          trascina per muoverti · pizzica per zoom
        </div>
      </div>
    </div>
  )
}
