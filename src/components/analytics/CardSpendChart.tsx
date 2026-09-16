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

interface CardSpendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsRankedRow[]
  viewLabel?: string
}

/**
 * Total spend per CREDIT CARD (one bar per card, combining every statement
 * that card has in the selected range) — never one bar per statement. See
 * `statementAnalyticsService.getCardSpend`'s doc comment for the grouping
 * rule. Horizontal layout, matching `MerchantSpendChart`, since card labels
 * ("HDFC Bank •••• 1581") run long on a vertical category axis.
 */
export function CardSpendChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
  viewLabel,
}: CardSpendChartProps) {
  return (
    <ChartCard
      title="Spend by Credit Card"
      subtitle="Total spend per card, combining all its statements in range"
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
      viewLabel={viewLabel}
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
                  entries={row ? [{ label: 'Spend', value: row.value, color: 'var(--viz-2)' }] : []}
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
                fill="var(--viz-2)"
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
