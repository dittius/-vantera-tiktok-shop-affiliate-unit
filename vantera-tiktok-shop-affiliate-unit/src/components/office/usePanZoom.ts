import { useRef, useState, useCallback } from 'react'

export interface Transform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.55
const MAX_SCALE = 2.2

export function usePanZoom(initial: Transform) {
  const [t, setT] = useState(initial)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const lastDist = useRef<number | null>(null)
  const lastMid = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragging.current = pointers.current.size === 1
    lastDist.current = null
    lastMid.current = null
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = Array.from(pointers.current.values())

    if (pts.length === 1 && dragging.current) {
      const p = pts[0]
      const prev = lastMid.current
      if (prev) {
        setT((cur) => ({ ...cur, x: cur.x + (p.x - prev.x), y: cur.y + (p.y - prev.y) }))
      }
      lastMid.current = p
    } else if (pts.length === 2) {
      const [a, b] = pts
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      if (lastDist.current != null) {
        const scaleDelta = dist / lastDist.current
        setT((cur) => {
          const nextScale = clamp(cur.scale * scaleDelta, MIN_SCALE, MAX_SCALE)
          return { ...cur, scale: nextScale }
        })
      }
      lastDist.current = dist
      lastMid.current = mid
    }
  }, [])

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) lastDist.current = null
    if (pointers.current.size === 0) {
      dragging.current = false
      lastMid.current = null
    } else if (pointers.current.size === 1) {
      dragging.current = true
      const only = Array.from(pointers.current.values())[0]
      lastMid.current = only
    }
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.0015
    setT((cur) => ({ ...cur, scale: clamp(cur.scale * (1 + delta), MIN_SCALE, MAX_SCALE) }))
  }, [])

  const reset = useCallback(() => setT(initial), [initial])

  return {
    transform: t,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
      onWheel,
    },
    reset,
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
