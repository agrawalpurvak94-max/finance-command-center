import { useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AnalyticsCardSeriesResult } from '@/domain/Analytics'

const VIZ_COLOR = (index: number) => `var(--viz-${(index % 8) + 1})`

interface CreditCardSpendChartProps extends AnalyticsWidgetHandlers {
  data: AnalyticsCardSeriesResult
}

export function CreditCardSpendChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: CreditCardSpendChartProps) {
  const chartData = useMemo(
    () => data.points.map((p) => ({ bucketLabel: p.bucketLabel, ...p.values })),
    [data.points],
  )

  return (
    <ChartCard
      title="Credit Card Spend"
      subtitle="Spend by card, month over month"
      legend={
        <div className="flex flex-wrap items-center gap-sm">
          {data.cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              className={cn(
                'flex items-center gap-xs rounded px-1 text-label-caps text-muted-foreground transition-opacity duration-200 hover:text-foreground',
                isHighlighted(hoveredDimension, { creditCardId: card.id })
                  ? 'opacity-100'
                  : 'opacity-40',
              )}
              onMouseEnter={() => onHover({ creditCardId: card.id })}
              onMouseLeave={() => onHover(null)}
              onClick={() => onCrossFilter({ creditCardId: card.id })}
            >
              <span
                className="size-2 rounded-sm"
                style={{ backgroundColor: VIZ_COLOR(index) }}
                aria-hidden="true"
              />
              {card.label}
            </button>
          ))}
        </div>
      }
      onViewTransactions={data.cards.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
          onMouseLeave={() => onHover(null)}
        >
          <XAxis
            dataKey="bucketLabel"
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
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
            cursor={{ fill: 'var(--accent)' }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={label as string}
                entries={data.cards
                  .map((card, index) => ({
                    label: card.label,
                    color: VIZ_COLOR(index),
                    value: Number(payload?.find((p) => p.dataKey === card.id)?.value ?? 0),
                  }))
                  .filter((e) => e.value > 0)}
              />
            )}
          />
          {data.cards.map((card, index) => (
            <Bar
              key={card.id}
              dataKey={card.id}
              stackId="cards"
              fill={VIZ_COLOR(index)}
              radius={index === data.cards.length - 1 ? [4, 4, 0, 0] : undefined}
              maxBarSize={36}
              animationDuration={220}
              className="cursor-pointer transition-opacity duration-200"
              opacity={isHighlighted(hoveredDimension, { creditCardId: card.id }) ? 1 : 0.35}
              onClick={() => onCrossFilter({ creditCardId: card.id })}
              onMouseEnter={() => onHover({ creditCardId: card.id })}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
