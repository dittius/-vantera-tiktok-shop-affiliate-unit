import { useAppStore } from './store/useAppStore'
import { useRealStore } from './store/useRealStore'
import { useRealDataPolling } from './store/useRealDataPolling'
import { useSimulationLoop } from './sim/useSimulationLoop'
import { IsoOffice } from './components/office/IsoOffice'
import { AgentPanel } from './components/panels/AgentPanel'
import { MailScreen } from './components/panels/MailScreen'
import { EarningsScreen } from './components/panels/EarningsScreen'
import { ControlScreen } from './components/panels/ControlScreen'
import { BottomNav } from './components/nav/BottomNav'
import { OnboardingGate } from './components/onboarding/OnboardingGate'

export default function App() {
  useSimulationLoop()
  const demoMode = useAppStore((s) => s.demoMode)
  useRealDataPolling(!demoMode)
  const screen = useAppStore((s) => s.screen)

  return (
    <div className="fixed inset-0 overflow-hidden bg-vantera-bg font-ui text-vantera-ink">
      <TopBar />
      <IsoOffice />
      {screen === 'mail' && <MailScreen />}
      {screen === 'earnings' && <EarningsScreen />}
      {screen === 'control' && <ControlScreen />}
      <AgentPanel />
      <BottomNav />
      <OnboardingGate />
    </div>
  )
}

function TopBar() {
  const demoMode = useAppStore((s) => s.demoMode)
  const demoRunning = useAppStore((s) => s.running)
  const realRunning = useRealStore((s) => s.control.running)
  const running = demoMode ? demoRunning : realRunning
  return (
    <div className="safe-top safe-left safe-right pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-vantera-line bg-vantera-panel/90 px-3 py-1.5 backdrop-blur">
        <span className="font-pixel text-[10px] tracking-wide text-vantera-ink">VANTERA</span>
        <span className="text-[9px] text-vantera-muted">TikTok Shop Affiliate Unit</span>
      </div>
      <div className="pointer-events-auto flex items-center gap-1.5">
        {demoMode && (
          <span className="rounded-full bg-vantera-warn/20 px-2 py-1 text-[9px] font-bold text-vantera-warn backdrop-blur">
            DEMO MODE
          </span>
        )}
        <span
          className="rounded-full border border-vantera-line bg-vantera-panel/90 px-2 py-1 text-[9px] font-semibold backdrop-blur"
          style={{ color: running ? '#35e6c4' : '#97a0c9' }}
        >
          {running ? 'RUNNING' : 'PAUSED'}
        </span>
      </div>
    </div>
  )
}
