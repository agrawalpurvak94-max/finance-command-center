import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { categoryRepository } from '@/services/categories.service'
import type {
  CategoryCreateInput,
  CategoryListParams,
  CategoryUpdateInput,
} from '@/domain/Category'

export function useCategoriesList(params: CategoryListParams) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => categoryRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCategoriesSummary() {
  return useQuery({
    queryKey: queryKeys.categories.summary,
    queryFn: () => categoryRepository.getSummary(),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryCreateInput) => categoryRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      categoryRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoryRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}
