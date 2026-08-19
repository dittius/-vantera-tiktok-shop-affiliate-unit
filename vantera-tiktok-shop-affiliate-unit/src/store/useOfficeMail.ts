import { useMemo } from 'react'
import { useAppStore } from './useAppStore'
import { useRealStore } from './useRealStore'
import type { InternalMail } from '../types'

export function useOfficeMail(): {
  mail: InternalMail[]
  isReal: boolean
  markRead: (id: string) => void
  markAllRead: () => void
} {
  const demoMode = useAppStore((s) => s.demoMode)
  const demoMail = useAppStore((s) => s.mail)
  const demoMarkRead = useAppStore((s) => s.markMailRead)
  const demoMarkAllRead = useAppStore((s) => s.markAllMailRead)

  const realMailRaw = useRealStore((s) => s.mail)
  const localReadIds = useRealStore((s) => s.localReadIds)
  const realMarkRead = useRealStore((s) => s.markRead)
  const realMarkAllRead = useRealStore((s) => s.markAllRead)

  const realMail = useMemo<InternalMail[]>(
    () =>
      realMailRaw.map((m) => ({
        id: m.id,
        fromAgentId: m.fromAgentId,
        fromName: m.fromName,
        subject: m.subject,
        category: m.category as InternalMail['category'],
        body: m.body,
        stats: m.stats,
        timestamp: Date.parse(m.timestamp) || 0,
        read: m.read || Boolean(localReadIds[m.id]),
        isDemo: false,
      })),
    [realMailRaw, localReadIds],
  )

  if (demoMode) return { mail: demoMail, isReal: false, markRead: demoMarkRead, markAllRead: demoMarkAllRead }
  return { mail: realMail, isReal: true, markRead: realMarkRead, markAllRead: realMarkAllRead }
}
