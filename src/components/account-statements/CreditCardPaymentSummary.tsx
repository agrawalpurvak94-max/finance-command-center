import { useState } from 'react'
import { CalendarClock, ChevronRight, CreditCard as CreditCardIcon } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AmbientGlow } from '@/components/ui/ambient-glow'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { formatStatementDate } from '@/lib/statementDate'
import type { CreditCardPaymentSummary, UpcomingCardPayment } from '@/domain/AccountStatements'

interface CreditCardPaymentSummaryProps {
  summary: CreditCardPaymentSummary
  payments: readonly UpcomingCardPayment[]
  /** Whether any credit card exists at all (independent of `payments`, which only lists cards with something currently due) — drives the "no cards configured" empty state vs. the "nothing outstanding" message. */
  hasCreditCards: boolean
  /** Same `/statements?accountId=...` navigation the account tile grid already uses (see `CreditCards.tsx`'s shared `handleOpenAccountId`) — never a second navigation target. */
  onOpenPayment: (tileId: string) => void
}

const VISIBLE_PAYMENTS_LIMIT = 6

type PaymentGroup = 'Overdue' | 'Due this week' | 'Due next week' | 'Later'

const GROUP_ORDER: readonly PaymentGroup[] = ['Overdue', 'Due this week', 'Due next week', 'Later']

function groupFor(daysRemaining: number): PaymentGroup {
  if (daysRemaining < 0) return 'Overdue'
  if (daysRemaining <= 7) return 'Due this week'
  if (daysRemaining <= 14) return 'Due next week'
  return 'Later'
}

function daysLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d overdue`
  if (daysRemaining === 0) return 'Due today'
  return `${daysRemaining}d left`
}

/** Same raw `--viz-*` custom-property pattern `InsightsPanel` uses — Tailwind v4's `@theme` registration for `--color-viz-*` is unreliable, see that component's comment. */
function urgencyColor(daysRemaining: number): string | null {
  if (daysRemaining < 0) return 'var(--viz-critical)'
  if (daysRemaining <= 7) return 'var(--viz-warning)'
  return null
}

/**
 * Consolidated credit-card payment position for Account Intelligence — a
 * fixed section (not gated behind the "Credit Cards" type filter chip) so
 * "what do I need to pay" is always answerable. `summary`/`payments` are
 * pure derivations over the full, unfiltered tile list (see
 * `getCreditCardPaymentSummary`/`getUpcomingCardPayments` in
 * `account-statements.service.ts`) — no separate query.
 */
export function CreditCardPaymentSummaryWidget({
  summary,
  payments,
  hasCreditCards,
  onOpenPayment,
}: CreditCardPaymentSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!hasCreditCards) {
    return (
      <div className="flex flex-col gap-sm rounded-xl border border-border bg-card p-md">
        <div>
          <p className="text-label-caps uppercase text-muted-foreground">Credit Card Payments</p>
          <p className="text-body-sm text-muted-foreground">
            Upcoming obligations across your credit cards.
          </p>
        </div>
        <EmptyState
          icon={CreditCardIcon}
          title="No credit cards configured"
          description="Add a credit card to start tracking payment due dates and balances."
          action={{ label: 'Add Credit Card', href: '/credentials?add=credit-card' }}
        />
      </div>
    )
  }

  const visible = expanded ? payments : payments.slice(0, VISIBLE_PAYMENTS_LIMIT)
  const hasMore = payments.length > VISIBLE_PAYMENTS_LIMIT

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <AmbientGlow className="top-0 right-0 -translate-y-1/3 translate-x-1/4" />
      <div className="relative flex flex-col gap-sm">
        <div>
          <p className="text-label-caps uppercase text-muted-foreground">Credit Card Payments</p>
          <p className="text-body-sm text-muted-foreground">
            Upcoming obligations across your credit cards.
          </p>
        </div>

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
              summary.nextDueDate
                ? formatStatementDate(summary.nextDueDate)
                : 'No upcoming due date'
            }
            valueClassName="text-headline-lg sm:text-2xl"
            caption={
              summary.cardsWithDue > 1 ? 'Earliest of several due dates — see below' : undefined
            }
          />
        </div>

        <div className="mt-xs flex flex-col gap-sm">
          {payments.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              No outstanding credit card payments.
            </p>
          ) : (
            <>
              <p className="text-label-caps uppercase text-muted-foreground">Upcoming Payments</p>
              {GROUP_ORDER.map((group) => {
                const items = visible.filter((payment) => groupFor(payment.daysRemaining) === group)
                if (items.length === 0) return null
                return (
                  <div key={group} className="flex flex-col gap-xs">
                    <p className="text-body-sm font-medium text-muted-foreground">{group}</p>
                    {items.map((payment) => {
                      const color = urgencyColor(payment.daysRemaining)
                      // Same institution identity the account tile below uses
                      // (see AccountStatementTileCard) — never a second,
                      // payment-specific color system.
                      const identity = getInstitutionIdentity(payment.institutionName)
                      const last4 = payment.maskedNumber.slice(-4)
                      return (
                        <button
                          key={payment.tileId}
                          type="button"
                          onClick={() => onOpenPayment(payment.tileId)}
                          aria-label={`View statements for ${payment.institutionName} ${payment.cardProduct ?? 'card'} ending ${last4}`}
                          style={{ ['--glow-ring-color' as string]: identity.glowColor }}
                          className="group glow-ring-hover flex w-full items-center justify-between gap-sm rounded-md border border-border/60 px-sm py-sm text-left transition-colors hover:bg-accent/60"
                        >
                          <div className="flex min-w-0 items-center gap-sm">
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-8 w-1 shrink-0 rounded-full transition-[filter] duration-200 group-hover:brightness-125',
                                identity.barClassName,
                              )}
                            />
                            <Avatar
                              size="sm"
                              className="shrink-0 transition-[filter] duration-200 group-hover:brightness-110"
                            >
                              <AvatarFallback
                                className={cn('font-semibold', identity.chipClassName)}
                              >
                                {identity.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-body-sm font-medium text-foreground">
                                {payment.institutionName} ·{' '}
                                {payment.cardProduct ?? 'Product not configured'} · •••• {last4}
                              </p>
                              <p className="flex items-center gap-1 text-body-sm text-muted-foreground">
                                <CalendarClock className="size-3 shrink-0" aria-hidden="true" />
                                Due {formatStatementDate(payment.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-sm">
                            <span className="text-body-sm font-semibold text-foreground/90 transition-colors group-hover:text-foreground">
                              {formatINR(payment.amount)}
                            </span>
                            <span
                              className={cn(
                                'whitespace-nowrap rounded-full px-xs py-0.5 text-body-sm',
                                !color && 'bg-muted text-muted-foreground',
                              )}
                              style={
                                color
                                  ? {
                                      color,
                                      backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                                    }
                                  : undefined
                              }
                            >
                              {daysLabel(payment.daysRemaining)}
                            </span>
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Show less' : `Show all ${payments.length} payments`}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
