import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { AnalyticsTable } from '@/components/analytics/AnalyticsTable'
import { categorySlicesToRows, cardSeriesToRows } from '@/components/analytics/analyticsRowMappers'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import type {
  AnalyticsCardSeriesResult,
  AnalyticsCategorySlice,
  AnalyticsRankedRow,
} from '@/domain/Analytics'

interface SecondaryAnalyticsTabsProps extends AnalyticsWidgetHandlers {
  categorySpend: readonly AnalyticsCategorySlice[]
  merchantSpend: readonly AnalyticsRankedRow[]
  clientSpend: readonly AnalyticsRankedRow[]
  creditCardSpend: AnalyticsCardSeriesResult
  bankAccountRows: readonly AnalyticsRankedRow[]
  highestTransactions: readonly AnalyticsRankedRow[]
  recurringMerchants: readonly AnalyticsRankedRow[]
  largestExpenses: readonly AnalyticsRankedRow[]
  refundAnalysis: readonly AnalyticsRankedRow[]
  statementProcessingStatus: readonly AnalyticsRankedRow[]
}

interface TabDef {
  readonly id:
    | 'categories'
    | 'merchants'
    | 'clients'
    | 'cards'
    | 'accounts'
    | 'highest'
    | 'recurring'
    | 'largest'
    | 'refunds'
    | 'statements'
  readonly label: string
  readonly valueColumnLabel: string
  readonly secondaryColumnLabel?: string
}

const TAB_DEFS: readonly TabDef[] = [
  {
    id: 'categories',
    label: 'Top Categories',
    valueColumnLabel: 'Spend',
    secondaryColumnLabel: 'Share',
  },
  {
    id: 'merchants',
    label: 'Top Merchants',
    valueColumnLabel: 'Spend',
    secondaryColumnLabel: 'Transactions',
  },
  {
    id: 'clients',
    label: 'Top Clients',
    valueColumnLabel: 'Spend',
    secondaryColumnLabel: 'Transactions',
  },
  { id: 'cards', label: 'Top Credit Cards', valueColumnLabel: 'Spend' },
  {
    id: 'accounts',
    label: 'Top Accounts',
    valueColumnLabel: 'Debits',
    secondaryColumnLabel: 'Credits',
  },
  {
    id: 'highest',
    label: 'Highest Transactions',
    valueColumnLabel: 'Amount',
    secondaryColumnLabel: 'Category',
  },
  {
    id: 'recurring',
    label: 'Recurring Merchants',
    valueColumnLabel: 'Spend',
    secondaryColumnLabel: 'Transactions',
  },
  {
    id: 'largest',
    label: 'Largest Expenses',
    valueColumnLabel: 'Amount',
    secondaryColumnLabel: 'Category',
  },
  {
    id: 'refunds',
    label: 'Refund Analysis',
    valueColumnLabel: 'Refunded',
    secondaryColumnLabel: 'Refunds',
  },
  {
    id: 'statements',
    label: 'Statement Processing',
    valueColumnLabel: 'Statements',
    secondaryColumnLabel: 'Txns Extracted',
  },
]

export function SecondaryAnalyticsTabs({
  categorySpend,
  merchantSpend,
  clientSpend,
  creditCardSpend,
  bankAccountRows,
  highestTransactions,
  recurringMerchants,
  largestExpenses,
  refundAnalysis,
  statementProcessingStatus,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: SecondaryAnalyticsTabsProps) {
  const rowsByTab: Record<(typeof TAB_DEFS)[number]['id'], readonly AnalyticsRankedRow[]> = {
    categories: categorySlicesToRows(categorySpend),
    merchants: merchantSpend,
    clients: clientSpend,
    cards: cardSeriesToRows(creditCardSpend),
    accounts: bankAccountRows,
    highest: highestTransactions,
    recurring: recurringMerchants,
    largest: largestExpenses,
    refunds: refundAnalysis,
    statements: statementProcessingStatus,
  }

  return (
    <div className="rounded-xl border border-border bg-card p-lg shadow-sm">
      <h3 className="mb-md text-headline-sm font-semibold text-foreground">Secondary Analytics</h3>
      <Tabs defaultValue="categories">
        <TabsList className="mb-md flex-wrap">
          {TAB_DEFS.map((tab) => (
            <TabsTab key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>
        {TAB_DEFS.map((tab) => (
          <TabsPanel key={tab.id} value={tab.id}>
            <AnalyticsTable
              title={tab.label}
              rows={rowsByTab[tab.id]}
              valueColumnLabel={tab.valueColumnLabel}
              secondaryColumnLabel={tab.secondaryColumnLabel}
              exportFileName={`analytics-${tab.id}.csv`}
              hoveredDimension={hoveredDimension}
              onHover={onHover}
              onCrossFilter={onCrossFilter}
              onDrillDown={onDrillDown}
            />
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  )
}
