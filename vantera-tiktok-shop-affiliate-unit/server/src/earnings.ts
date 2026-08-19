// Earnings are derived ONLY from real PerformanceRecord rows, which are
// themselves only ever created from TIKTOK_AFFILIATE_API or HUMAN_ENTERED
// sources (see federico.ts / types.ts). If there is no real performance
// data, every figure here is honestly 0 — nothing is estimated or guessed.
import type { Db } from './db/repo.js'
import type { EarningsSnapshot } from './types.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export function computeEarnings(db: Db, connected: boolean): EarningsSnapshot {
  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  let today = 0
  let week = 0
  let month = 0
  let total = 0
  let orders = 0
  const byProductMap = new Map<string, { name: string; amount: number }>()
  const byVideoMap = new Map<string, { title: string; amount: number }>()

  for (const p of db.performance) {
    const commission = p.commission ?? 0
    const ts = new Date(p.measuredAt).getTime()
    total += commission
    orders += p.orders ?? 0
    if (ts >= startOfDay.getTime()) today += commission
    if (now - ts <= WEEK_MS) week += commission
    if (now - ts <= MONTH_MS) month += commission

    const product = db.products.find((pr) => pr.id === p.productId)
    const prevP = byProductMap.get(p.productId)
    byProductMap.set(p.productId, { name: product?.name ?? p.productId, amount: (prevP?.amount ?? 0) + commission })

    const video = db.videos.find((v) => v.id === p.videoId)
    const prevV = byVideoMap.get(p.videoId)
    byVideoMap.set(p.videoId, { title: video ? `Video · ${db.products.find((pr) => pr.id === video.productId)?.name ?? p.videoId}` : p.videoId, amount: (prevV?.amount ?? 0) + commission })
  }

  return {
    today: round2(today),
    week: round2(week),
    month: round2(month),
    total: round2(total),
    // Real settlement status is only knowable via TikTok's Finance API
    // (settlements/payouts). Without a confirmed endpoint, everything real
    // stays lumped as "pending" rather than guessing a split — see README.
    pending: round2(total),
    confirmed: 0,
    paid: 0,
    connected,
    currency: 'EUR',
    byProduct: Array.from(byProductMap.entries()).map(([productId, v]) => ({ productId, productName: v.name, amount: round2(v.amount) })),
    byVideo: Array.from(byVideoMap.entries()).map(([videoId, v]) => ({ videoId, videoTitle: v.title, amount: round2(v.amount) })),
    orders,
    updatedAt: new Date().toISOString(),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
