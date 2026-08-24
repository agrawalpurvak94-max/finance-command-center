import { useQuery } from '@tanstack/react-query'
import { accountStatementsService } from '@/services/account-statements.service'

export function useAccountStatementTiles(clientId?: string) {
  return useQuery({
    queryKey: ['account-statements', 'tiles', clientId ?? null],
    queryFn: () => accountStatementsService.getAccountStatementTiles(clientId),
  })
}

export function useAccountStatementsSummary() {
  return useQuery({
    queryKey: ['account-statements', 'summary'],
    queryFn: accountStatementsService.getAccountStatementsSummary,
  })
}
