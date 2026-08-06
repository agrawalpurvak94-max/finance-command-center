import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { transactionRepository } from '@/services/transactions.service'
import { statementRepository } from '@/services/statements.service'
import type { TransactionFilters } from '@/domain/Transaction'
import type { StatementFilters } from '@/domain/Statement'

/** Imperative fetches for the Analytics Export menu's "Filtered
 * Transactions"/"Filtered Statements" CSV options — these aren't rendered
 * anywhere on the page, so they go through `fetchQuery` (an on-demand pull
 * through the same query cache/keys every list view uses) rather than a
 * `useQuery` that would fetch on every render. */
export function useAnalyticsExports() {
  const queryClient = useQueryClient()

  async function exportFilteredTransactions(filters: TransactionFilters) {
    const params = { page: 1, pageSize: 5000, filters }
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.transactions.list(params),
      queryFn: () => transactionRepository.list(params),
    })
    return result.rows
  }

  async function exportFilteredStatements(filters: StatementFilters) {
    const params = { page: 1, pageSize: 5000, filters }
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.statements.list(params),
      queryFn: () => statementRepository.list(params),
    })
    return result.rows
  }

  return { exportFilteredTransactions, exportFilteredStatements }
}
