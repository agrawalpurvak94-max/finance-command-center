import { motion } from 'motion/react'
import { KPICard } from '@/components/dashboard/KPICard'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AnalyticsKpiMetric, AnalyticsSummary } from '@/domain/Analytics'
import type { Trend } from '@/domain/Dashboard'

interface AnalyticsKpiGridProps extends AnalyticsWidgetHandlers {
  summary: AnalyticsSummary
}

const countLabel = (n: number) => `${n} txns`

function entityTrend(name: string): Trend {
  return { direction: 'flat', tone: 'neutral', label: name }
}

function buildMetrics(summary: AnalyticsSummary): {
  metric: AnalyticsKpiMetric
  formatValue?: (v: number) => string
}[] {
  return [
    { metric: { id: 'total-spend', label: 'Total Spend', value: summary.totalSpend } },
    {
      metric: {
        id: 'total-transactions',
        label: 'Total Transactions',
        value: summary.totalTransactions,
      },
      formatValue: (v) => `${v}`,
    },
    {
      metric: {
        id: 'average-transaction',
        label: 'Average Transaction',
        value: summary.averageTransaction,
      },
    },
    {
      metric: {
        id: 'monthly-spend',
        label: 'Monthly Spend',
        value: summary.monthlySpend,
        trend: summary.monthlySpendTrend ?? undefined,
      },
    },
    {
      metric: {
        id: 'total-income',
        label: 'Total Income',
        value: summary.totalIncome,
        drillFilter: { type: 'credit' },
      },
    },
    { metric: { id: 'net-cash-flow', label: 'Net Cash Flow', value: summary.netCashFlow } },
    summary.highestSpendingCategory
      ? {
          metric: {
            id: 'highest-category',
            label: 'Highest Spending Category',
            value: summary.highestSpendingCategory.amount,
            trend: entityTrend(summary.highestSpendingCategory.category.name),
            drillFilter: { categoryId: summary.highestSpendingCategory.category.id },
          },
        }
      : { metric: { id: 'highest-category', label: 'Highest Spending Category', value: 0 } },
    summary.highestSpendingMerchant
      ? {
          metric: {
            id: 'highest-merchant',
            label: 'Highest Spending Merchant',
            value: summary.highestSpendingMerchant.amount,
            trend: entityTrend(summary.highestSpendingMerchant.merchant.name),
            drillFilter: { merchantId: summary.highestSpendingMerchant.merchant.id },
          },
        }
      : { metric: { id: 'highest-merchant', label: 'Highest Spending Merchant', value: 0 } },
    summary.mostUsedCard
      ? {
          metric: {
            id: 'most-used-card',
            label: 'Most Used Card',
            value: summary.mostUsedCard.count,
            trend: entityTrend(
              `${summary.mostUsedCard.account.bankName} •••• ${summary.mostUsedCard.account.last4}`,
            ),
            drillFilter: { creditCardId: summary.mostUsedCard.account.id },
          },
          formatValue: countLabel,
        }
      : {
          metric: { id: 'most-used-card', label: 'Most Used Card', value: 0 },
          formatValue: countLabel,
        },
    summary.mostUsedAccount
      ? {
          metric: {
            id: 'most-used-account',
            label: 'Most Used Account',
            value: summary.mostUsedAccount.count,
            trend: entityTrend(
              `${summary.mostUsedAccount.account.bankName} •••• ${summary.mostUsedAccount.account.last4}`,
            ),
            drillFilter: { bankAccountId: summary.mostUsedAccount.account.id },
          },
          formatValue: countLabel,
        }
      : {
          metric: { id: 'most-used-account', label: 'Most Used Account', value: 0 },
          formatValue: countLabel,
        },
  ]
}

/** The first 6 metrics are the headline financial figures (Total Spend
 * through Net Cash Flow); the remaining 4 are entity-based supporting
 * context (highest category/merchant, most-used card/account) — the same
 * distinction `buildMetrics` already encodes via ordering, just rendered as
 * two visual tiers instead of one uniform grid. No metric added, removed,
 * reordered, or recalculated. */
const PRIMARY_METRIC_COUNT = 6

function KpiTile({
  metric,
  formatValue,
  index,
  valueClassName,
  hoveredDimension,
  onHover,
  onCrossFilter,
}: {
  metric: AnalyticsKpiMetric
  formatValue?: (v: number) => string
  index: number
  valueClassName: string
} & Pick<AnalyticsWidgetHandlers, 'hoveredDimension' | 'onHover' | 'onCrossFilter'>) {
  const clickable = Boolean(metric.drillFilter)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02, ease: 'easeOut' }}
      className={cn(
        'transition-opacity duration-200',
        clickable && !isHighlighted(hoveredDimension, metric.drillFilter) && 'opacity-40',
      )}
    >
      {clickable ? (
        <button
          type="button"
          className="w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={() => onHover(metric.drillFilter ?? null)}
          onMouseLeave={() => onHover(null)}
          onClick={() => metric.drillFilter && onCrossFilter(metric.drillFilter)}
        >
          <KPICard
            metric={metric}
            formatValue={formatValue ?? formatINR}
            valueClassName={valueClassName}
          />
        </button>
      ) : (
        <KPICard
          metric={metric}
          formatValue={formatValue ?? formatINR}
          valueClassName={valueClassName}
        />
      )}
    </motion.div>
  )
}

export function AnalyticsKpiGrid({
  summary,
  hoveredDimension,
  onHover,
  onCrossFilter,
}: AnalyticsKpiGridProps) {
  const items = buildMetrics(summary)
  const primary = items.slice(0, PRIMARY_METRIC_COUNT)
  const secondary = items.slice(PRIMARY_METRIC_COUNT)

  return (
    <div className="mb-lg flex flex-col gap-sm">
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-6">
        {primary.map(({ metric, formatValue }, index) => (
          <KpiTile
            key={metric.id}
            metric={metric}
            formatValue={formatValue}
            index={index}
            valueClassName="text-headline-lg sm:text-2xl"
            hoveredDimension={hoveredDimension}
            onHover={onHover}
            onCrossFilter={onCrossFilter}
          />
        ))}
      </div>
      <div>
        <p className="mb-xs text-label-caps text-muted-foreground uppercase">Supporting Context</p>
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
          {secondary.map(({ metric, formatValue }, index) => (
            <KpiTile
              key={metric.id}
              metric={metric}
              formatValue={formatValue}
              index={PRIMARY_METRIC_COUNT + index}
              valueClassName="text-headline-sm sm:text-headline-lg"
              hoveredDimension={hoveredDimension}
              onHover={onHover}
              onCrossFilter={onCrossFilter}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
