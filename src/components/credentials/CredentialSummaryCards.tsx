import { CreditCard, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { AccountCredentialRecord } from '@/domain/Credential'

interface CredentialSummaryCardsProps {
  records: readonly AccountCredentialRecord[]
  /** Jumps the docked detail panel to the first missing-credential row. No-op when nothing is missing. */
  onResolve: () => void
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * Bespoke bento-style cards matching the Stitch Credentials reference's
 * summary treatment (label+icon, baseline number+unit, caption+secondary
 * stat/action) — deliberately not a reuse of the generic dashboard
 * `KPICard`, which has no slot for the secondary stat/action row Stitch
 * calls for.
 *
 * Stitch's cards also show "100% mapped" / a "READY" pill / "n8n ready" —
 * dropped here since the frontend has no real signal for n8n/mapping state
 * and showing them would be fabricated operational status. The percentage
 * shown on the middle card is genuinely computed from the same records the
 * table renders.
 */
export function CredentialSummaryCards({ records, onResolve }: CredentialSummaryCardsProps) {
  const total = records.length
  const configured = records.filter((r) => !!r.statementPassword).length
  const missing = total - configured
  const configuredPercent = total > 0 ? Math.round((configured / total) * 1000) / 10 : 0

  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
      <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-md shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-label-caps uppercase text-muted-foreground">
            Statement Credentials
          </span>
          <CreditCard className="size-4.5 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="my-sm flex items-baseline gap-sm">
          <span className="text-display-kpi text-foreground tabular-nums">
            {formatCount(total)}
          </span>
          <span className="text-body-sm text-muted-foreground">Accounts</span>
        </div>
        <p className="text-body-sm text-muted-foreground">Configured across portfolio</p>
      </div>

      <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-md shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-label-caps uppercase text-muted-foreground">
            Credentials Configured
          </span>
          <ShieldCheck className="size-4.5 text-primary" aria-hidden="true" />
        </div>
        <div className="my-sm flex items-baseline gap-sm">
          <span className="text-display-kpi text-foreground tabular-nums">
            {formatCount(configured)}
          </span>
          <span className="text-body-sm text-primary">Active</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-muted-foreground">Active in Supabase</p>
          <span className="text-table-mono text-muted-foreground tabular-nums">
            {configuredPercent}%
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-md shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-label-caps uppercase text-amber-400">Action Required</span>
          <TriangleAlert className="size-4.5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="my-sm flex items-baseline gap-sm">
          <span className="text-display-kpi text-amber-400 tabular-nums">
            {formatCount(missing)}
          </span>
          <span className="text-body-sm text-amber-400">Missing</span>
        </div>
        <div className="flex items-center justify-between gap-sm">
          <p className="truncate text-body-sm text-muted-foreground">
            Password missing for statement ingestion
          </p>
          {missing > 0 && (
            <button
              type="button"
              onClick={onResolve}
              className="shrink-0 text-label-caps font-semibold uppercase tracking-wide text-amber-400 hover:underline"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
