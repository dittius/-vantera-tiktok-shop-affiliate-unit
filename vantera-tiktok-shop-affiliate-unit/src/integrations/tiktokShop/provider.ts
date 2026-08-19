import { MockTikTokShopProvider } from './MockTikTokShopProvider'
import { RealTikTokShopProvider } from './RealTikTokShopProvider'
import type { TikTokShopProvider } from './TikTokShopProvider'
import { useAppStore } from '../../store/useAppStore'

const mockProvider = new MockTikTokShopProvider(() => useAppStore.getState().demoMode)
const realProvider = new RealTikTokShopProvider()

/** Selects the active adapter: Mock only ever answers while Demo Mode is on. */
export function getTikTokProvider(): TikTokShopProvider {
  return useAppStore.getState().demoMode ? mockProvider : realProvider
}
