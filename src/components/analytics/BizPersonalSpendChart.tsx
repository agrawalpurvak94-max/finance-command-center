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
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { formatINR } from '@/utils/currency'
import type { AnalyticsOwnerTypePoint } from '@/domain/Analytics'

const BUSINESS_COLOR = 'var(--viz-1)'
const PERSONAL_COLOR = 'var(--viz-3)'

interface BizPersonalSpendChartProps extends AnalyticsWidgetHandlers {
  data: readonly AnalyticsOwnerTypePoint[]
}

export function BizPersonalSpendChart({
  data,
  onHover,
  onCrossFilter,
  onDrillDown,
}: BizPersonalSpendChartProps) {
  function handleBarClick(ownerType: 'business' | 'personal', item: BarRectangleItem) {
    const point = item.payload as AnalyticsOwnerTypePoint
    onCrossFilter({ ownerType, dateFrom: point.bucketStart, dateTo: point.bucketEnd })
  }

  function handleBarHover(ownerType: 'business' | 'personal', item: BarRectangleItem) {
    const point = item.payload as AnalyticsOwnerTypePoint
    onHover({ ownerType, dateFrom: point.bucketStart, dateTo: point.bucketEnd })
  }

  return (
    <ChartCard
      title="Business vs Personal Spend"
      subtitle="Monthly comparison"
      legend={
        <div className="flex items-center gap-md text-label-caps text-muted-foreground">
          <span className="flex items-center gap-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: BUSINESS_COLOR }} />
            Business
          </span>
          <span className="flex items-center gap-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: PERSONAL_COLOR }} />
            Personal
          </span>
        </div>
      }
      onViewTransactions={data.length ? () => onDrillDown({}) : undefined}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={[...data]}
          margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
          barGap={4}
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
                entries={[
                  {
                    label: 'Business',
                    color: BUSINESS_COLOR,
                    value: Number(payload?.find((p) => p.dataKey === 'business')?.value ?? 0),
                  },
                  {
                    label: 'Personal',
                    color: PERSONAL_COLOR,
                    value: Number(payload?.find((p) => p.dataKey === 'personal')?.value ?? 0),
                  },
                ]}
              />
            )}
          />
          <Bar
            dataKey="business"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            animationDuration={220}
            className="cursor-pointer"
            onClick={(item: BarRectangleItem) => handleBarClick('business', item)}
            onMouseEnter={(item: BarRectangleItem) => handleBarHover('business', item)}
          >
            {data.map((point) => (
              <Cell key={`business-${point.bucketStart}`} fill={BUSINESS_COLOR} />
            ))}
          </Bar>
          <Bar
            dataKey="personal"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            animationDuration={220}
            className="cursor-pointer"
            onClick={(item: BarRectangleItem) => handleBarClick('personal', item)}
            onMouseEnter={(item: BarRectangleItem) => handleBarHover('personal', item)}
          >
            {data.map((point) => (
              <Cell key={`personal-${point.bucketStart}`} fill={PERSONAL_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
