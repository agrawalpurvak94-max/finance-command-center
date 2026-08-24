import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { statementExplorerService } from '@/services/statement-explorer.service'
import type { OwnerType } from '@/domain/Transaction'

const ALL_TRANSACTIONS_KEY = ['statement-explorer', 'all-transactions'] as const

export function useStatementExplorerDetail(statementId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.statementExplorer.detail(statementId ?? ''),
    queryFn: () => statementExplorerService.getStatementExplorerDetail(statementId!),
    enabled: !!statementId,
  })
}

export function useStatementTransactions(statementId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.statementExplorer.transactions(statementId ?? ''),
    queryFn: () => statementExplorerService.getStatementTransactions(statementId!),
    enabled: !!statementId,
  })
}

/** Backs Statement Explorer's "All Statements" mode (`/statements/explorer`) — every statement_transactions row, no `:statementId` scope. */
export function useAllStatementTransactions() {
  return useQuery({
    queryKey: ALL_TRANSACTIONS_KEY,
    queryFn: () => statementExplorerService.getAllStatementTransactions(),
  })
}

export function useStatementSelectorOptions() {
  return useQuery({
    queryKey: queryKeys.statementExplorer.selectorOptions,
    queryFn: statementExplorerService.getStatementSelectorOptions,
  })
}

/**
 * Invalidates both the single-statement list (when a statementId is known)
 * and the "All Statements" list — an edit made from either mode must be
 * reflected in the other.
 */
function invalidateStatementTransactionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  statementId: string | undefined,
) {
  if (statementId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.statementExplorer.transactions(statementId),
    })
  }
  void queryClient.invalidateQueries({ queryKey: ALL_TRANSACTIONS_KEY })
}

/** Statement Explorer table's inline category edit. */
export function useUpdateStatementTransactionCategory(statementId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      statementExplorerService.updateStatementTransactionCategory(id, category),
    onSuccess: () => invalidateStatementTransactionQueries(queryClient, statementId),
  })
}

/** Statement Explorer table's inline client edit. Requires DATABASE_MIGRATIONS.sql Phase 15. */
export function useUpdateStatementTransactionClient(statementId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string | null }) =>
      statementExplorerService.updateStatementTransactionClient(id, clientId),
    onSuccess: () => invalidateStatementTransactionQueries(queryClient, statementId),
  })
}

/** Statement Explorer table's Business/Personal toggle. Requires DATABASE_MIGRATIONS.sql Phase 16. */
export function useUpdateStatementTransactionOwnerType(statementId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ownerType }: { id: string; ownerType: OwnerType }) =>
      statementExplorerService.updateStatementTransactionOwnerType(id, ownerType),
    onSuccess: () => invalidateStatementTransactionQueries(queryClient, statementId),
  })
}
