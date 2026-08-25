import { useNavigate } from 'react-router'
import { Landmark, History } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { IconChip } from '@/components/ui/icon-chip'
import { DrawerSectionHeader } from '@/components/EntityReviewDrawer'
import { TransactionListRows } from '@/components/dashboard/TransactionListRows'
import { formatINR } from '@/utils/currency'
import { useAccountRecentTransactions } from '@/hooks/useDashboard'
import type { ConnectedAccount } from '@/domain/Account'

interface AccountActivityDrawerProps {
  account: ConnectedAccount | null
  onOpenChange: (open: boolean) => void
}

/**
 * Financial Pulse's Savings/Current/Overdraft account drawer — replaces the
 * previous navigate-away-on-click behavior. Spend/Inflow/period reuse the
 * tile's already-computed figures (no refetch); only "Recent Transactions"
 * (no period filter, just the latest 10) is fetched, and only once the
 * drawer is open. Credit cards use the dedicated, richer
 * `CreditCardActivityDrawer` instead — this component is bank-accounts-only.
 */
export function AccountActivityDrawer({ account, onOpenChange }: AccountActivityDrawerProps) {
  const navigate = useNavigate()
  const open = account !== null

  const recentQuery = useAccountRecentTransactions(account?.id, account?.kind, open)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        <SheetHeader>
          <SheetTitle className="sr-only">{account?.name ?? 'Account'}</SheetTitle>
          <SheetDescription className="sr-only">
            Statement-period activity and recent transactions for this account.
          </SheetDescription>
        </SheetHeader>

        {account && (
          <div className="flex flex-col gap-lg px-lg pb-lg">
            <div className="flex items-start gap-sm">
              <IconChip size="md" tone="info">
                <Landmark className="size-4" aria-hidden="true" />
              </IconChip>
              <div className="min-w-0">
                <p className="truncate text-headline-sm text-foreground">{account.name}</p>
                <p className="truncate text-body-sm text-muted-foreground">
                  {account.institutionName ?? '—'} · {account.accountTypeLabel ?? '—'}
                </p>
                <p className="text-table-mono tabular-nums text-muted-foreground">
                  •••• {account.maskedNumber.slice(-4)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <p className="text-label-caps uppercase text-muted-foreground">Spend</p>
                <p className="text-headline-lg tabular-nums text-destructive">
                  {formatINR(account.outflow ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-label-caps uppercase text-muted-foreground">Inflow</p>
                <p className="text-headline-lg tabular-nums text-secondary">
                  {formatINR(account.inflow ?? 0)}
                </p>
              </div>
            </div>
            <p className="-mt-sm text-body-sm text-muted-foreground">
              {account.periodLabel ?? 'No statement period available'}
            </p>

            <Separator />

            <div className="flex flex-col gap-sm">
              <DrawerSectionHeader icon={History}>Recent Transactions</DrawerSectionHeader>
              <TransactionListRows
                transactions={recentQuery.data}
                isLoading={recentQuery.isLoading}
                emptyMessage="No recent transactions"
                showAccount={false}
              />
            </div>

            <div className="flex gap-sm">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  navigate(`/transactions?bankAccountId=${encodeURIComponent(account.id)}`)
                }
              >
                Transactions
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/statements?accountId=${encodeURIComponent(account.id)}`)}
              >
                Statements
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
