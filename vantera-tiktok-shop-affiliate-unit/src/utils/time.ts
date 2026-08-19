export function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDayLabel(ts: number): string {
  const d = new Date(ts)
  const day = d.toLocaleDateString('en-US', { day: '2-digit' })
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day} ${month}`
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function relativeShort(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min}m fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h fa`
  const d = Math.floor(h / 24)
  return `${d}g fa`
}
