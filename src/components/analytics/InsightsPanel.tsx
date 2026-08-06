import { AlertOctagon, AlertTriangle, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { AnalyticsInsight, AnalyticsInsightSeverity } from '@/domain/Analytics'

const SEVERITY_ICON: Record<AnalyticsInsightSeverity, typeof Info> = {
  good: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  serious: AlertTriangle,
  critical: AlertOctagon,
}

const SEVERITY_CLASS: Record<AnalyticsInsightSeverity, string> = {
  good: 'text-viz-good bg-viz-good/10',
  info: 'text-primary bg-primary/10',
  warning: 'text-viz-warning bg-viz-warning/10',
  serious: 'text-viz-serious bg-viz-serious/10',
  critical: 'text-viz-critical bg-viz-critical/10',
}

interface InsightsPanelProps {
  insights: readonly AnalyticsInsight[]
  onInsightClick: (insight: AnalyticsInsight) => void
}

/** Rule-based insight cards computed in `MockAnalyticsRepository.getInsights`
 * (never in this component — CLAUDE.md: no calculations inside React). A
 * click cross-filters using the insight's `actionFilter`, same tier-2
 * interaction every chart/table uses. */
export function InsightsPanel({ insights, onInsightClick }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Info}
        title="No insights yet"
        description="Insights surface automatically as spend, statement, and card activity accumulate for the selected filters."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight, index) => {
        const Icon = SEVERITY_ICON[insight.severity]
        const clickable = Boolean(insight.actionFilter)
        const content = (
          <>
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                SEVERITY_CLASS[insight.severity],
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-foreground">{insight.title}</p>
              <p className="mt-0.5 text-body-sm text-muted-foreground">{insight.description}</p>
            </div>
          </>
        )

        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03, ease: 'easeOut' }}
          >
            {clickable ? (
              <button
                type="button"
                className="flex w-full items-start gap-sm rounded-lg border border-border bg-card p-md text-left transition-colors hover:border-primary/40 hover:bg-accent"
                onClick={() => onInsightClick(insight)}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-sm rounded-lg border border-border bg-card p-md">
                {content}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
