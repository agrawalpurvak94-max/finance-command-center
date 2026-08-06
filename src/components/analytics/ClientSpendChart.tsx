import {
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type BarRectangleItem,
} from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { formatINR } from '@/utils/currency'
import type { AnalyticsRankedRow } from '@/domain/Analytics'

interface ClientSpendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsRankedRow[]
}

export function ClientSpendChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: ClientSpendChartProps) {
  return (
    <ChartCard
      title="Client Spend"
      subtitle="Who your spend is attributed to"
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={[...data]}
          margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
          barCategoryGap={16}
          onMouseLeave={() => onHover(null)}
        >
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => formatINR(v).replace('.00', '')}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as AnalyticsRankedRow | undefined
              return (
                <ChartTooltip
                  active={active}
                  label={row?.label}
                  entries={row ? [{ label: 'Spend', value: row.value, color: 'var(--viz-3)' }] : []}
                />
              )
            }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            animationDuration={220}
            onClick={(item: BarRectangleItem) => {
              const row = item.payload as AnalyticsRankedRow
              if (row.drillFilter) onCrossFilter(row.drillFilter)
            }}
            onMouseEnter={(item: BarRectangleItem) => {
              const row = item.payload as AnalyticsRankedRow
              if (row.drillFilter) onHover(row.drillFilter)
            }}
            className="cursor-pointer"
          >
            {data.map((row) => (
              <Cell
                key={row.id}
                fill="var(--viz-3)"
                className="transition-opacity duration-200"
                opacity={isHighlighted(hoveredDimension, row.drillFilter) ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
