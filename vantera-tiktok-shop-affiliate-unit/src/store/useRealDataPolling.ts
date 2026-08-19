import { useEffect } from 'react'
import { useRealStore } from './useRealStore'

const POLL_MS = 45_000

/** Keeps the real backend state fresh while the app is open. The worker
 * itself runs independently of this — closing the app never pauses it. */
export function useRealDataPolling(enabled: boolean) {
  const fetchAll = useRealStore((s) => s.fetchAll)

  useEffect(() => {
    if (!enabled) return
    fetchAll()
    const id = window.setInterval(fetchAll, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchAll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, fetchAll])
}
