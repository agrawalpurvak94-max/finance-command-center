import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer, type PieSectorDataItem } from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AnalyticsCategorySlice } from '@/domain/Analytics'

const VIZ_COLOR = (index: number) => `var(--viz-${(index % 8) + 1})`
const OTHER_COLOR = 'var(--muted-foreground)'
const OTHER_ID = '__other__'

// Per the dataviz skill's categorical rule: never cycle a fixed hue set past
// its designed length — a 9th+ series folds into "Other" instead of reusing
// an earlier hue, which is also what keeps every visible slice a genuinely
// distinct color instead of two categories quietly sharing one.
const MAX_SLICES = 7

interface DisplaySlice extends AnalyticsCategorySlice {
  readonly isOther?: boolean
}

function buildDisplaySlices(data: readonly AnalyticsCategorySlice[]): readonly DisplaySlice[] {
  if (data.length <= MAX_SLICES) return data
  const top = data.slice(0, MAX_SLICES)
  const rest = data.slice(MAX_SLICES)
  const other: DisplaySlice = {
    category: { id: OTHER_ID, name: 'Other' },
    amount: rest.reduce((sum, s) => sum + s.amount, 0),
    percentage: rest.reduce((sum, s) => sum + s.percentage, 0),
    isOther: true,
  }
  return [...top, other]
}

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
  const displaySlices = buildDisplaySlices(data)

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
              data={displaySlices}
              dataKey="amount"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              cornerRadius={4}
              animationDuration={220}
              onClick={(pieData: PieSectorDataItem) => {
                const entry = pieData.payload as DisplaySlice
                if (!entry.isOther) onCrossFilter({ categoryId: entry.category.id })
              }}
              onMouseEnter={(pieData: PieSectorDataItem) => {
                const entry = pieData.payload as DisplaySlice
                if (!entry.isOther) onHover({ categoryId: entry.category.id })
              }}
            >
              {displaySlices.map((slice, index) => (
                <Cell
                  key={slice.category.id}
                  fill={slice.isOther ? OTHER_COLOR : VIZ_COLOR(index)}
                  className={cn(
                    'outline-none transition-opacity duration-200',
                    !slice.isOther && 'cursor-pointer',
                  )}
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
                const entry = payload?.[0]?.payload as DisplaySlice | undefined
                return (
                  <ChartTooltip
                    active={active}
                    label={entry?.category.name}
                    entries={
                      entry
                        ? [
                            {
                              label: 'Spend',
                              value: entry.amount,
                              color: entry.isOther ? OTHER_COLOR : 'var(--viz-1)',
                            },
                          ]
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
        {displaySlices.map((slice, index) => (
          <button
            key={slice.category.id}
            type="button"
            disabled={slice.isOther}
            className={cn(
              'flex items-center justify-between gap-md rounded-md px-xs py-1 text-left text-body-sm transition-opacity duration-200',
              !slice.isOther && 'hover:bg-accent',
              isHighlighted(hoveredDimension, { categoryId: slice.category.id })
                ? 'opacity-100'
                : 'opacity-40',
            )}
            onMouseEnter={() => !slice.isOther && onHover({ categoryId: slice.category.id })}
            onMouseLeave={() => onHover(null)}
            onClick={() => !slice.isOther && onCrossFilter({ categoryId: slice.category.id })}
          >
            <span className="flex items-center gap-xs text-foreground">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: slice.isOther ? OTHER_COLOR : VIZ_COLOR(index) }}
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
