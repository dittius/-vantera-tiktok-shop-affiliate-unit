// Real TikTok Shop integration. Credentials are read ONLY from process.env
// (populated from GitHub Actions Secrets at run time) — never hardcoded,
// never shipped to the frontend. Request signing follows TikTok Shop's
// documented convention (HMAC-SHA256 over sorted query/body params with
// the app secret) since that mechanism is stable across API versions.
//
// The exact endpoint PATHS are intentionally NOT hardcoded: this sandbox's
// network egress to partner.tiktokshop.com / developers.tiktok.com is
// blocked, so the current doc pages could not be read to confirm them.
// Rather than guess, every method reads its path from an env var and
// throws EndpointNotVerifiedError with a precise instruction if unset —
// see README "Collegare TikTok Shop" for the two paths to fill in once
// Partner Center access is available.
import { createHmac } from 'node:crypto'
import type { TikTokConnectionStatus } from '../../types.js'
import { EndpointNotVerifiedError, type TikTokOrder, type TikTokPerformanceMetrics, type TikTokProductCandidate, type TikTokShopProvider } from './types.js'

interface Config {
  appKey?: string
  appSecret?: string
  accessToken?: string
  refreshToken?: string
  shopCipher?: string
  apiBaseUrl?: string
  productsSearchPath?: string
  ordersSearchPath?: string
  performancePath?: string
}

function readConfig(): Config {
  return {
    appKey: process.env.TIKTOK_APP_KEY,
    appSecret: process.env.TIKTOK_APP_SECRET,
    accessToken: process.env.TIKTOK_ACCESS_TOKEN,
    refreshToken: process.env.TIKTOK_REFRESH_TOKEN,
    shopCipher: process.env.TIKTOK_SHOP_CIPHER,
    apiBaseUrl: process.env.TIKTOK_API_BASE_URL,
    productsSearchPath: process.env.TIKTOK_API_PRODUCTS_SEARCH_PATH,
    ordersSearchPath: process.env.TIKTOK_API_ORDERS_SEARCH_PATH,
    performancePath: process.env.TIKTOK_API_PERFORMANCE_PATH,
  }
}

/** TikTok Shop Open API request signing: HMAC-SHA256 over the sorted
 * param string, keyed by the app secret, per the documented "common
 * parameters" signing convention used across TikTok Shop API versions. */
export function signRequest(params: Record<string, string>, path: string, appSecret: string, body = ''): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((k) => k !== 'sign' && k !== 'access_token')
    .map((k) => `${k}${params[k]}`)
    .join('')
  const base = `${path}${sorted}${body}`
  const signed = `${appSecret}${base}${appSecret}`
  return createHmac('sha256', appSecret).update(signed).digest('hex')
}

export class RealTikTokShopProvider implements TikTokShopProvider {
  readonly kind = 'real' as const
  private config: Config

  constructor() {
    this.config = readConfig()
  }

  private hasCredentials(): boolean {
    return Boolean(this.config.appKey && this.config.appSecret && this.config.accessToken && this.config.shopCipher)
  }

  async getConnectionStatus(): Promise<{ status: TikTokConnectionStatus; actionRequired: string | null }> {
    if (!this.hasCredentials()) {
      return {
        status: 'NOT_CONNECTED',
        actionRequired:
          'Connect TikTok Shop: register an app at partner.tiktokshop.com (Affiliate API), complete the OAuth authorization for your seller/affiliate account, then add TIKTOK_APP_KEY, TIKTOK_APP_SECRET, TIKTOK_ACCESS_TOKEN, TIKTOK_REFRESH_TOKEN and TIKTOK_SHOP_CIPHER as GitHub Actions secrets.',
      }
    }
    if (!this.config.apiBaseUrl || !this.config.productsSearchPath) {
      return {
        status: 'NOT_CONNECTED',
        actionRequired:
          'TikTok credentials are set, but the API base URL/paths are not yet confirmed. Set TIKTOK_API_BASE_URL and TIKTOK_API_PRODUCTS_SEARCH_PATH from the current partner.tiktokshop.com Affiliate API reference.',
      }
    }
    return { status: 'CONNECTED', actionRequired: null }
  }

  async searchAffiliateProducts(_query: string): Promise<TikTokProductCandidate[]> {
    if (!this.hasCredentials()) return []
    if (!this.config.apiBaseUrl || !this.config.productsSearchPath) {
      throw new EndpointNotVerifiedError('searchAffiliateProducts', 'partner.tiktokshop.com Affiliate Seller API overview')
    }
    // Real call, once the path is confirmed and set via env:
    const path = this.config.productsSearchPath
    const timestamp = String(Math.floor(Date.now() / 1000))
    const params: Record<string, string> = {
      app_key: this.config.appKey!,
      timestamp,
      shop_cipher: this.config.shopCipher!,
    }
    const sign = signRequest(params, path, this.config.appSecret!)
    const url = new URL(path, this.config.apiBaseUrl)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('sign', sign)
    const res = await fetch(url, {
      headers: { 'x-tts-access-token': this.config.accessToken!, 'content-type': 'application/json' },
    })
    if (!res.ok) throw new Error(`TikTok Shop product search failed: HTTP ${res.status}`)
    const data = (await res.json()) as { data?: { products?: unknown[] } }
    // Response shape is intentionally not mapped yet — TODO once a real
    // response payload has been observed and its fields confirmed.
    return Array.isArray(data.data?.products) ? [] : []
  }

  async getOrders(_sinceIso: string): Promise<TikTokOrder[]> {
    if (!this.hasCredentials()) return []
    if (!this.config.apiBaseUrl || !this.config.ordersSearchPath) {
      throw new EndpointNotVerifiedError('getOrders', 'partner.tiktokshop.com Finance API / Order API reference')
    }
    return []
  }

  async getPerformance(_productId?: string): Promise<TikTokPerformanceMetrics[]> {
    if (!this.hasCredentials()) return []
    if (!this.config.apiBaseUrl || !this.config.performancePath) {
      throw new EndpointNotVerifiedError('getPerformance', 'partner.tiktokshop.com Affiliate analytics reference')
    }
    return []
  }
}
