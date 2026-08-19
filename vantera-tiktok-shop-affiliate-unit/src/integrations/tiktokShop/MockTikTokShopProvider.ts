// Demo-only TikTok Shop provider. It ONLY produces data when Demo Mode is
// enabled; otherwise it behaves exactly like "not connected", so the app
// never shows invented commercial numbers outside of Demo Mode.
import {
  EMPTY_EARNINGS,
  type PublishVideoInput,
  type PublishVideoResult,
  type TikTokOrder,
  type TikTokPerformanceMetrics,
  type TikTokProduct,
  type TikTokShopProvider,
} from './TikTokShopProvider'
import type { EarningsSnapshot, TikTokConnectionStatus } from '../../types'

const DEMO_CATALOG: TikTokProduct[] = [
  { id: 'demo-p1', name: 'Mini massaggiatore collo', category: 'Wellness', price: 24.9, currency: 'EUR', commissionPct: 18, imageHint: 'gadget' },
  { id: 'demo-p2', name: 'Organizer da viaggio', category: 'Casa', price: 15.5, currency: 'EUR', commissionPct: 12, imageHint: 'organizer' },
  { id: 'demo-p3', name: 'Set pennelli make-up', category: 'Beauty', price: 19.9, currency: 'EUR', commissionPct: 22, imageHint: 'beauty' },
  { id: 'demo-p4', name: 'Lampada LED da scrivania', category: 'Casa', price: 29.9, currency: 'EUR', commissionPct: 15, imageHint: 'lamp' },
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export class MockTikTokShopProvider implements TikTokShopProvider {
  readonly isDemo = true
  private isDemoModeActive: () => boolean

  constructor(isDemoModeActive: () => boolean) {
    this.isDemoModeActive = isDemoModeActive
  }

  private ok(): boolean {
    return this.isDemoModeActive()
  }

  async getConnectionStatus(): Promise<TikTokConnectionStatus> {
    return this.ok() ? 'DEMO' : 'NOT_CONNECTED'
  }

  async searchProducts(query: string): Promise<TikTokProduct[]> {
    if (!this.ok()) return []
    const q = query.trim().toLowerCase()
    return DEMO_CATALOG.filter((p) => !q || p.name.toLowerCase().includes(q))
  }

  async getAffiliateProducts(): Promise<TikTokProduct[]> {
    if (!this.ok()) return []
    return DEMO_CATALOG
  }

  async getProductDetails(productId: string): Promise<TikTokProduct | null> {
    if (!this.ok()) return null
    return DEMO_CATALOG.find((p) => p.id === productId) ?? null
  }

  async getAffiliateOrders(): Promise<TikTokOrder[]> {
    if (!this.ok()) return []
    const rnd = seededRandom(42)
    return DEMO_CATALOG.map((p, i) => ({
      id: `demo-order-${i}`,
      productId: p.id,
      videoId: `demo-video-${i}`,
      amount: Math.round(p.price * (1 + rnd() * 2) * 100) / 100,
      commission: Math.round(p.price * (p.commissionPct / 100) * 100) / 100,
      status: (['PENDING', 'CONFIRMED', 'PAID'] as const)[i % 3],
      createdAt: Date.now() - i * 3600_000,
    }))
  }

  async getPerformance(productId?: string): Promise<TikTokPerformanceMetrics[]> {
    if (!this.ok()) return []
    const rnd = seededRandom(7)
    const list = DEMO_CATALOG.filter((p) => !productId || p.id === productId).map((p, i) => {
      const views = Math.floor(800 + rnd() * 12000)
      const clicks = Math.floor(views * (0.02 + rnd() * 0.05))
      const orders = Math.floor(clicks * (0.03 + rnd() * 0.08))
      return {
        productId: p.id,
        videoId: `demo-video-${i}`,
        views,
        clicks,
        orders,
        conversionRate: clicks > 0 ? Math.round((orders / clicks) * 1000) / 10 : 0,
        commission: Math.round(orders * p.price * (p.commissionPct / 100) * 100) / 100,
      }
    })
    return list
  }

  async publishVideo(input: PublishVideoInput): Promise<PublishVideoResult> {
    if (!this.ok()) return { publicationId: '', status: 'REJECTED', reason: 'Demo Mode is off' }
    return { publicationId: `demo-pub-${input.videoId}`, status: 'PUBLISHED' }
  }

  async getEarnings(): Promise<EarningsSnapshot> {
    if (!this.ok()) return EMPTY_EARNINGS
    const perf = await this.getPerformance()
    const total = perf.reduce((s, p) => s + p.commission, 0)
    return {
      today: Math.round(total * 0.08 * 100) / 100,
      week: Math.round(total * 0.35 * 100) / 100,
      month: Math.round(total * 0.7 * 100) / 100,
      total: Math.round(total * 100) / 100,
      pending: Math.round(total * 0.2 * 100) / 100,
      confirmed: Math.round(total * 0.3 * 100) / 100,
      paid: Math.round(total * 0.5 * 100) / 100,
      connected: true,
      isDemo: true,
      byProduct: perf.map((p) => ({
        productId: p.productId,
        productName: DEMO_CATALOG.find((c) => c.id === p.productId)?.name ?? p.productId,
        amount: p.commission,
      })),
      byVideo: perf.map((p) => ({
        videoId: p.videoId ?? '',
        videoTitle: `Video · ${DEMO_CATALOG.find((c) => c.id === p.productId)?.name ?? p.productId}`,
        amount: p.commission,
      })),
      orders: perf.reduce((s, p) => s + p.orders, 0),
      conversions: perf.reduce((s, p) => s + p.orders, 0),
    }
  }
}
