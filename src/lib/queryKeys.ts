import type { TransactionListParams } from '@/domain/Transaction'
import type { StatementListParams } from '@/domain/Statement'
import type { CategoryListParams } from '@/domain/Category'
import type { MerchantListParams } from '@/domain/Merchant'
import type { BankAccountListParams } from '@/domain/Account'
import type { CreditCardListParams } from '@/domain/CreditCard'
import type { ClientListParams } from '@/domain/Client'
import type { AnalyticsFilters, AnalyticsGranularity } from '@/domain/Analytics'

export const queryKeys = {
  dashboard: {
    snapshot: ['dashboard', 'snapshot'] as const,
    connectedAccounts: ['dashboard', 'connected-accounts'] as const,
    creditCards: ['dashboard', 'credit-cards'] as const,
    resolutionQueue: ['dashboard', 'resolution-queue'] as const,
    recentTransactions: ['dashboard', 'recent-transactions'] as const,
    quickActions: ['dashboard', 'quick-actions'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (params: TransactionListParams) => ['transactions', 'list', params] as const,
    categories: ['transactions', 'categories'] as const,
    clients: ['transactions', 'clients'] as const,
    merchants: ['transactions', 'merchants'] as const,
    accounts: ['transactions', 'accounts'] as const,
  },
  statements: {
    all: ['statements'] as const,
    list: (params: StatementListParams) => ['statements', 'list', params] as const,
    summary: ['statements', 'summary'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (params: CategoryListParams) => ['categories', 'list', params] as const,
    summary: ['categories', 'summary'] as const,
  },
  merchants: {
    all: ['merchants'] as const,
    list: (params: MerchantListParams) => ['merchants', 'list', params] as const,
    summary: ['merchants', 'summary'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (params: BankAccountListParams) => ['accounts', 'list', params] as const,
    summary: ['accounts', 'summary'] as const,
  },
  creditCards: {
    all: ['credit-cards'] as const,
    list: (params: CreditCardListParams) => ['credit-cards', 'list', params] as const,
    summary: ['credit-cards', 'summary'] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (params: ClientListParams) => ['clients', 'list', params] as const,
    summary: ['clients', 'summary'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (filters: AnalyticsFilters) => ['analytics', 'summary', filters] as const,
    spendTrend: (filters: AnalyticsFilters, granularity: AnalyticsGranularity) =>
      ['analytics', 'spend-trend', filters, granularity] as const,
    ownerTypeSpend: (filters: AnalyticsFilters) =>
      ['analytics', 'owner-type-spend', filters] as const,
    categorySpend: (filters: AnalyticsFilters) => ['analytics', 'category-spend', filters] as const,
    merchantSpend: (filters: AnalyticsFilters) => ['analytics', 'merchant-spend', filters] as const,
    clientSpend: (filters: AnalyticsFilters) => ['analytics', 'client-spend', filters] as const,
    creditCardSpend: (filters: AnalyticsFilters) =>
      ['analytics', 'credit-card-spend', filters] as const,
    bankAccountActivity: (filters: AnalyticsFilters) =>
      ['analytics', 'bank-account-activity', filters] as const,
    highestTransactions: (filters: AnalyticsFilters) =>
      ['analytics', 'highest-transactions', filters] as const,
    recurringMerchants: (filters: AnalyticsFilters) =>
      ['analytics', 'recurring-merchants', filters] as const,
    largestExpenses: (filters: AnalyticsFilters) =>
      ['analytics', 'largest-expenses', filters] as const,
    refundAnalysis: (filters: AnalyticsFilters) =>
      ['analytics', 'refund-analysis', filters] as const,
    insights: (filters: AnalyticsFilters) => ['analytics', 'insights', filters] as const,
    bankNames: ['analytics', 'bank-names'] as const,
  },
}
