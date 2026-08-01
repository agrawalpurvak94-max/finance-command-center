import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { transactionRepository } from '@/services/transactions.service'
import type {
  TransactionCreateInput,
  TransactionListParams,
  TransactionPatch,
} from '@/types/transaction'

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: readonly string[]; patch: TransactionPatch }) =>
      transactionRepository.bulkUpdate(ids, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => transactionRepository.bulkDelete(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransactionCreateInput) => transactionRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}
