import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import * as github from '../../integrations/github/client'

const DISMISSED_KEY = 'vantera-onboarding-dismissed'

/** First-run guide: only the real, necessary actions — nothing technical.
 * Shown once, dismissible, never blocks normal use of the app. */
export function OnboardingGate() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const setScreen = useAppStore((s) => s.setScreen)
  const githubConnected = github.isConnected()

  if (dismissed) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore (private browsing etc.)
    }
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Chiudi" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={dismiss} />
      <div className="safe-bottom relative z-10 w-full max-w-sm rounded-t-3xl border-t border-vantera-line bg-vantera-panel px-6 pb-6 pt-5 sm:rounded-3xl sm:border">
        <div className="font-pixel text-[11px] tracking-wide text-vantera-accent-3">BENVENUTO IN VANTERA</div>
        <p className="mt-2 text-sm text-vantera-muted">
          Sei sei agenti AI lavorano da soli quando l'unit è attiva. Servono solo due cose, una
          volta sola:
        </p>

        <div className="mt-4 space-y-3">
          <Step
            n={1}
            done={githubConnected}
            title="Connetti GitHub"
            body="Un token personale (creato da te, resta solo su questo telefono) per avviare/mettere in pausa l'unit da qui."
          />
          <Step n={2} done={false} title="Connetti TikTok Shop" body="Da Partner Center — necessario perché Alessia possa cercare prodotti reali. Puoi farlo quando vuoi." />
          <Step n={3} done={false} title="Premi START UNIT" body="Da quel momento gli agenti lavorano da soli, anche a telefono spento." />
        </div>

        <button
          onClick={() => {
            setScreen('control')
            dismiss()
          }}
          className="mt-5 w-full rounded-xl bg-vantera-accent-3 py-2.5 text-sm font-semibold text-white"
        >
          Vai a Control
        </button>
        <button onClick={dismiss} className="mt-2 w-full py-2 text-xs text-vantera-muted">
          Ho capito, esplora prima l'ufficio
        </button>
      </div>
    </div>
  )
}

function Step({ n, done, title, body }: { n: number; done: boolean; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: done ? '#35e6c422' : '#2b335866', color: done ? '#35e6c4' : '#97a0c9' }}
      >
        {done ? '✓' : n}
      </div>
      <div>
        <div className="text-sm font-medium text-vantera-ink">{title}</div>
        <div className="text-[11px] text-vantera-muted">{body}</div>
      </div>
    </div>
  )
}
