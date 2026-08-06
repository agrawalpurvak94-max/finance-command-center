import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type MouseHandlerDataParam,
} from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/utils/currency'
import type { AnalyticsGranularity, AnalyticsTrendPoint } from '@/domain/Analytics'

const GRANULARITIES: readonly { id: AnalyticsGranularity; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
]

interface SpendTrendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsTrendPoint[]
  granularity: AnalyticsGranularity
  onGranularityChange: (granularity: AnalyticsGranularity) => void
}

const SERIES = [
  { key: 'spend', label: 'Spend', color: 'var(--color-viz-1)' },
  { key: 'income', label: 'Income', color: 'var(--color-viz-3)' },
  { key: 'cashFlow', label: 'Cash Flow', color: 'var(--color-viz-4)' },
] as const

export function SpendTrendChart({
  data,
  granularity,
  onGranularityChange,
  onHover,
  onCrossFilter,
  onDrillDown,
}: SpendTrendChartProps) {
  const handleClick = (state: MouseHandlerDataParam) => {
    if (!state?.activeLabel) return
    const point = data.find((p) => p.bucketLabel === state.activeLabel)
    if (!point) return
    onCrossFilter({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
  }

  const handleMove = (state: MouseHandlerDataParam) => {
    if (!state?.activeLabel) return
    const point = data.find((p) => p.bucketLabel === state.activeLabel)
    if (!point) return
    onHover({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
  }

  return (
    <ChartCard
      title="Financial Performance Overview"
      subtitle="Spend vs Income vs Cash Flow"
      legend={
        <div className="flex items-center gap-md">
          {SERIES.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-xs text-label-caps text-muted-foreground"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
      }
      onViewTransactions={() => onDrillDown({})}
    >
      <div className="mb-sm flex justify-end gap-xs">
        {GRANULARITIES.map((g) => (
          <Button
            key={g.id}
            type="button"
            size="sm"
            variant={granularity === g.id ? 'default' : 'ghost'}
            className="h-7 px-2.5 text-body-sm"
            onClick={() => onGranularityChange(g.id)}
          >
            {g.label}
          </Button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={[...data]}
          onClick={handleClick}
          onMouseMove={handleMove}
          onMouseLeave={() => onHover(null)}
          margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-viz-grid)" />
          <XAxis
            dataKey="bucketLabel"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-viz-axis)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => formatINR(v).replace('.00', '')}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-viz-axis)', strokeWidth: 1 }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={label as string}
                entries={SERIES.map((s) => ({
                  label: s.label,
                  color: s.color,
                  value: Number(payload?.find((p) => p.dataKey === s.key)?.value ?? 0),
                }))}
              />
            )}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, className: 'cursor-pointer' }}
              animationDuration={220}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
