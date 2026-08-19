// Abstract adapter boundary for TikTok Shop. Nothing in the app talks to
// TikTok Shop directly — everything goes through this interface, so a real
// implementation can be dropped in later without touching UI or simulation
// code. No API keys or endpoints are hardcoded anywhere in this module.
import type { EarningsSnapshot, TikTokConnectionStatus } from '../../types'

export interface TikTokProduct {
  id: string
  name: string
  category: string
  price: number
  currency: string
  commissionPct: number
  imageHint: string
}

export interface TikTokOrder {
  id: string
  productId: string
  videoId: string | null
  amount: number
  commission: number
  status: 'PENDING' | 'CONFIRMED' | 'PAID'
  createdAt: number
}

export interface TikTokPerformanceMetrics {
  productId: string
  videoId: string | null
  views: number
  clicks: number
  orders: number
  conversionRate: number
  commission: number
}

export interface PublishVideoInput {
  videoId: string
  productId: string
  caption: string
  disclosureAi: boolean
}

export interface PublishVideoResult {
  publicationId: string
  status: 'PUBLISHED' | 'REJECTED'
  reason?: string
}

/**
 * Abstract TikTok Shop provider. Every method must be safe to call at any
 * time; when there is no real connection, implementations should resolve
 * with empty/zeroed data (never throw) so the UI can render a calm
 * "Not connected" state instead of crashing.
 */
export interface TikTokShopProvider {
  readonly isDemo: boolean
  getConnectionStatus(): Promise<TikTokConnectionStatus>
  searchProducts(query: string): Promise<TikTokProduct[]>
  getAffiliateProducts(): Promise<TikTokProduct[]>
  getProductDetails(productId: string): Promise<TikTokProduct | null>
  getAffiliateOrders(): Promise<TikTokOrder[]>
  getPerformance(productId?: string): Promise<TikTokPerformanceMetrics[]>
  publishVideo(input: PublishVideoInput): Promise<PublishVideoResult>
  getEarnings(): Promise<EarningsSnapshot>
}

export const EMPTY_EARNINGS: EarningsSnapshot = {
  today: 0,
  week: 0,
  month: 0,
  total: 0,
  pending: 0,
  confirmed: 0,
  paid: 0,
  connected: false,
  isDemo: false,
  byProduct: [],
  byVideo: [],
  orders: 0,
  conversions: 0,
}
