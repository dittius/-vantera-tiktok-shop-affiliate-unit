import type { Db } from '../db/repo.js'
import type { AgentId, InternalMail, MailCategory } from '../types.js'
import { makeId } from '../db/store.js'

const SENDER_NAMES: Record<AgentId, string> = {
  alessia: 'Alessia Riva',
  tommaso: 'Tommaso Greco',
  marta: 'Marta Bellini',
  riccardo: 'Riccardo Sala',
  elena: 'Elena Moretti',
  federico: 'Federico Conti',
}

export function pushMail(
  db: Db,
  fromAgentId: AgentId | 'system',
  category: MailCategory,
  subject: string,
  body: string,
  stats?: Record<string, number | string>,
) {
  const mail: InternalMail = {
    id: makeId('mail'),
    fromAgentId,
    fromName: fromAgentId === 'system' ? 'System' : SENDER_NAMES[fromAgentId],
    subject,
    category,
    body,
    stats,
    timestamp: new Date().toISOString(),
    read: false,
  }
  db.mail.unshift(mail)
  if (db.mail.length > 500) db.mail.length = 500
}
