import type { TikTokConnectionStatus } from '../../types.js'
import type { TikTokOrder, TikTokPerformanceMetrics, TikTokProductCandidate, TikTokShopProvider } from './types.js'

const DEMO_CATALOG: TikTokProductCandidate[] = [
  { id: 'demo-p1', name: 'Mini massaggiatore collo', category: 'Wellness', price: 24.9, currency: 'EUR', commissionPct: 18, sourceUrl: 'demo://catalog/p1' },
  { id: 'demo-p2', name: 'Organizer da viaggio', category: 'Casa', price: 15.5, currency: 'EUR', commissionPct: 12, sourceUrl: 'demo://catalog/p2' },
  { id: 'demo-p3', name: 'Set pennelli make-up', category: 'Beauty', price: 19.9, currency: 'EUR', commissionPct: 22, sourceUrl: 'demo://catalog/p3' },
]

/** Demo-only provider — never used unless control.demoMode is true. */
export class MockTikTokShopProvider implements TikTokShopProvider {
  readonly kind = 'mock' as const

  async getConnectionStatus(): Promise<{ status: TikTokConnectionStatus; actionRequired: string | null }> {
    return { status: 'CONNECTED', actionRequired: null }
  }

  async searchAffiliateProducts(query: string): Promise<TikTokProductCandidate[]> {
    const q = query.trim().toLowerCase()
    return DEMO_CATALOG.filter((p) => !q || p.name.toLowerCase().includes(q))
  }

  async getOrders(_sinceIso: string): Promise<TikTokOrder[]> {
    return []
  }

  async getPerformance(_productId?: string): Promise<TikTokPerformanceMetrics[]> {
    return []
  }
}
