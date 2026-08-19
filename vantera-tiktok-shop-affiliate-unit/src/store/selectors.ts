import type { EarningsSnapshot, Performance, Product, VideoVariant } from '../types'
import { isSameDay } from '../utils/time'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export function computeEarnings(
  performance: Performance[],
  products: Product[],
  videos: VideoVariant[],
  demoMode: boolean,
): EarningsSnapshot {
  if (!demoMode || performance.length === 0) {
    return {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      pending: 0,
      confirmed: 0,
      paid: 0,
      connected: demoMode,
      isDemo: demoMode,
      byProduct: [],
      byVideo: [],
      orders: 0,
      conversions: 0,
    }
  }

  const now = Date.now()
  let today = 0
  let week = 0
  let month = 0
  let total = 0
  let orders = 0

  const byProductMap = new Map<string, { productName: string; amount: number }>()
  const byVideoMap = new Map<string, { videoTitle: string; amount: number }>()

  performance.forEach((p, idx) => {
    total += p.commission
    orders += p.orders
    if (isSameDay(p.createdAt, now)) today += p.commission
    if (now - p.createdAt <= WEEK_MS) week += p.commission
    if (now - p.createdAt <= MONTH_MS) month += p.commission

    const product = products.find((pr) => pr.id === p.productId)
    const productKey = p.productId
    const prevP = byProductMap.get(productKey)
    byProductMap.set(productKey, {
      productName: product?.name ?? p.productId,
      amount: (prevP?.amount ?? 0) + p.commission,
    })

    const video = videos.find((v) => v.id === p.videoId)
    const videoKey = p.videoId || `v-${idx}`
    const prevV = byVideoMap.get(videoKey)
    byVideoMap.set(videoKey, {
      videoTitle: video?.title ?? `Video ${idx + 1}`,
      amount: (prevV?.amount ?? 0) + p.commission,
    })
  })

  // Simulated settlement split: recent commissions are pending, then confirmed, then paid.
  const sorted = [...performance].sort((a, b) => b.createdAt - a.createdAt)
  let pending = 0
  let confirmed = 0
  let paid = 0
  sorted.forEach((p, i) => {
    if (i < Math.ceil(sorted.length * 0.25)) pending += p.commission
    else if (i < Math.ceil(sorted.length * 0.55)) confirmed += p.commission
    else paid += p.commission
  })

  return {
    today: round2(today),
    week: round2(week),
    month: round2(month),
    total: round2(total),
    pending: round2(pending),
    confirmed: round2(confirmed),
    paid: round2(paid),
    connected: true,
    isDemo: true,
    byProduct: Array.from(byProductMap.entries()).map(([productId, v]) => ({
      productId,
      productName: v.productName,
      amount: round2(v.amount),
    })),
    byVideo: Array.from(byVideoMap.entries()).map(([videoId, v]) => ({
      videoId,
      videoTitle: v.videoTitle,
      amount: round2(v.amount),
    })),
    orders,
    conversions: orders,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
