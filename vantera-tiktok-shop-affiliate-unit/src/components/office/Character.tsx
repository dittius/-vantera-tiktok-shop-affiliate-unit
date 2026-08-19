import type { AgentDefinition } from '../../data/agents'
import type { AgentStatus } from '../../types'
import { SpeechBubble } from './SpeechBubble'

interface CharacterProps {
  def: AgentDefinition
  status: AgentStatus
  seated: boolean
  facing: 'left' | 'right'
  bubbleText?: string
  onTap: () => void
}

/**
 * Procedural pixel-art humanoid built from stacked rects — small enough to
 * read clearly at Habbo-style scale, animated via CSS classes only (no
 * sprite sheets), so every character stays fully original artwork.
 */
export function Character({ def, status, seated, facing, bubbleText, onTap }: CharacterProps) {
  const walking = status === 'WALKING'
  const isError = status === 'ERROR'
  const isBlocked = status === 'BLOCKED'
  const flip = facing === 'left' ? -1 : 1

  return (
    <g
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      style={{ cursor: 'pointer' }}
      className={walking ? 'char-walk' : 'char-idle'}
    >
      {/* ground shadow */}
      <ellipse cx={0} cy={2} rx={11} ry={4} fill="#000" opacity={0.28} />
      <g transform={`scale(${flip},1)`}>
        <g
          className={walking ? 'char-bounce' : undefined}
          style={!walking ? { animation: 'bob 3.2s ease-in-out infinite' } : undefined}
        >
          {/* legs */}
          {!seated ? (
            <>
              <rect x={-6} y={-16} width={5} height={14} fill="#232840" className={walking ? 'leg-a' : undefined} />
              <rect x={1} y={-16} width={5} height={14} fill="#1a1e33" className={walking ? 'leg-b' : undefined} />
            </>
          ) : (
            <>
              <rect x={-6} y={-11} width={5} height={9} fill="#232840" />
              <rect x={1} y={-11} width={5} height={9} fill="#1a1e33" />
            </>
          )}

          {/* torso */}
          <rect x={-7} y={-30} width={14} height={15} rx={2} fill={def.colorMain} />
          <rect x={-7} y={-30} width={14} height={4} fill="#ffffff" opacity={0.14} />

          {/* arms */}
          <rect
            x={-11}
            y={-29}
            width={4}
            height={11}
            rx={1.5}
            fill={def.colorSkin}
            className={walking ? 'arm-a' : undefined}
          />
          <rect
            x={7}
            y={-29}
            width={4}
            height={11}
            rx={1.5}
            fill={def.colorSkin}
            className={walking ? 'arm-b' : undefined}
          />

          {/* head */}
          <rect x={-6.5} y={-42} width={13} height={12} rx={3} fill={def.colorSkin} />
          {/* hair */}
          <path d="M -7 -42 Q -7 -47 0 -47 Q 7 -47 7 -42 L 7 -38 Q 3 -41 0 -38 Q -3 -41 -7 -38 Z" fill={def.colorHair} />
          {/* eyes */}
          <rect x={-4} y={-37} width={2} height={2} fill="#1a1e2e" style={{ animation: 'blink 5s infinite' }} />
          <rect x={2} y={-37} width={2} height={2} fill="#1a1e2e" style={{ animation: 'blink 5s infinite' }} />
        </g>
      </g>

      {isError ? (
        <SpeechBubble text="Errore temporaneo..." tone="error" />
      ) : (
        bubbleText && (
          <SpeechBubble text={bubbleText} tone={isBlocked ? 'blocked' : walking ? 'handoff' : 'work'} />
        )
      )}
    </g>
  )
}
