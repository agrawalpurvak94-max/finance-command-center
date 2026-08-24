import { useState } from 'react'
import { Landmark, CreditCard } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { useDashboard } from '@/hooks/useDashboard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { FinancialSnapshotWidget } from '@/components/dashboard/FinancialSnapshotWidget'
import { AccountsWidget } from '@/components/dashboard/AccountsWidget'
import { ResolutionQueueWidget } from '@/components/dashboard/ResolutionQueueWidget'
import { RecentTransactionsWidget } from '@/components/dashboard/RecentTransactionsWidget'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { FlowDrawer } from '@/components/dashboard/FlowDrawer'
import { AccountActivityDrawer } from '@/components/dashboard/AccountActivityDrawer'
import { CreditCardActivityDrawer } from '@/components/dashboard/CreditCardActivityDrawer'
import type { ConnectedAccount } from '@/domain/Account'

export function Dashboard() {
  const dashboard = useDashboard()
  const [flowDrawer, setFlowDrawer] = useState<'spend' | 'inflow' | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null)

  const isRefreshing =
    dashboard.snapshot.isFetching ||
    dashboard.connectedAccounts.isFetching ||
    dashboard.creditCards.isFetching ||
    dashboard.resolutionQueue.isFetching ||
    dashboard.recentTransactions.isFetching

  const flowValue =
    flowDrawer === null
      ? 0
      : (dashboard.snapshot.data?.find((m) => m.id === flowDrawer)?.value ?? 0)

  return (
    <PageContainer>
      <DashboardHeader onRefresh={dashboard.refreshAll} isRefreshing={isRefreshing} />

      <FinancialSnapshotWidget query={dashboard.snapshot} onOpenFlowDrawer={setFlowDrawer} />

      <AccountsWidget
        title="Connected Accounts"
        query={dashboard.connectedAccounts}
        emptyIcon={Landmark}
        emptyTitle="No accounts connected"
        emptyDescription="Link a bank account to start tracking balances and cash flow."
        emptyActionHref="/credit-cards"
        emptyActionLabel="Go to Account Statements"
        onOpenAccount={setSelectedAccount}
      />

      <AccountsWidget
        title="Credit Cards"
        query={dashboard.creditCards}
        emptyIcon={CreditCard}
        emptyTitle="No credit cards connected"
        emptyDescription="Linked cards and their current-cycle activity will appear here."
        emptyActionHref="/credit-cards"
        emptyActionLabel="Go to Credit Cards"
        onOpenAccount={setSelectedAccount}
      />

      <div className="mb-xl grid grid-cols-1 gap-xl lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ResolutionQueueWidget query={dashboard.resolutionQueue} />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactionsWidget query={dashboard.recentTransactions} />
        </div>
      </div>

      <QuickActionsWidget query={dashboard.quickActions} />

      <FlowDrawer
        kind={flowDrawer}
        totalValue={flowValue}
        onOpenChange={(open) => !open && setFlowDrawer(null)}
      />
      <AccountActivityDrawer
        account={selectedAccount?.kind === 'bank' ? selectedAccount : null}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
      />
      <CreditCardActivityDrawer
        account={selectedAccount?.kind === 'credit_card' ? selectedAccount : null}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
      />
    </PageContainer>
  )
}

export default Dashboard
