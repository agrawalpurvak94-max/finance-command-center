import { Landmark, CreditCard } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { useDashboard } from '@/hooks/useDashboard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { FinancialSnapshotWidget } from '@/components/dashboard/FinancialSnapshotWidget'
import { AccountsWidget } from '@/components/dashboard/AccountsWidget'
import { ResolutionQueueWidget } from '@/components/dashboard/ResolutionQueueWidget'
import { RecentTransactionsWidget } from '@/components/dashboard/RecentTransactionsWidget'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { StatementWidget } from '@/components/dashboard/StatementWidget'

export function Dashboard() {
  const dashboard = useDashboard()
  const isRefreshing =
    dashboard.snapshot.isFetching ||
    dashboard.connectedAccounts.isFetching ||
    dashboard.creditCards.isFetching ||
    dashboard.resolutionQueue.isFetching ||
    dashboard.recentTransactions.isFetching

  return (
    <PageContainer>
      <DashboardHeader onRefresh={dashboard.refreshAll} isRefreshing={isRefreshing} />

      <FinancialSnapshotWidget query={dashboard.snapshot} />

      <AccountsWidget
        title="Connected Accounts"
        query={dashboard.connectedAccounts}
        emptyIcon={Landmark}
        emptyTitle="No accounts connected"
        emptyDescription="Link a bank account to start tracking balances and cash flow."
        emptyActionHref="/accounts"
        emptyActionLabel="Go to Financial Accounts"
      />

      <AccountsWidget
        title="Credit Cards"
        query={dashboard.creditCards}
        emptyIcon={CreditCard}
        emptyTitle="No credit cards connected"
        emptyDescription="Linked cards and their due dates will appear here."
        emptyActionHref="/credit-cards"
        emptyActionLabel="Go to Credit Cards"
      />

      <div className="mb-xl grid grid-cols-1 gap-xl lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ResolutionQueueWidget query={dashboard.resolutionQueue} />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactionsWidget query={dashboard.recentTransactions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-xl lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatementWidget />
        </div>
        <div className="lg:col-span-1">
          <QuickActionsWidget query={dashboard.quickActions} />
        </div>
      </div>
    </PageContainer>
  )
}

export default Dashboard
