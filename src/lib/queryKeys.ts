import type { TransactionListParams } from '@/domain/Transaction'
import type { StatementListParams } from '@/domain/Statement'
import type { CategoryListParams } from '@/domain/Category'
import type { MerchantListParams } from '@/domain/Merchant'

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
}
