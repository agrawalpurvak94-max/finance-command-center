import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { merchantRepository } from '@/services/merchants.service'
import type {
  MerchantCreateInput,
  MerchantListParams,
  MerchantUpdateInput,
} from '@/domain/Merchant'

export function useMerchantsList(params: MerchantListParams) {
  return useQuery({
    queryKey: queryKeys.merchants.list(params),
    queryFn: () => merchantRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useMerchantsSummary() {
  return useQuery({
    queryKey: queryKeys.merchants.summary,
    queryFn: () => merchantRepository.getSummary(),
  })
}

export function useCreateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MerchantCreateInput) => merchantRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.merchants.all })
    },
  })
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MerchantUpdateInput }) =>
      merchantRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.merchants.all })
    },
  })
}

export function useDeleteMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => merchantRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.merchants.all })
    },
  })
}
