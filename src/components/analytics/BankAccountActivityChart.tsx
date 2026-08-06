import {
  Area,
  AreaChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/analytics/ChartCard'
import { ChartTooltip } from '@/components/analytics/ChartTooltip'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AnalyticsAccountActivityResult } from '@/domain/Analytics'

interface BankAccountActivityChartProps extends AnalyticsWidgetHandlers {
  data: AnalyticsAccountActivityResult
}

export function BankAccountActivityChart({
  data,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: BankAccountActivityChartProps) {
  return (
    <ChartCard
      title="Bank Account Activity"
      subtitle="Credits, debits and net flow"
      legend={
        <div className="flex items-center gap-md text-label-caps text-muted-foreground">
          <span className="flex items-center gap-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--viz-3)' }} />
            Credits
          </span>
          <span className="flex items-center gap-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--viz-8)' }} />
            Debits
          </span>
          <span className="flex items-center gap-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--viz-1)' }} />
            Net
          </span>
        </div>
      }
      onViewTransactions={data.byAccount.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={[...data.points]}
          margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
          onMouseMove={(state) => {
            const point = data.points.find((p) => p.bucketLabel === state?.activeLabel)
            if (point) onHover({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
          }}
          onMouseLeave={() => onHover(null)}
          onClick={(state) => {
            const point = data.points.find((p) => p.bucketLabel === state?.activeLabel)
            if (point) onCrossFilter({ dateFrom: point.bucketStart, dateTo: point.bucketEnd })
          }}
        >
          <defs>
            <linearGradient id="viz-credits-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-3)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--viz-3)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="viz-debits-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-8)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--viz-8)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
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
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={label as string}
                entries={[
                  {
                    label: 'Credits',
                    color: 'var(--viz-3)',
                    value: Number(payload?.find((p) => p.dataKey === 'credits')?.value ?? 0),
                  },
                  {
                    label: 'Debits',
                    color: 'var(--viz-8)',
                    value: Number(payload?.find((p) => p.dataKey === 'debits')?.value ?? 0),
                  },
                  {
                    label: 'Net',
                    color: 'var(--viz-1)',
                    value: Number(payload?.find((p) => p.dataKey === 'net')?.value ?? 0),
                  },
                ]}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="credits"
            stroke="var(--viz-3)"
            strokeWidth={2}
            fill="url(#viz-credits-fill)"
            animationDuration={220}
          />
          <Area
            type="monotone"
            dataKey="debits"
            stroke="var(--viz-8)"
            strokeWidth={2}
            fill="url(#viz-debits-fill)"
            animationDuration={220}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--viz-1)"
            strokeWidth={2}
            dot={false}
            animationDuration={220}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-md flex flex-col gap-xs border-t border-border pt-md">
        <span className="text-label-caps text-muted-foreground">By Account</span>
        {data.byAccount.map((row) => (
          <button
            key={row.id}
            type="button"
            className={cn(
              'flex items-center justify-between gap-md rounded-md px-xs py-1 text-left text-body-sm transition-opacity duration-200 hover:bg-accent',
              isHighlighted(hoveredDimension, row.drillFilter) ? 'opacity-100' : 'opacity-40',
            )}
            onMouseEnter={() => row.drillFilter && onHover(row.drillFilter)}
            onMouseLeave={() => onHover(null)}
            onClick={() => row.drillFilter && onCrossFilter(row.drillFilter)}
          >
            <span className="text-foreground">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {row.valueLabel} debits · {row.secondaryLabel}
            </span>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}
