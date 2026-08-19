import type { TikTokConnectionStatus } from '../../types.js'

export interface TikTokProductCandidate {
  id: string
  name: string
  category: string
  price: number
  currency: string
  commissionPct: number | null
  sourceUrl: string
}

export interface TikTokOrder {
  id: string
  productId: string
  amount: number
  commission: number
  status: 'PENDING' | 'CONFIRMED' | 'PAID'
  createdAt: string
}

export interface TikTokPerformanceMetrics {
  productId: string
  videoId: string | null
  views: number
  clicks: number
  orders: number
  gmv: number
  commission: number
}

export interface TikTokShopProvider {
  readonly kind: 'real' | 'mock'
  getConnectionStatus(): Promise<{ status: TikTokConnectionStatus; actionRequired: string | null }>
  searchAffiliateProducts(query: string): Promise<TikTokProductCandidate[]>
  getOrders(sinceIso: string): Promise<TikTokOrder[]>
  getPerformance(productId?: string): Promise<TikTokPerformanceMetrics[]>
}

/** Thrown by RealTikTokShopProvider methods whose exact endpoint path has
 * not been verified against the live TikTok Shop Partner Center docs yet
 * (egress to partner.tiktokshop.com / developers.tiktok.com is blocked in
 * this environment). Never invent a URL — surface this instead so the
 * caller can report a real, honest "not available yet" state. */
export class EndpointNotVerifiedError extends Error {
  constructor(method: string, docsHint: string) {
    super(
      `TikTok Shop endpoint for "${method}" is not verified yet. Fill TIKTOK_API_BASE_URL and the ` +
        `matching path env var once confirmed against ${docsHint}. No endpoint was guessed or hardcoded.`,
    )
    this.name = 'EndpointNotVerifiedError'
  }
}
