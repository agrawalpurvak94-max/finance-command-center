import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { transactionRepository } from '@/services/transactions.service'
import type {
  TransactionCreateInput,
  TransactionListParams,
  TransactionPatch,
} from '@/domain/Transaction'

/**
 * Every mock repository that reads the shared transaction data live
 * (Analytics' charts, Categories'/Merchants' summary counts — see
 * mock-transaction.repository.ts) needs its cache invalidated alongside
 * `transactions` whenever a transaction is created/updated/deleted, or
 * those pages keep showing stale results after an edit even though the
 * underlying data changed.
 */
function invalidateTransactionDependents(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.merchants.all })
}

export function useTransactionsList(params: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useTransactionCategories() {
  return useQuery({
    queryKey: queryKeys.transactions.categories,
    queryFn: () => transactionRepository.listCategories(),
  })
}

export function useTransactionClients() {
  return useQuery({
    queryKey: queryKeys.transactions.clients,
    queryFn: () => transactionRepository.listClients(),
  })
}

export function useTransactionMerchants() {
  return useQuery({
    queryKey: queryKeys.transactions.merchants,
    queryFn: () => transactionRepository.listMerchants(),
  })
}

export function useTransactionAccounts() {
  return useQuery({
    queryKey: queryKeys.transactions.accounts,
    queryFn: () => transactionRepository.listAccounts(),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionPatch }) =>
      transactionRepository.update(id, patch),
    onSuccess: () => {
      invalidateTransactionDependents(queryClient)
    },
  })
}

export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: readonly string[]; patch: TransactionPatch }) =>
      transactionRepository.bulkUpdate(ids, patch),
    onSuccess: () => {
      invalidateTransactionDependents(queryClient)
    },
  })
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => transactionRepository.bulkDelete(ids),
    onSuccess: () => {
      invalidateTransactionDependents(queryClient)
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransactionCreateInput) => transactionRepository.create(input),
    onSuccess: () => {
      invalidateTransactionDependents(queryClient)
    },
  })
}
