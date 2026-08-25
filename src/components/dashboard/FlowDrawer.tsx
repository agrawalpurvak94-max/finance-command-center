import { useNavigate } from 'react-router'
import { ArrowUpRight, ArrowDownLeft, History } from 'lucide-react'
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
import { useSpendTransactions, useInflowTransactions } from '@/hooks/useDashboard'

interface FlowDrawerProps {
  kind: 'spend' | 'inflow' | null
  totalValue: number
  onOpenChange: (open: boolean) => void
}

/**
 * The Spend and Inflow tiles' right-side drawer — Financial Pulse stays
 * mounted underneath, no navigation happens on open. `totalValue` is the
 * already-computed snapshot figure (no refetch for the summary); only the
 * latest-10 list is fetched, and only once this drawer is actually open
 * (see `useSpendTransactions`/`useInflowTransactions`'s `enabled` gate).
 */
export function FlowDrawer({ kind, totalValue, onOpenChange }: FlowDrawerProps) {
  const navigate = useNavigate()
  const open = kind !== null

  const spendQuery = useSpendTransactions(kind === 'spend')
  const inflowQuery = useInflowTransactions(kind === 'inflow')
  const query = kind === 'spend' ? spendQuery : inflowQuery

  const title = kind === 'spend' ? 'Recent Spend' : 'Recent Inflow'
  const summaryLabel = kind === 'spend' ? 'Spend Summary' : 'Inflow Summary'
  const listLabel =
    kind === 'spend' ? 'Latest 10 Spend Transactions' : 'Latest 10 Inflow Transactions'
  const emptyMessage =
    kind === 'spend' ? 'No spend transactions yet.' : 'No inflow transactions yet.'
  const viewAllHref = kind === 'spend' ? '/transactions?type=debit' : '/transactions?type=credit'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-112 matches this app's other drawers (StatementDetailsDrawer etc.) — see that file's note on why not Tailwind's named max-w-md. */}
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">
            {kind === 'spend'
              ? 'Consolidated spend summary and latest transactions across all connected accounts and credit cards.'
              : 'Consolidated inflow summary and latest transactions across Savings, Current, and Overdraft accounts.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-lg px-lg pb-lg">
          <div className="flex items-center gap-sm">
            <IconChip size="md" tone={kind === 'spend' ? 'danger' : 'info'}>
              {kind === 'spend' ? (
                <ArrowUpRight className="size-4" aria-hidden="true" />
              ) : (
                <ArrowDownLeft className="size-4" aria-hidden="true" />
              )}
            </IconChip>
            <div>
              <p className="text-label-caps text-muted-foreground uppercase">{summaryLabel}</p>
              <p className="text-display-kpi tabular-nums text-foreground">
                {formatINR(totalValue)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-sm">
            <DrawerSectionHeader icon={History}>{listLabel}</DrawerSectionHeader>
            <TransactionListRows
              transactions={query.data}
              isLoading={query.isLoading}
              emptyMessage={emptyMessage}
            />
          </div>

          <Button variant="outline" onClick={() => navigate(viewAllHref)}>
            View All Transactions
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
