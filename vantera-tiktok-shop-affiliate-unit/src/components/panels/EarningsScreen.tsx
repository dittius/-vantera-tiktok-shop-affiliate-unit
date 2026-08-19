import { useMemo, type ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useRealStore } from '../../store/useRealStore'
import { ScreenShell } from '../ui/ScreenShell'
import { computeEarnings } from '../../store/selectors'
import { computeRealEarnings } from '../../store/realEarnings'

function money(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function EarningsScreen() {
  const demoMode = useAppStore((s) => s.demoMode)
  const demoPerformance = useAppStore((s) => s.performance)
  const demoProducts = useAppStore((s) => s.products)
  const demoVideos = useAppStore((s) => s.videos)

  const realPerformance = useRealStore((s) => s.performance)
  const realProducts = useRealStore((s) => s.products)
  const realVideos = useRealStore((s) => s.videos)
  const realConnected = useRealStore((s) => s.control.tiktokStatus === 'CONNECTED')

  const earnings = useMemo(
    () =>
      demoMode
        ? computeEarnings(demoPerformance, demoProducts, demoVideos, true)
        : computeRealEarnings(realPerformance, realProducts, realVideos, realConnected),
    [demoMode, demoPerformance, demoProducts, demoVideos, realPerformance, realProducts, realVideos, realConnected],
  )

  return (
    <ScreenShell
      title="EARNINGS"
      subtitle={
        earnings.connected
          ? demoMode
            ? 'TikTok Shop: DEMO — dati simulati'
            : 'TikTok Shop: connesso'
          : 'TikTok Shop: Not connected'
      }
      accent="#35e6c4"
    >
      {!earnings.connected && (
        <div className="mb-4 rounded-xl border border-vantera-line bg-vantera-panel px-4 py-3 text-xs text-vantera-muted">
          TikTok Shop non è ancora collegato: nessun guadagno reale è disponibile. Tutti i valori
          sotto sono <strong className="text-vantera-ink">0</strong> finché non vengono fornite
          credenziali API reali. Attiva Demo Mode in Control per vedere come apparirà questa
          schermata con dati simulati.
        </div>
      )}
      {earnings.isDemo && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-vantera-warn/40 bg-vantera-warn/10 px-4 py-2 text-xs text-vantera-warn">
          <span className="rounded-full bg-vantera-warn/20 px-2 py-0.5 text-[9px] font-bold">DEMO</span>
          Questi numeri sono generati dalla pipeline simulata, non da ordini reali.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Today" value={earnings.today} highlight />
        <StatCard label="This week" value={earnings.week} />
        <StatCard label="This month" value={earnings.month} />
        <StatCard label="Total" value={earnings.total} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <MiniStat label="Pending" value={earnings.pending} color="#ffb648" />
        <MiniStat label="Confirmed" value={earnings.confirmed} color="#4fa9ff" />
        <MiniStat label="Paid" value={earnings.paid} color="#35e6c4" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-vantera-panel px-3 py-2.5">
          <div className="text-lg font-semibold text-vantera-ink">{earnings.orders}</div>
          <div className="text-[10px] text-vantera-muted">Ordini</div>
        </div>
        <div className="rounded-xl bg-vantera-panel px-3 py-2.5">
          <div className="text-lg font-semibold text-vantera-ink">{earnings.conversions}</div>
          <div className="text-[10px] text-vantera-muted">Conversioni</div>
        </div>
      </div>

      <Section title="Commissioni per prodotto">
        {earnings.byProduct.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="space-y-1.5">
            {earnings.byProduct
              .sort((a, b) => b.amount - a.amount)
              .map((p) => (
                <Row key={p.productId} label={p.productName} value={money(p.amount)} />
              ))}
          </div>
        )}
      </Section>

      <Section title="Commissioni per video">
        {earnings.byVideo.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="space-y-1.5">
            {earnings.byVideo
              .sort((a, b) => b.amount - a.amount)
              .map((v) => (
                <Row key={v.videoId} label={v.videoTitle} value={money(v.amount)} />
              ))}
          </div>
        )}
      </Section>
    </ScreenShell>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ background: highlight ? 'linear-gradient(135deg,#ff2f6e33,#7c5cff22)' : '#12172a', border: '1px solid #2b3358' }}
    >
      <div className="font-pixel text-[9px] uppercase tracking-wide text-vantera-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-vantera-ink">{money(value)}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-vantera-panel px-2.5 py-2 text-center">
      <div className="text-sm font-semibold" style={{ color }}>
        {money(value)}
      </div>
      <div className="text-[9px] text-vantera-muted">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-1.5 font-pixel text-[9px] uppercase tracking-wider text-vantera-muted">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-vantera-panel px-3 py-2 text-xs">
      <span className="truncate text-vantera-ink">{label}</span>
      <span className="shrink-0 font-semibold text-vantera-ink">{value}</span>
    </div>
  )
}

function EmptyRow() {
  return <div className="rounded-lg bg-vantera-panel px-3 py-2 text-xs text-vantera-muted">Nessun dato disponibile.</div>
}
