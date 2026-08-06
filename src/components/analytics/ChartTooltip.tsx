import { formatINR } from '@/utils/currency'

interface TooltipEntry {
  readonly label: string
  readonly value: number
  readonly color: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string
  entries?: readonly TooltipEntry[]
}

/** Custom Recharts tooltip content — values lead (Strong, high-contrast),
 * series name follows, keyed with a stroke swatch rather than a filled box.
 * Every chart in this module passes its own `entries` here instead of using
 * Recharts' default tooltip. */
export function ChartTooltip({ active, label, entries }: ChartTooltipProps) {
  if (!active || !entries || entries.length === 0) return null

  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover p-sm shadow-lg ring-1 ring-foreground/10">
      {label && (
        <div className="mb-xs text-label-caps font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-xs">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between gap-md text-body-sm">
            <span className="flex items-center gap-xs text-muted-foreground">
              <span
                className="inline-block h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatINR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
