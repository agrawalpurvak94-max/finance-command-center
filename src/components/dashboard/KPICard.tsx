import type { LucideIcon } from 'lucide-react'
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
  /** Optional leading identity icon (e.g. Account Intelligence's Portfolio Snapshot) — omit for the plain label/value card every other caller already uses. */
  icon?: LucideIcon
  /** Background/text pairing for the icon chip — required whenever `icon` is passed, e.g. `'bg-blue-500/10 text-blue-400'`. */
  iconClassName?: string
  /**
   * Richer surface (soft inner highlight + hover border glow + a blurred
   * icon halo) for a page's own dedicated summary row — e.g. Account
   * Intelligence's Portfolio Snapshot. Every other existing caller omits
   * this and keeps today's plain card exactly as-is.
   */
  elevated?: boolean
  /** Hover glow color for `elevated` — a CSS color value (hex, or a `var(--token)` reference), ignored unless `elevated` is set. */
  glowColor?: string
}

export function KPICard({
  metric,
  formatValue = formatINR,
  valueClassName,
  onClick,
  ariaLabel,
  caption,
  icon: Icon,
  iconClassName,
  elevated,
  glowColor,
}: KPICardProps) {
  const className = cn(
    'flex w-full flex-col justify-between rounded-lg border border-border bg-card p-md text-left',
    onClick && 'transition-colors hover:border-primary hover:bg-surface-hover',
    metric.warningLabel && 'border-l-4 border-l-destructive',
    elevated && 'glow-ring-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
  )
  const style = elevated ? { ['--glow-ring-color' as string]: glowColor } : undefined

  const content = (
    <>
      <div className="flex min-w-0 items-start gap-sm">
        {Icon && (
          <span className="relative shrink-0">
            {elevated && (
              <span
                aria-hidden="true"
                className={cn('absolute inset-0 rounded-full opacity-60 blur-md', iconClassName)}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative flex size-8 items-center justify-center rounded-full',
                iconClassName,
              )}
            >
              <Icon className="size-4" />
            </span>
          </span>
        )}
        <div className="min-w-0 flex-1">
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
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={className}
        style={style}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  )
}
