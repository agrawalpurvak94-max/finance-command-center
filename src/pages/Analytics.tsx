import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageContainer } from '@/layouts/PageContainer'
import { QueryBoundary } from '@/components/QueryBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalytics, useAnalyticsBankNames } from '@/hooks/useAnalytics'
import { useAnalyticsExports } from '@/hooks/useAnalyticsExports'
import {
  useTransactionAccounts,
  useTransactionCategories,
  useTransactionClients,
  useTransactionMerchants,
} from '@/hooks/useTransactions'
import { AnalyticsHeader, type AnalyticsExportKind } from '@/components/analytics/AnalyticsHeader'
import { GlobalFilterBar } from '@/components/analytics/GlobalFilterBar'
import { ActiveFiltersRow } from '@/components/analytics/ActiveFiltersRow'
import { AnalyticsKpiGrid } from '@/components/analytics/AnalyticsKpiGrid'
import { SpendTrendChart } from '@/components/analytics/SpendTrendChart'
import { CategorySpendChart } from '@/components/analytics/CategorySpendChart'
import { MerchantSpendChart } from '@/components/analytics/MerchantSpendChart'
import { ClientSpendChart } from '@/components/analytics/ClientSpendChart'
import { CreditCardSpendChart } from '@/components/analytics/CreditCardSpendChart'
import { BankAccountActivityChart } from '@/components/analytics/BankAccountActivityChart'
import { BizPersonalSpendChart } from '@/components/analytics/BizPersonalSpendChart'
import { SecondaryAnalyticsTabs } from '@/components/analytics/SecondaryAnalyticsTabs'
import { InsightsPanel } from '@/components/analytics/InsightsPanel'
import { categorySlicesToRows, cardSeriesToRows } from '@/components/analytics/analyticsRowMappers'
import { downloadCsv, analyticsRowsToCsv, transactionsToCsv, statementsToCsv } from '@/utils/csv'
import { cn } from '@/lib/utils'
import type { AnalyticsFilters, AnalyticsGranularity, AnalyticsInsight } from '@/domain/Analytics'

const emptyFilters: AnalyticsFilters = {}

const TRANSACTION_FILTER_KEYS = [
  'dateFrom',
  'dateTo',
  'categoryId',
  'clientId',
  'merchantId',
  'bankAccountId',
  'creditCardId',
  'type',
  'ownerType',
  'paymentMode',
  'status',
] as const satisfies readonly (keyof AnalyticsFilters)[]

