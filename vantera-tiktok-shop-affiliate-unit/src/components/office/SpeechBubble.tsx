function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim())
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur.trim())
  return lines.slice(0, 2)
}

interface SpeechBubbleProps {
  text: string
  tone?: 'work' | 'handoff' | 'error'
  y?: number
}

/** Pure-SVG speech bubble, drawn above a character's head (local coords). */
export function SpeechBubble({ text, tone = 'work', y = -58 }: SpeechBubbleProps) {
  if (!text) return null
  const lines = wrapText(text, 20)
  const lineH = 9
  const padY = 5
  const w = Math.min(120, Math.max(48, Math.max(...lines.map((l) => l.length)) * 4.6 + 12))
  const h = lines.length * lineH + padY * 2
  const fill = tone === 'handoff' ? '#35e6c4' : tone === 'error' ? '#ff5470' : '#eef1ff'
  const textColor = '#0b0e1a'

  return (
    <g transform={`translate(0,${y})`} style={{ animation: 'bubble-in 180ms ease-out' }}>
      <rect x={-w / 2} y={-h} width={w} height={h} rx={6} fill={fill} stroke="#12172a" strokeWidth={1} />
      <polygon points={`-5,0 5,0 0,7`} fill={fill} stroke="#12172a" strokeWidth={1} />
      <rect x={-4} y={0.5} width={8} height={3} fill={fill} />
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={-h + padY + (i + 1) * lineH - 2}
          textAnchor="middle"
          fontSize={7.5}
          fontFamily="var(--font-ui)"
          fontWeight={600}
          fill={textColor}
        >
          {line}
        </text>
      ))}
    </g>
  )
}
