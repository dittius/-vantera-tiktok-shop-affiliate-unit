export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function chance(pct: number): boolean {
  return Math.random() * 100 < pct
}
