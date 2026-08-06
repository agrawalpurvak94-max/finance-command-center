import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer, type PieSectorDataItem } from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AnalyticsCategorySlice } from '@/domain/Analytics'

const VIZ_COLOR = (index: number) => `var(--color-viz-${(index % 8) + 1})`

interface CategorySpendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsCategorySlice[]
}

export function CategorySpendChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: CategorySpendChartProps) {
  const total = data.reduce((sum, s) => sum + s.amount, 0)

  return (
    <ChartCard
      title="Category Split"
      subtitle="Top spending categories"
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
    >
      <div className="relative mb-md h-55 w-full" onMouseLeave={() => onHover(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="amount"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              cornerRadius={4}
              animationDuration={220}
              onClick={(data: PieSectorDataItem) => {
                const entry = data.payload as AnalyticsCategorySlice
                onCrossFilter({ categoryId: entry.category.id })
              }}
              onMouseEnter={(data: PieSectorDataItem) => {
                const entry = data.payload as AnalyticsCategorySlice
                onHover({ categoryId: entry.category.id })
              }}
            >
              {data.map((slice, index) => (
                <Cell
                  key={slice.category.id}
                  fill={VIZ_COLOR(index)}
                  className="cursor-pointer outline-none transition-opacity duration-200"
                  opacity={
                    isHighlighted(hoveredDimension, { categoryId: slice.category.id }) ? 1 : 0.35
                  }
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const entry = payload?.[0]?.payload as AnalyticsCategorySlice | undefined
                return (
                  <ChartTooltip
                    active={active}
                    label={entry?.category.name}
                    entries={
                      entry
                        ? [{ label: 'Spend', value: entry.amount, color: 'var(--color-viz-1)' }]
                        : []
                    }
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-label-caps text-muted-foreground">Total</span>
          <span className="text-headline-sm font-semibold tabular-nums text-foreground">
            {formatINR(total)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-xs" data-testid="category-legend">
        {data.map((slice, index) => (
          <button
            key={slice.category.id}
            type="button"
            className={cn(
              'flex items-center justify-between gap-md rounded-md px-xs py-1 text-left text-body-sm transition-opacity duration-200 hover:bg-accent',
              isHighlighted(hoveredDimension, { categoryId: slice.category.id })
                ? 'opacity-100'
                : 'opacity-40',
            )}
            onMouseEnter={() => onHover({ categoryId: slice.category.id })}
            onMouseLeave={() => onHover(null)}
            onClick={() => onCrossFilter({ categoryId: slice.category.id })}
          >
            <span className="flex items-center gap-xs text-foreground">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: VIZ_COLOR(index) }}
                aria-hidden="true"
              />
              {slice.category.name}
            </span>
            <span className="tabular-nums text-muted-foreground">{formatINR(slice.amount)}</span>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}
