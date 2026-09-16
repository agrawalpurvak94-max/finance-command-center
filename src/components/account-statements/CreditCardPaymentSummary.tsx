import { CalendarClock } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatINR } from '@/utils/currency'
import { formatStatementDate } from '@/lib/statementDate'
import type { CreditCardDueDateInsight, CreditCardPaymentSummary } from '@/domain/AccountStatements'

interface CreditCardPaymentSummaryProps {
  summary: CreditCardPaymentSummary
  insights: readonly CreditCardDueDateInsight[]
}

/**
 * Consolidated credit-card payment position, shown above the tile grid when
 * the "Credit Cards" type filter is active. `summary`/`insights` are pure
 * derivations over the already-fetched, already-filtered tile list (see
 * `getCreditCardPaymentSummary`/`getCreditCardDueDateInsights` in
 * `account-statements.service.ts`) — no separate query, so this always
 * matches the cards visible below it and can never double-count a card's
 * multiple statements.
 */
export function CreditCardPaymentSummaryWidget({
  summary,
  insights,
}: CreditCardPaymentSummaryProps) {
  return (
    <div className="flex flex-col gap-sm rounded-xl border border-border bg-card p-md">
      <p className="text-label-caps uppercase text-muted-foreground">Credit Card Payments</p>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <KPICard
          metric={{
            id: 'total-amount-due',
            label: 'Total Amount Due',
            value: summary.totalAmountDue,
          }}
          formatValue={formatINR}
          valueClassName="text-headline-lg sm:text-2xl"
        />
        <KPICard
          metric={{
            id: 'minimum-amount-due',
            label: 'Minimum Amount Due',
            value: summary.minimumAmountDue,
          }}
          formatValue={formatINR}
          valueClassName="text-headline-lg sm:text-2xl"
        />
        <KPICard
          metric={{ id: 'next-due-date', label: 'Next Due Date', value: 0 }}
          formatValue={() =>
            summary.nextDueDate ? formatStatementDate(summary.nextDueDate) : 'No upcoming due date'
          }
          valueClassName="text-headline-lg sm:text-2xl"
          caption={
            summary.cardsWithDue > 1 ? 'Earliest of several due dates — see below' : undefined
          }
        />
      </div>

      <div className="mt-xs flex flex-col gap-xs">
        {insights.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No outstanding credit card payments.</p>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.dueDate}
              className="flex items-center gap-xs text-body-sm text-foreground"
            >
              <CalendarClock
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{insight.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
