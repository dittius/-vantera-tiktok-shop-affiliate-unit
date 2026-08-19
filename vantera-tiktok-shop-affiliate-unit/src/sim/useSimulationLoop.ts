import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const TICK_MS = 1400

/** Drives the whole simulation: call once near the app root. */
export function useSimulationLoop() {
  useEffect(() => {
    const id = window.setInterval(() => {
      useAppStore.getState().tick()
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])
}
