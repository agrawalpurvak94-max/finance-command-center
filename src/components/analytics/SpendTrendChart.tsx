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

const SPEND_COLOR = 'var(--viz-1)'

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
      subtitle="Spend over time"
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
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis
            dataKey="bucketLabel"
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
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
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={label as string}
                entries={[
                  {
                    label: 'Spend',
                    color: SPEND_COLOR,
                    value: Number(payload?.find((p) => p.dataKey === 'spend')?.value ?? 0),
                  },
                ]}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke={SPEND_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, className: 'cursor-pointer' }}
            animationDuration={220}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
