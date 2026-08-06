import {
  CalendarClock,
  LayoutDashboard,
  Scale,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

const CAPABILITIES: readonly { label: string; icon: LucideIcon }[] = [
  { label: 'Forecasting', icon: TrendingUp },
  { label: 'Budget vs Actual', icon: Scale },
  { label: 'AI Insights', icon: Sparkles },
  { label: 'Custom Dashboards', icon: LayoutDashboard },
  { label: 'Saved & Scheduled Reports', icon: CalendarClock },
]

/** Placeholders for capabilities explicitly out of scope for Module 10 — kept
 * visible-but-disabled per the brief's "leave placeholders" instruction
 * rather than omitted entirely. */
export function FutureCapabilitiesStrip() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-md">
      <div className="mb-sm text-label-caps uppercase text-muted-foreground">Coming soon</div>
      <div className="flex flex-wrap gap-sm">
        {CAPABILITIES.map(({ label, icon: Icon }) => (
          <div
            key={label}
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-xs rounded-lg border border-border bg-muted px-sm py-xs text-body-sm text-muted-foreground opacity-60"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
