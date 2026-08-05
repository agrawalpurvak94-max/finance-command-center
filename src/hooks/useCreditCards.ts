import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { creditCardRepository } from '@/services/credit-cards.service'
import type {
  CreditCardCreateInput,
  CreditCardListParams,
  CreditCardUpdateInput,
} from '@/domain/CreditCard'

export function useCreditCardsList(params: CreditCardListParams) {
  return useQuery({
    queryKey: queryKeys.creditCards.list(params),
    queryFn: () => creditCardRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreditCardsSummary() {
  return useQuery({
    queryKey: queryKeys.creditCards.summary,
    queryFn: () => creditCardRepository.getSummary(),
  })
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreditCardCreateInput) => creditCardRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditCards.all })
    },
  })
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreditCardUpdateInput }) =>
      creditCardRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditCards.all })
    },
  })
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => creditCardRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditCards.all })
    },
  })
}
