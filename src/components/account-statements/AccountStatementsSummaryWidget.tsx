import type { UseQueryResult } from '@tanstack/react-query'
import { CreditCard as CreditCardIcon, FileStack, Landmark, Layers } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { AccountStatementsSummary, CreditCardPaymentSummary } from '@/domain/AccountStatements'
import type { BankAccountSummary } from '@/domain/Account'
import type { CreditCardSummary } from '@/domain/CreditCard'

interface AccountStatementsSummaryWidgetProps {
  query: UseQueryResult<AccountStatementsSummary>
  bankSummaryQuery: UseQueryResult<BankAccountSummary>
  creditCardSummaryQuery: UseQueryResult<CreditCardSummary>
  /** Already-computed over the full (not just visibly-filtered) tile list — see `getCreditCardPaymentSummary`. */
  paymentSummary: CreditCardPaymentSummary
  /** True when the "Credit Cards" type filter chip is active — narrows this snapshot to card-specific balance-sheet metrics instead of the whole-portfolio view. */
  isCreditCardFocused: boolean
}

interface CombinedSummary {
  accounts: AccountStatementsSummary
  bank: BankAccountSummary
  cards: CreditCardSummary
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

const VALUE_CLASS = 'text-headline-sm sm:text-headline-lg'

/**
 * Compact Portfolio Snapshot — deliberately smaller/lighter than a normal
 * KPI row (see `VALUE_CLASS`) so it supports the Insights section above it
 * rather than competing with it for attention. Adapts to whichever type
 * filter chip is active: the whole-portfolio view by default, or a
 * card-specific balance-sheet view once "Credit Cards" is selected (see
 * `isCreditCardFocused`) — every figure still comes straight from the
 * existing `accountStatementsService`/`bankAccountRepository`/
 * `creditCardRepository` summaries, nothing computed here.
 */
export function AccountStatementsSummaryWidget({
  query,
  bankSummaryQuery,
  creditCardSummaryQuery,
  paymentSummary,
  isCreditCardFocused,
}: AccountStatementsSummaryWidgetProps) {
  const combined = {
    isLoading: query.isLoading || bankSummaryQuery.isLoading || creditCardSummaryQuery.isLoading,
    isError: query.isError || bankSummaryQuery.isError || creditCardSummaryQuery.isError,
    data:
      query.data && bankSummaryQuery.data && creditCardSummaryQuery.data
        ? ({
            accounts: query.data,
            bank: bankSummaryQuery.data,
            cards: creditCardSummaryQuery.data,
          } satisfies CombinedSummary)
        : undefined,
    refetch: () => {
      void query.refetch()
      void bankSummaryQuery.refetch()
      void creditCardSummaryQuery.refetch()
    },
  }

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-label-caps uppercase text-muted-foreground">Portfolio Snapshot</p>
      <QueryBoundary
        query={combined}
        skeleton={
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        }
        isEmpty={(data) => data.accounts.totalAccounts === 0}
        empty={
          <EmptyState
            icon={FileStack}
            title="No accounts linked yet"
            description="Link a credit card or bank account to start seeing statement analysis here."
          />
        }
      >
        {({ accounts, bank, cards }) => (
          <div
            className={cn(
              'grid grid-cols-1 gap-md sm:grid-cols-2',
              isCreditCardFocused ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
            )}
          >
            {isCreditCardFocused ? (
              <>
                <KPICard
                  metric={{
                    id: 'totalCreditCards',
                    label: 'Total Credit Cards',
                    value: cards.totalCreditCards,
                  }}
                  formatValue={formatCount}
                  valueClassName={VALUE_CLASS}
                  elevated
                  glowColor="#60a5fa"
                />
                <KPICard
                  metric={{
                    id: 'totalCreditLimit',
                    label: 'Total Credit Limit',
                    value: cards.totalCreditLimit,
                  }}
                  formatValue={formatINR}
                  valueClassName={VALUE_CLASS}
                  elevated
                  glowColor="#4ade80"
                />
                <KPICard
                  metric={{
                    id: 'totalOutstanding',
                    label: 'Total Outstanding',
                    value: cards.totalOutstanding,
                  }}
                  formatValue={formatINR}
                  valueClassName={VALUE_CLASS}
                  elevated
                  glowColor="var(--destructive)"
                />
                <KPICard
                  metric={{
                    id: 'totalAvailableCredit',
                    label: 'Available Credit',
                    value: cards.totalAvailableCredit,
                  }}
                  formatValue={formatINR}
                  valueClassName={VALUE_CLASS}
                  elevated
                  glowColor="#4ade80"
                />
              </>
            ) : (
              <>
                <KPICard
                  metric={{
                    id: 'totalAccounts',
                    label: 'Total Accounts',
                    value: accounts.totalAccounts,
                  }}
                  formatValue={formatCount}
                  valueClassName={VALUE_CLASS}
                  icon={Layers}
                  iconClassName="bg-blue-500/10 text-blue-400"
                  elevated
                  glowColor="#60a5fa"
                />
                <KPICard
                  metric={{
                    id: 'availableBalance',
                    label: 'Available Balance',
                    value: bank.totalAvailableBalance,
                  }}
                  formatValue={formatINR}
                  valueClassName={VALUE_CLASS}
                  caption="Savings, Current & Overdraft only"
                  icon={Landmark}
                  iconClassName="bg-green-500/10 text-green-400"
                  elevated
                  glowColor="#4ade80"
                />
                <KPICard
                  metric={{
                    id: 'outstandingCardDue',
                    label: 'Outstanding Card Due',
                    value: paymentSummary.totalAmountDue,
                  }}
                  formatValue={formatINR}
                  valueClassName={VALUE_CLASS}
                  icon={CreditCardIcon}
                  iconClassName="bg-destructive/10 text-destructive"
                  elevated
                  glowColor="var(--destructive)"
                />
              </>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
