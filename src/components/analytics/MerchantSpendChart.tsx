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

interface MerchantSpendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsRankedRow[]
}

export function MerchantSpendChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: MerchantSpendChartProps) {
  return (
    <ChartCard
      title="Merchant Spend"
      subtitle="Top merchants by spend volume"
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
          barCategoryGap={10}
          onMouseLeave={() => onHover(null)}
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => formatINR(v).replace('.00', '')}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={112}
            tick={{ fill: 'var(--foreground)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as AnalyticsRankedRow | undefined
              return (
                <ChartTooltip
                  active={active}
                  label={row?.label}
                  entries={row ? [{ label: 'Spend', value: row.value, color: 'var(--viz-1)' }] : []}
                />
              )
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
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
                fill="var(--viz-1)"
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
