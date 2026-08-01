import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { dashboardService } from '@/services/dashboard.service'

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
