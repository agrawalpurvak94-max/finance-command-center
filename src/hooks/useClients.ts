import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { clientRepository } from '@/services/clients.service'
import type { ClientCreateInput, ClientListParams, ClientUpdateInput } from '@/domain/Client'

export function useClientsList(params: ClientListParams) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => clientRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useClientsSummary() {
  return useQuery({
    queryKey: queryKeys.clients.summary,
    queryFn: () => clientRepository.getSummary(),
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientCreateInput) => clientRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientUpdateInput }) =>
      clientRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}
