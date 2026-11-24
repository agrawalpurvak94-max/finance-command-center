import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { apiKeyRepository } from '@/services/api-keys.service'
import { bankAccountRepository } from '@/services/accounts.service'
import { creditCardRepository } from '@/services/credit-cards.service'
import type { AccountCredentialKind, AccountCredentialRecord } from '@/domain/Credential'

/**
 * Merges `CreditCardRepository.listCredentials()` and
 * `BankAccountRepository.listCredentials()` into one list — the Credentials
 * page's "Credit Cards" / "Bank Accounts" tabs and summary counts are all
 * derived from this single source, per CLAUDE.md's "never duplicate
 * business logic" (no separate query for the counts). Shaped like
 * `UseQueryResult` so it's a drop-in for `QueryBoundary`.
 */
export function useCredentialsList() {
  const [creditCardsQuery, bankAccountsQuery] = useQueries({
    queries: [
      {
        queryKey: [...queryKeys.credentials.all, 'credit-card'] as const,
        queryFn: () => creditCardRepository.listCredentials(),
      },
      {
        queryKey: [...queryKeys.credentials.all, 'bank'] as const,
        queryFn: () => bankAccountRepository.listCredentials(),
      },
    ],
  })

  const data = useMemo<AccountCredentialRecord[] | undefined>(() => {
    if (!creditCardsQuery.data || !bankAccountsQuery.data) return undefined
    return [...creditCardsQuery.data, ...bankAccountsQuery.data]
  }, [creditCardsQuery.data, bankAccountsQuery.data])

  return {
    data,
    isLoading: creditCardsQuery.isLoading || bankAccountsQuery.isLoading,
    isError: creditCardsQuery.isError || bankAccountsQuery.isError,
    refetch: () => {
      void creditCardsQuery.refetch()
      void bankAccountsQuery.refetch()
    },
  }
}

export function useUpdateCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      kind,
      statementPassword,
    }: {
      id: string
      kind: AccountCredentialKind
      statementPassword: string | null
    }) =>
      kind === 'credit_card'
        ? creditCardRepository.updateStatementPassword(id, statementPassword)
        : bankAccountRepository.updateStatementPassword(id, statementPassword),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credentials.all })
    },
  })
}

/** Set/not-set status (name + updated_at only) for each stored API key. */
export function useApiKeyStatuses() {
  return useQuery({
    queryKey: queryKeys.apiKeys.all,
    queryFn: () => apiKeyRepository.listStatuses(),
  })
}

/** Write-only save of one API key; invalidates only the api-keys query. */
export function useSaveApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      apiKeyRepository.saveKey(name, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all })
    },
  })
}
