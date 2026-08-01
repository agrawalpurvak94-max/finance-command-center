import type { UseQueryResult } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { AccountCard } from '@/components/dashboard/AccountCard'
import type { ConnectedAccount } from '@/domain/Account'

interface AccountsWidgetProps {
  title: string
  query: UseQueryResult<ConnectedAccount[]>
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  emptyActionHref: string
  emptyActionLabel: string
  onPayNow?: (accountId: string) => void
}

export function AccountsWidget({
  title,
  query,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
  onPayNow,
}: AccountsWidgetProps) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md flex items-center gap-sm text-headline-sm text-foreground">
        {title}
        <span className="h-px flex-1 bg-border" />
      </h2>
      <QueryBoundary
        query={query}
        skeleton={
          <div className="grid grid-cols-1 gap-md md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={{ label: emptyActionLabel, href: emptyActionHref }}
          />
        }
      >
        {(accounts) => (
          <div className="grid grid-cols-1 gap-md md:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} onPayNow={onPayNow} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}
