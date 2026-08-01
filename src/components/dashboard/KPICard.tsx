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
}

export function KPICard({ metric }: KPICardProps) {
  const TrendIcon = metric.trend ? trendIcon[metric.trend.direction] : null

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-lg border border-border bg-card p-md',
        metric.warningLabel && 'border-l-4 border-l-destructive',
      )}
    >
      <div>
        <span className="text-label-caps uppercase text-muted-foreground">{metric.label}</span>
        <div className="mt-xs text-display-kpi tabular-nums text-foreground">
          {formatINR(metric.value)}
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
