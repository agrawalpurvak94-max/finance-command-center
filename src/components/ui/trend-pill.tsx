import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Trend } from '@/domain/Dashboard'

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

/**
 * Financial trend tone convention — distinct from `SemanticTone` in
 * `semanticTone.ts`. Positive movement is `--secondary` (blue), not
 * green: this matches the existing Inflow/positive-trend treatment
 * already established in `AccountCard` and the prior `KPICard` trend
 * row, so it's preserved rather than switched to emerald.
 */
const trendToneClassNames: Record<Trend['tone'], string> = {
  positive: 'bg-secondary/10 text-secondary',
  negative: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted-foreground/10 text-muted-foreground',
}

interface TrendPillProps {
  trend: Trend
  className?: string
}

export function TrendPill({ trend, className }: TrendPillProps) {
  const Icon = trendIcon[trend.direction]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-xs rounded-full px-2 py-0.5 text-[11px] font-medium',
        trendToneClassNames[trend.tone],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {trend.label}
    </span>
  )
}
