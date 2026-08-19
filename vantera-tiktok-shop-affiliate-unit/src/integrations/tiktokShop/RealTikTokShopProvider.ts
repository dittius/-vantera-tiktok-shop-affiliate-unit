// Skeleton for a real TikTok Shop integration. No endpoints or credentials
// are invented here: this reads configuration from environment variables
// only, and every method reports NOT_CONNECTED / empty data until real
// credentials and an implementation are wired in. Replace the method
// bodies with real TikTok Shop Open API / Affiliate API calls once
// credentials, scopes and endpoint contracts are confirmed.
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

interface RealProviderConfig {
  appKey?: string
  appSecret?: string
  accessToken?: string
  shopId?: string
}

function readConfig(): RealProviderConfig {
  // Vite only exposes env vars prefixed with VITE_. None are hardcoded here;
  // if unset, the provider stays NOT_CONNECTED (this is the expected V1 state).
  const env = import.meta.env
  return {
    appKey: env.VITE_TIKTOK_APP_KEY,
    appSecret: env.VITE_TIKTOK_APP_SECRET,
    accessToken: env.VITE_TIKTOK_ACCESS_TOKEN,
    shopId: env.VITE_TIKTOK_SHOP_ID,
  }
}

export class RealTikTokShopProvider implements TikTokShopProvider {
  readonly isDemo = false
  private config: RealProviderConfig

  constructor() {
    this.config = readConfig()
  }

  private hasCredentials(): boolean {
    return Boolean(this.config.appKey && this.config.accessToken && this.config.shopId)
  }

  async getConnectionStatus(): Promise<TikTokConnectionStatus> {
    return this.hasCredentials() ? 'CONNECTED' : 'NOT_CONNECTED'
  }

  async searchProducts(_query: string): Promise<TikTokProduct[]> {
    if (!this.hasCredentials()) return []
    // TODO: call TikTok Shop Affiliate Open API product search endpoint.
    throw new Error('RealTikTokShopProvider.searchProducts not implemented yet')
  }

  async getAffiliateProducts(): Promise<TikTokProduct[]> {
    if (!this.hasCredentials()) return []
    throw new Error('RealTikTokShopProvider.getAffiliateProducts not implemented yet')
  }

  async getProductDetails(_productId: string): Promise<TikTokProduct | null> {
    if (!this.hasCredentials()) return null
    throw new Error('RealTikTokShopProvider.getProductDetails not implemented yet')
  }

  async getAffiliateOrders(): Promise<TikTokOrder[]> {
    if (!this.hasCredentials()) return []
    throw new Error('RealTikTokShopProvider.getAffiliateOrders not implemented yet')
  }

  async getPerformance(_productId?: string): Promise<TikTokPerformanceMetrics[]> {
    if (!this.hasCredentials()) return []
    throw new Error('RealTikTokShopProvider.getPerformance not implemented yet')
  }

  async publishVideo(_input: PublishVideoInput): Promise<PublishVideoResult> {
    if (!this.hasCredentials()) {
      return { publicationId: '', status: 'REJECTED', reason: 'TikTok Shop not connected' }
    }
    throw new Error('RealTikTokShopProvider.publishVideo not implemented yet')
  }

  async getEarnings(): Promise<EarningsSnapshot> {
    if (!this.hasCredentials()) return EMPTY_EARNINGS
    throw new Error('RealTikTokShopProvider.getEarnings not implemented yet')
  }
}
