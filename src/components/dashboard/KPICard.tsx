import { TrendingDown, TrendingUp, Minus, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

const trendToneClass = {
  positive: 'text-secondary',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
}

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
}

export function KPICard({ metric, formatValue = formatINR, valueClassName }: KPICardProps) {
  const TrendIcon = metric.trend ? trendIcon[metric.trend.direction] : null

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-lg border border-border bg-card p-md',
        metric.warningLabel && 'border-l-4 border-l-destructive',
      )}
    >
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
      </div>
      {metric.trend && TrendIcon && (
        <div
          className={cn(
            'mt-md flex items-center gap-xs text-table-mono',
            trendToneClass[metric.trend.tone],
          )}
        >
          <TrendIcon className="size-4" aria-hidden="true" />
          <span>{metric.trend.label}</span>
        </div>
      )}
      {metric.warningLabel && (
        <div className="mt-md flex items-center gap-xs text-table-mono font-medium uppercase tracking-widest text-destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <span>{metric.warningLabel}</span>
        </div>
      )}
    </div>
  )
}
