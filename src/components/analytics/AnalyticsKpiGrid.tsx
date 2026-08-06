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

export function AnalyticsKpiGrid({
  summary,
  hoveredDimension,
  onHover,
  onCrossFilter,
}: AnalyticsKpiGridProps) {
  const items = buildMetrics(summary)

  return (
    <div className="mb-lg grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ metric, formatValue }, index) => {
        const clickable = Boolean(metric.drillFilter)
        return (
          <motion.div
            key={metric.id}
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
                  valueClassName="text-headline-lg sm:text-2xl"
                />
              </button>
            ) : (
              <KPICard
                metric={metric}
                formatValue={formatValue ?? formatINR}
                valueClassName="text-headline-lg sm:text-2xl"
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
