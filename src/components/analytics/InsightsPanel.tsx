import { AlertOctagon, AlertTriangle, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { EmptyState } from '@/components/EmptyState'
import type { AnalyticsInsight, AnalyticsInsightSeverity } from '@/domain/Analytics'

const SEVERITY_ICON: Record<AnalyticsInsightSeverity, typeof Info> = {
  good: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  serious: AlertTriangle,
  critical: AlertOctagon,
}

// Tailwind utility classes (text-viz-good, bg-viz-good/10, …) would depend on
// --color-viz-* being registered in @theme, which is unreliable in this
// Tailwind v4 setup (see index.css) — inline styles reading the raw
// --viz-* custom properties directly instead.
const SEVERITY_COLOR: Record<AnalyticsInsightSeverity, string> = {
  good: 'var(--viz-good)',
  info: 'var(--primary)',
  warning: 'var(--viz-warning)',
  serious: 'var(--viz-serious)',
  critical: 'var(--viz-critical)',
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
        const color = SEVERITY_COLOR[insight.severity]
        const content = (
          <>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
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
