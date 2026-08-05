import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { bankAccountRepository } from '@/services/accounts.service'
import type {
  BankAccountCreateInput,
  BankAccountListParams,
  BankAccountUpdateInput,
} from '@/domain/Account'

export function useBankAccountsList(params: BankAccountListParams) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: () => bankAccountRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useBankAccountsSummary() {
  return useQuery({
    queryKey: queryKeys.accounts.summary,
    queryFn: () => bankAccountRepository.getSummary(),
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BankAccountCreateInput) => bankAccountRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BankAccountUpdateInput }) =>
      bankAccountRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bankAccountRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useSyncAllBankAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => bankAccountRepository.syncAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}
