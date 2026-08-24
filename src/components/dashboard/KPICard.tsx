import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { TrendPill } from '@/components/ui/trend-pill'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'

interface KPICardProps {
  metric: FinancialSnapshotMetric
  /**
   * Defaults to INR currency formatting (Dashboard/Analytics usage).
   * Pass a custom formatter for non-currency metrics — e.g. Statements'
   * KPI row, which shows plain counts.
   */
  formatValue?: (value: number) => string
  /**
   * Overrides the value's text-size utility. Defaults to `text-display-kpi`
   * (36px) — the right size for the 3–4 column grids Dashboard/Analytics
   * use, but too large for denser 4–5 column rows (Accounts/Credit Cards),
   * where large crore-value INR strings wrapped onto a second line even
   * with `break-all`. Callers in tighter grids can pass a smaller size
   * instead of the default.
   */
  valueClassName?: string
  /** Makes the whole card a button (e.g. Financial Pulse's Spend/Inflow tiles opening a drawer). Omit for a plain, non-interactive card. */
  onClick?: () => void
  /** Accessible name for the button variant — the visible label text alone is ambiguous (account tiles reuse the same "Spend"/"Inflow" wording). */
  ariaLabel?: string
  /** Small muted subtitle under the value — e.g. clarifying which accounts a figure is scoped to. Neutral, unlike `trend`/`warningLabel`. */
  caption?: string
}

export function KPICard({
  metric,
  formatValue = formatINR,
  valueClassName,
  onClick,
  ariaLabel,
  caption,
}: KPICardProps) {
  const className = cn(
    'flex w-full flex-col justify-between rounded-lg border border-border bg-card p-md text-left',
    onClick && 'transition-colors hover:border-primary hover:bg-surface-hover',
    metric.warningLabel && 'border-l-4 border-l-destructive',
  )

  const content = (
    <>
      <div className="min-w-0">
        <span className="text-label-caps uppercase text-muted-foreground">{metric.label}</span>
        <div
          className={cn(
            'mt-xs truncate tabular-nums text-foreground',
            valueClassName ?? 'text-display-kpi',
          )}
          title={formatValue(metric.value)}
        >
          {formatValue(metric.value)}
        </div>
        {caption && <p className="mt-xs text-[11px] text-muted-foreground">{caption}</p>}
      </div>
      {metric.trend && (
        <div className="mt-md">
          <TrendPill trend={metric.trend} />
        </div>
      )}
      {metric.warningLabel && (
        <div className="mt-md flex items-center gap-xs text-table-mono font-medium uppercase tracking-widest text-destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <span>{metric.warningLabel}</span>
        </div>
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
