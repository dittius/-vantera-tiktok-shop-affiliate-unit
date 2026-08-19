import type { EarningsSnapshot } from '../types'
import type { RealPerformance, RealProduct, RealPublication, RealVideo } from '../types/real'
import { isSameDay } from '../utils/time'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

/** Same math as the demo selector (src/store/selectors.ts) applied to real
 * data. Only ever fed PerformanceRecord rows the backend created from an
 * actually-connected TikTok source — see server/src/earnings.ts. */
export function computeRealEarnings(
  performance: RealPerformance[],
  products: RealProduct[],
  videos: RealVideo[],
  connected: boolean,
): EarningsSnapshot {
  if (!connected || performance.length === 0) {
    return {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      pending: 0,
      confirmed: 0,
      paid: 0,
      connected,
      isDemo: false,
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

  for (const p of performance) {
    const commission = p.commission ?? 0
    const ts = Date.parse(p.measuredAt) || now
    total += commission
    orders += p.orders ?? 0
    if (isSameDay(ts, now)) today += commission
    if (now - ts <= WEEK_MS) week += commission
    if (now - ts <= MONTH_MS) month += commission

    const product = products.find((pr) => pr.id === p.productId)
    const prevP = byProductMap.get(p.productId)
    byProductMap.set(p.productId, { productName: product?.name ?? p.productId, amount: (prevP?.amount ?? 0) + commission })

    const video = videos.find((v) => v.id === p.videoId)
    const videoKey = p.videoId || p.id
    const prevV = byVideoMap.get(videoKey)
    byVideoMap.set(videoKey, {
      videoTitle: video ? `Video · ${products.find((pr) => pr.id === video.productId)?.name ?? p.videoId}` : p.videoId,
      amount: (prevV?.amount ?? 0) + commission,
    })
  }

  return {
    today: round2(today),
    week: round2(week),
    month: round2(month),
    total: round2(total),
    pending: round2(total),
    confirmed: 0,
    paid: 0,
    connected: true,
    isDemo: false,
    byProduct: Array.from(byProductMap.entries()).map(([productId, v]) => ({ productId, productName: v.productName, amount: round2(v.amount) })),
    byVideo: Array.from(byVideoMap.entries()).map(([videoId, v]) => ({ videoId, videoTitle: v.videoTitle, amount: round2(v.amount) })),
    orders,
    conversions: orders,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function countPendingHumanActions(publications: RealPublication[]): number {
  return publications.filter((p) => p.status === 'PENDING_HUMAN_ACTION').length
}
