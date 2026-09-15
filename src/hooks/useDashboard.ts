import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { dashboardService } from '@/services/dashboard.service'
import type { AccountKind } from '@/domain/Account'

export function useDashboard() {
  const queryClient = useQueryClient()

  const snapshot = useQuery({
    queryKey: queryKeys.dashboard.snapshot,
    queryFn: dashboardService.getFinancialSnapshot,
  })

  const connectedAccounts = useQuery({
    queryKey: queryKeys.dashboard.connectedAccounts,
    queryFn: dashboardService.getConnectedAccounts,
  })

  const creditCards = useQuery({
    queryKey: queryKeys.dashboard.creditCards,
    queryFn: dashboardService.getCreditCards,
  })

  const resolutionQueue = useQuery({
    queryKey: queryKeys.dashboard.resolutionQueue,
    queryFn: dashboardService.getResolutionQueue,
  })

  const recentTransactions = useQuery({
    queryKey: queryKeys.dashboard.recentTransactions,
    queryFn: dashboardService.getRecentTransactions,
  })

  const quickActions = useQuery({
    queryKey: queryKeys.dashboard.quickActions,
    queryFn: dashboardService.getQuickActions,
  })

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return {
    snapshot,
    connectedAccounts,
    creditCards,
    resolutionQueue,
    recentTransactions,
    quickActions,
    refreshAll,
  }
}

/**
 * Drawer-only queries — deliberately NOT part of `useDashboard()` above, so
 * none of these fire on initial Financial Pulse load. `enabled` gates each
 * one to only fetch once its drawer is actually open (React Query keeps the
 * result cached after that, so reopening the same drawer doesn't refetch
 * unnecessarily within the cache window).
 */
export function useSpendTransactions(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'drawer', 'spend'],
    queryFn: dashboardService.getConsolidatedSpendTransactions,
    enabled,
  })
}

export function useInflowTransactions(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'drawer', 'inflow'],
    queryFn: dashboardService.getConsolidatedInflowTransactions,
    enabled,
  })
}

export function useAccountRecentTransactions(
  accountId: string | undefined,
  kind: AccountKind | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['dashboard', 'drawer', 'account', accountId],
    queryFn: () => dashboardService.getAccountRecentTransactions(accountId!, kind!),
    enabled: enabled && !!accountId && !!kind,
  })
}

/** Credit Card drawer's "Last Statement" section — fetched only once that drawer is open. */
export function useLatestStatementForAccount(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'drawer', 'card', 'statement', accountId],
    queryFn: () => dashboardService.getLatestStatementForAccount(accountId!),
    enabled: enabled && !!accountId,
  })
}

/** Credit Card drawer's "Credit Position" section — fetched only once that drawer is open. */
export function useCreditPosition(cardId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'drawer', 'card', 'position', cardId],
    queryFn: () => dashboardService.getCreditPosition(cardId!),
    enabled: enabled && !!cardId,
  })
}

/**
 * Financial Pulse drawer's inline credit-limit edit. Invalidates this
 * card's own position query plus the two other places a credit limit is
 * displayed elsewhere in the app (Financial Pulse's own tile list, and the
 * full Credit Cards/Account Statements module's list) so the edit is
 * reflected everywhere without a manual page refresh.
 */
export function useUpdateCreditLimit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, creditLimit }: { cardId: string; creditLimit: number }) =>
      dashboardService.updateCreditLimit(cardId, creditLimit),
    onSuccess: (_data, { cardId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['dashboard', 'drawer', 'card', 'position', cardId],
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.creditCards })
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditCards.all })
    },
  })
}

/**
 * Financial Pulse drawer's inline Account Holder edit (both
 * `AccountActivityDrawer` and `CreditCardActivityDrawer`), also reused
 * directly by Statement Control's drawer edit — invalidates every other
 * place a holder value is displayed: this account's own dashboard tile list
 * (bank or card, by kind), the full Accounts/Credit Cards module list,
 * Account Intelligence's tiles/summary (a separate, non-centralized query
 * key — see useAccountStatements.ts), and Statements (holder is resolved
 * per-row from `account_id`, not a `statements` column — see
 * `SupabaseStatementRepository`'s doc comment).
 */
export function useUpdateAccountHolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountId,
      kind,
      accountHolder,
    }: {
      accountId: string
      kind: AccountKind
      accountHolder: string | null
    }) => dashboardService.updateAccountHolder(accountId, kind, accountHolder),
    onSuccess: (_data, { kind }) => {
      void queryClient.invalidateQueries({
        queryKey:
          kind === 'credit_card'
            ? queryKeys.dashboard.creditCards
            : queryKeys.dashboard.connectedAccounts,
      })
      void queryClient.invalidateQueries({
        queryKey: kind === 'credit_card' ? queryKeys.creditCards.all : queryKeys.accounts.all,
      })
      void queryClient.invalidateQueries({ queryKey: ['account-statements'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all })
    },
  })
}
