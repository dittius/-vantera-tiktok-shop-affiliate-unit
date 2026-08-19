import { MockTikTokShopProvider } from './MockTikTokShopProvider.js'
import { RealTikTokShopProvider } from './RealTikTokShopProvider.js'
import type { TikTokShopProvider } from './types.js'

export * from './types.js'
export { RealTikTokShopProvider } from './RealTikTokShopProvider.js'
export { MockTikTokShopProvider } from './MockTikTokShopProvider.js'

export function getProvider(demoMode: boolean): TikTokShopProvider {
  return demoMode ? new MockTikTokShopProvider() : new RealTikTokShopProvider()
}
