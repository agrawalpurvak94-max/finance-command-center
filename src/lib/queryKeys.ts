import type { TransactionListParams } from '@/domain/Transaction'

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
}
