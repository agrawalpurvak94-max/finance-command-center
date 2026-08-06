import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { formatINR } from '@/utils/currency'
import type { AnalyticsCashFlowPoint } from '@/domain/Analytics'

interface CashFlowChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsCashFlowPoint[]
}

const SERIES = [
  { key: 'income', label: 'Income', color: 'var(--color-viz-3)' },
  { key: 'expense', label: 'Expense', color: 'var(--color-viz-8)' },
  { key: 'net', label: 'Net', color: 'var(--color-viz-1)' },
] as const

export function CashFlowChart({ data, onHover, onCrossFilter, onDrillDown }: CashFlowChartProps) {
  return (
    <ChartCard
      title="Cash Flow"
      subtitle="Income vs expense"
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
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={[...data]}
          margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
          onMouseMove={(state) => {
            const point = data.find((p) => p.bucketLabel === state?.activeLabel)
            if (point) onHover({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
          }}
          onMouseLeave={() => onHover(null)}
          onClick={(state) => {
            const point = data.find((p) => p.bucketLabel === state?.activeLabel)
            if (point) onCrossFilter({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
          }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-viz-grid)" />
          <XAxis
            dataKey="bucketLabel"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-viz-axis)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
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