export function Analytics() {
  const navigate = useNavigate()
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(emptyFilters)
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('month')
  const [hoveredDimension, setHoveredDimension] = useState<Partial<AnalyticsFilters> | null>(null)

  const categoriesQuery = useTransactionCategories()
  const clientsQuery = useTransactionClients()
  const merchantsQuery = useTransactionMerchants()
  const accountsQuery = useTransactionAccounts()
  const bankNamesQuery = useAnalyticsBankNames()

  const bankAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.kind === 'bank'),
    [accountsQuery.data],
  )
  const creditCards = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.kind === 'credit_card'),
    [accountsQuery.data],
  )

  const analytics = useAnalytics(appliedFilters, granularity)
  const { exportFilteredTransactions, exportFilteredStatements } = useAnalyticsExports()

  const handlers = {
    hoveredDimension,
    onHover: setHoveredDimension,
    onCrossFilter: (dimension: Partial<AnalyticsFilters>) => {
      setAppliedFilters((prev) => ({ ...prev, ...dimension }))
      setDraftFilters((prev) => ({ ...prev, ...dimension }))
    },
    onDrillDown: (extra: Partial<AnalyticsFilters>) => {
      const merged: AnalyticsFilters = { ...appliedFilters, ...extra }
      const params = new URLSearchParams()
      for (const key of TRANSACTION_FILTER_KEYS) {
        const value = merged[key]
        if (value !== undefined) params.set(key, String(value))
      }
      if (merged.amountMin !== undefined) params.set('amountMin', String(merged.amountMin))
      if (merged.amountMax !== undefined) params.set('amountMax', String(merged.amountMax))
      navigate(`/transactions?${params.toString()}`)
    },
  }

  function handleRemoveFilter(key: keyof AnalyticsFilters) {
    setAppliedFilters((prev) => ({ ...prev, [key]: undefined }))
    setDraftFilters((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleClearAll() {
    setAppliedFilters(emptyFilters)
    setDraftFilters(emptyFilters)
  }

  function handleInsightClick(insight: AnalyticsInsight) {
    if (insight.actionFilter) handlers.onCrossFilter(insight.actionFilter)
  }

  async function handleExport(kind: AnalyticsExportKind) {
    switch (kind) {
      case 'transactions': {
        const rows = await exportFilteredTransactions(appliedFilters)
        downloadCsv('analytics-filtered-transactions.csv', transactionsToCsv(rows))
        return
      }
      case 'statements': {
        const rows = await exportFilteredStatements({
          bankName: appliedFilters.bankName,
          clientId: appliedFilters.clientId,
          accountId: appliedFilters.bankAccountId ?? appliedFilters.creditCardId,
        })
        downloadCsv('analytics-filtered-statements.csv', statementsToCsv(rows))
        return
      }
      case 'categories': {
        const rows = categorySlicesToRows(analytics.categorySpend.data ?? [])
        downloadCsv('analytics-category-summary.csv', analyticsRowsToCsv(rows, 'Spend', 'Share'))
        return
      }
      case 'merchants': {
        const rows = analytics.merchantSpend.data ?? []
        downloadCsv(
          'analytics-merchant-summary.csv',
          analyticsRowsToCsv(rows, 'Spend', 'Transactions'),
        )
        return
      }
      case 'clients': {
        const rows = analytics.clientSpend.data ?? []
        downloadCsv(
          'analytics-client-summary.csv',
          analyticsRowsToCsv(rows, 'Spend', 'Transactions'),
        )
        return
      }
      case 'cards': {
        const rows = cardSeriesToRows(analytics.creditCardSpend.data ?? { points: [], cards: [] })
        downloadCsv('analytics-card-summary.csv', analyticsRowsToCsv(rows, 'Spend'))
        return
      }
      case 'dashboard': {
        const summary = analytics.summary.data
        if (!summary) return
        const lines = [
          'Metric,Value',
          `Total Spend,${summary.totalSpend.toFixed(2)}`,
          `Total Transactions,${summary.totalTransactions}`,
          `Average Transaction,${summary.averageTransaction.toFixed(2)}`,
          `Monthly Spend,${summary.monthlySpend.toFixed(2)}`,
          `Total Income,${summary.totalIncome.toFixed(2)}`,
          `Net Cash Flow,${summary.netCashFlow.toFixed(2)}`,
        ].join('\n')
        downloadCsv('analytics-dashboard-summary.csv', lines)
        return
      }
    }
  }

  const referenceData = {
    categories: categoriesQuery.data ?? [],
    clients: clientsQuery.data ?? [],
    merchants: merchantsQuery.data ?? [],
    accounts: accountsQuery.data ?? [],
  }

  return (
    <PageContainer className="flex flex-col gap-lg">
      <AnalyticsHeader onExport={handleExport} />

      <GlobalFilterBar
        draft={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={() => setAppliedFilters(draftFilters)}
        onReset={handleClearAll}
        categories={referenceData.categories}
        clients={referenceData.clients}
        merchants={referenceData.merchants}
        bankAccounts={bankAccounts}
        creditCards={creditCards}
        bankNames={bankNamesQuery.data ?? []}
      />

      <ActiveFiltersRow
        filters={appliedFilters}
        onRemove={handleRemoveFilter}
        onClearAll={handleClearAll}
        categories={referenceData.categories}
        clients={referenceData.clients}
        merchants={referenceData.merchants}
        accounts={referenceData.accounts}
      />

      <QueryBoundary query={analytics.summary} skeleton={<Skeleton className="h-40 rounded-xl" />}>
        {(summary) => (
          <div
            className={cn(
              'transition-opacity duration-300',
              analytics.summary.isFetching && 'opacity-60',
            )}
          >
            <AnalyticsKpiGrid summary={summary} {...handlers} />
          </div>
        )}
      </QueryBoundary>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div
          className={cn(
            'lg:col-span-2 transition-opacity duration-300',
            analytics.spendTrend.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.spendTrend}
            skeleton={<Skeleton className="h-96 rounded-xl" />}
          >
            {(data) => (
              <SpendTrendChart
                data={data}
                granularity={granularity}
                onGranularityChange={setGranularity}
                {...handlers}
              />
            )}
          </QueryBoundary>
        </div>
        <div
          className={cn(
            'transition-opacity duration-300',
            analytics.categorySpend.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.categorySpend}
            skeleton={<Skeleton className="h-96 rounded-xl" />}
          >
            {(data) => <CategorySpendChart data={data} {...handlers} />}
          </QueryBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div
          className={cn(
            'transition-opacity duration-300',
            analytics.merchantSpend.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.merchantSpend}
            skeleton={<Skeleton className="h-80 rounded-xl" />}
          >
            {(data) => <MerchantSpendChart data={data} {...handlers} />}
          </QueryBoundary>
        </div>
        <div
          className={cn(
            'transition-opacity duration-300',
            analytics.clientSpend.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.clientSpend}
            skeleton={<Skeleton className="h-80 rounded-xl" />}
          >
            {(data) => <ClientSpendChart data={data} {...handlers} />}
          </QueryBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div
          className={cn(
            'transition-opacity duration-300',
            analytics.creditCardSpend.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.creditCardSpend}
            skeleton={<Skeleton className="h-72 rounded-xl" />}
          >
            {(data) => <CreditCardSpendChart data={data} {...handlers} />}
          </QueryBoundary>
        </div>
        <div
          className={cn(
            'transition-opacity duration-300',
            analytics.bankAccountActivity.isFetching && 'opacity-60',
          )}
        >
          <QueryBoundary
            query={analytics.bankAccountActivity}
            skeleton={<Skeleton className="h-72 rounded-xl" />}
          >
            {(data) => <BankAccountActivityChart data={data} {...handlers} />}
          </QueryBoundary>
        </div>
      </div>

      <div
        className={cn(
          'transition-opacity duration-300',
          analytics.ownerTypeSpend.isFetching && 'opacity-60',
        )}
      >
        <QueryBoundary
          query={analytics.ownerTypeSpend}
          skeleton={<Skeleton className="h-80 rounded-xl" />}
        >
          {(data) => <BizPersonalSpendChart data={data} {...handlers} />}
        </QueryBoundary>
      </div>

      <QueryBoundary
        query={analytics.merchantSpend}
        skeleton={<Skeleton className="h-96 rounded-xl" />}
      >
        {() => (
          <SecondaryAnalyticsTabs
            categorySpend={analytics.categorySpend.data ?? []}
            merchantSpend={analytics.merchantSpend.data ?? []}
            clientSpend={analytics.clientSpend.data ?? []}
            creditCardSpend={analytics.creditCardSpend.data ?? { points: [], cards: [] }}
            bankAccountRows={analytics.bankAccountActivity.data?.byAccount ?? []}
            highestTransactions={analytics.highestTransactions.data ?? []}
            recurringMerchants={analytics.recurringMerchants.data ?? []}
            largestExpenses={analytics.largestExpenses.data ?? []}
            refundAnalysis={analytics.refundAnalysis.data ?? []}
            {...handlers}
          />
        )}
      </QueryBoundary>

      <div>
        <h3 className="mb-md text-headline-sm font-semibold text-foreground">Insights</h3>
        <QueryBoundary
          query={analytics.insights}
          skeleton={<Skeleton className="h-32 rounded-xl" />}
        >
          {(insights) => <InsightsPanel insights={insights} onInsightClick={handleInsightClick} />}
        </QueryBoundary>
      </div>
    </PageContainer>
  )
}

export default Analytics
