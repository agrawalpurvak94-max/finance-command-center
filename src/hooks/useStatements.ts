import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { statementRepository } from '@/services/statements.service'
import type {
  StatementCreateInput,
  StatementListParams,
  StatementUpdateInput,
} from '@/domain/Statement'

export function useStatementsList(params: StatementListParams) {
  return useQuery({
    queryKey: queryKeys.statements.list(params),
    queryFn: () => statementRepository.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useStatementsSummary() {
  return useQuery({
    queryKey: queryKeys.statements.summary,
    queryFn: () => statementRepository.getSummary(),
  })
}

export function useCreateStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StatementCreateInput) => statementRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}

/** Statement Control drawer's metadata edit (Statement Date / Statement Period). */
export function useUpdateStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StatementUpdateInput }) =>
      statementRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}

export function useReprocessStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => statementRepository.reprocess(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}

export function useDeleteStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => statementRepository.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}
