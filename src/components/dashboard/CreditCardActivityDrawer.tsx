import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CreditCard as CreditCardIcon,
  Pencil,
  Check,
  X,
  Wallet,
  FileText,
  History,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { IconChip } from '@/components/ui/icon-chip'
import { DrawerSectionHeader } from '@/components/EntityReviewDrawer'
import { TransactionListRows } from '@/components/dashboard/TransactionListRows'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import {
  useAccountRecentTransactions,
  useCreditPosition,
  useLatestStatementForAccount,
  useUpdateCreditLimit,
} from '@/hooks/useDashboard'
import type { ConnectedAccount } from '@/domain/Account'

interface CreditCardActivityDrawerProps {
  account: ConnectedAccount | null
  onOpenChange: (open: boolean) => void
}

function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : formatINR(value)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function utilizationBarClassName(utilizationPercent: number): string {
  if (utilizationPercent >= 80) return 'bg-destructive'
  if (utilizationPercent >= 50) return 'bg-amber-400'
  return 'bg-secondary'
}

interface EditableCreditLimitProps {
  cardId: string
  creditLimit: number | null | undefined
  isLoading: boolean
}

/**
 * Issuers raise/lower a card's credit limit independently of anything this
 * app can observe, so the user records the current limit manually. Uses
 * `updateCreditLimit` (a narrow write — see its doc comment in
 * `credit-card.repository.ts`) rather than the full Credit Cards module's
 * `update()`, which requires nickname/status/notes this drawer never loads.
 */
function EditableCreditLimit({ cardId, creditLimit, isLoading }: EditableCreditLimitProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const updateCreditLimit = useUpdateCreditLimit()

  const error =
    editing && (!value.trim() || Number(value) <= 0) ? 'Enter a credit limit greater than 0.' : null

  function startEdit() {
    setValue(creditLimit != null ? String(creditLimit) : '')
    updateCreditLimit.reset()
    setEditing(true)
  }

  function handleSave() {
    if (error) return
    updateCreditLimit.mutate(
      { cardId, creditLimit: Number(value) },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (isLoading) {
    return (
      <div>
        <p className="text-label-caps uppercase text-muted-foreground">Credit Limit</p>
        <Skeleton className="mt-xs h-7 w-24" />
      </div>
    )
  }

  if (!editing) {
    return (
      <div>
        <p className="text-label-caps uppercase text-muted-foreground">Credit Limit</p>
        <div className="flex items-center gap-xs">
          <p className="text-headline-lg tabular-nums text-foreground">
            {formatMoney(creditLimit)}
          </p>
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit credit limit"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-label-caps uppercase text-muted-foreground">Credit Limit</p>
      <div className="flex items-center gap-xs">
        <Input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 100000"
          aria-label="Credit limit"
          aria-invalid={!!error}
          className={cn('h-8 w-28', error && 'border-destructive')}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!!error || updateCreditLimit.isPending}
          aria-label="Save credit limit"
          className="text-secondary transition-colors hover:text-secondary/80 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel editing credit limit"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-xs text-[11px] text-destructive">
          {error}
        </p>
      )}
      {updateCreditLimit.isError && (
        <p role="alert" className="mt-xs text-[11px] text-destructive">
          Failed to save the credit limit. Try again.
        </p>
      )}
    </div>
  )
}

/**
 * Financial Pulse's dedicated Credit Card drawer — deliberately separate
 * from `AccountActivityDrawer` (which stays Savings/Current/Overdraft-only)
 * because a card's financial context (limit, utilization, last statement,
 * spend-since-statement) has no bank-account equivalent. Credit Limit and
 * Card Network are genuinely-nullable reads straight off `accounts` (see
 * `getCreditPosition`'s doc comment in dashboard.service.ts for why this
 * doesn't reuse `creditCardRepository.list()`'s tile-view fallback) and
 * render "—" rather than a fabricated 0/VISA. Available Credit and
 * Utilization are DERIVED as Credit Limit − Spend Since Statement (not the
 * raw `available_credit`/`current_balance` columns, unpopulated on every
 * live card today) — only computable once Credit Limit is known.
 *
 * No Payment section: neither `accounts` nor `statements` has a persisted
 * amount-paid/payment-status/payment-date field today, so one isn't built
 * here — inventing a field or a client-only tracking mechanism would be a
 * silent schema decision. See the module report for this callout.
 */
export function CreditCardActivityDrawer({ account, onOpenChange }: CreditCardActivityDrawerProps) {
  const navigate = useNavigate()
  const open = account !== null

  const positionQuery = useCreditPosition(account?.id, open)
  const statementQuery = useLatestStatementForAccount(account?.id, open)
  const recentQuery = useAccountRecentTransactions(account?.id, 'credit_card', open)

  const position = positionQuery.data
  const statement = statementQuery.data
  // For credit cards, the repository already fills statementDate from
  // statementPeriodEnd (or vice versa) when the parser only captured one of
  // the two — see `mapRow`'s doc comment in supabase-statement.repository.ts.
  // An empty string here means both were genuinely missing.
  const statementDisplayDate = statement?.statementDate || null

  // Available Credit / Utilization: explicitly Credit Limit vs. Spend Since
  // Statement (`account.outflow`, already computed from `transactions` by
  // `buildCreditCardCards`), not the raw `accounts.available_credit`/
  // `current_balance` columns — those are unpopulated on every live card
  // today. This assumes the last statement was paid off, so "spend since
  // statement" is the entire current balance; per explicit instruction.
  const spendSinceStatement = account?.outflow ?? 0
  const availableCredit =
    position?.creditLimit != null ? Math.max(0, position.creditLimit - spendSinceStatement) : null
  const utilizationPercent =
    position?.creditLimit != null && position.creditLimit > 0
      ? Math.round((spendSinceStatement / position.creditLimit) * 100)
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        <SheetHeader>
          <SheetTitle className="sr-only">{account?.name ?? 'Credit Card'}</SheetTitle>
          <SheetDescription className="sr-only">
            Credit position, last statement, and real-time activity for this credit card.
          </SheetDescription>
        </SheetHeader>

        {account && (
          <div className="flex flex-col gap-lg px-lg pb-lg">
            {/* Card Identity */}
            <div className="flex items-start gap-sm">
              <IconChip size="md" tone="attention">
                <CreditCardIcon className="size-4" aria-hidden="true" />
              </IconChip>
              <div className="min-w-0">
                <p className="truncate text-headline-sm text-foreground">{account.name}</p>
                <p className="truncate text-body-sm text-muted-foreground">
                  {account.institutionName ?? '—'} · {account.accountTypeLabel ?? 'Credit Card'}
                </p>
                <p className="text-table-mono tabular-nums text-muted-foreground">
                  {positionQuery.isLoading ? 'Loading network…' : (position?.cardNetwork ?? '—')}{' '}
                  •••• {account.maskedNumber.slice(-4)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Credit Position */}
            <div className="flex flex-col gap-sm">
              <DrawerSectionHeader icon={Wallet}>Credit Position</DrawerSectionHeader>
              {positionQuery.isLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-sm">
                    <EditableCreditLimit
                      cardId={account.id}
                      creditLimit={position?.creditLimit}
                      isLoading={positionQuery.isLoading}
                    />
                    <div>
                      <p className="text-label-caps uppercase text-muted-foreground">
                        Available Credit
                      </p>
                      <p className="text-headline-lg tabular-nums text-foreground">
                        {formatMoney(availableCredit)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-sm">
                      <p className="text-label-caps uppercase text-muted-foreground">Utilization</p>
                      <p className="text-body-sm text-muted-foreground">
                        {utilizationPercent === null
                          ? 'Not available'
                          : `${utilizationPercent}% used`}
                      </p>
                    </div>
                    {utilizationPercent !== null && (
                      <div className="mt-xs h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            utilizationBarClassName(utilizationPercent),
                          )}
                          style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-label-caps uppercase text-muted-foreground">
                      Spend Since Statement
                    </p>
                    <p className="text-headline-lg tabular-nums text-destructive">
                      {formatINR(account.outflow ?? 0)}
                    </p>
                    <p className="text-body-sm text-muted-foreground">
                      {account.periodLabel ?? 'No statement period available'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Last Statement */}
            <div className="flex flex-col gap-sm">
              <DrawerSectionHeader icon={FileText}>Last Statement</DrawerSectionHeader>
              {statementQuery.isLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : !statement ? (
                <p className="text-body-sm text-muted-foreground">
                  No statement on file for this card yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-sm rounded-lg bg-muted/40 p-sm text-table-mono">
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Statement Period</p>
                    <p className="truncate font-semibold text-foreground">
                      {statement.statementPeriodLabel}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Statement Date</p>
                    <p className="truncate font-semibold text-foreground">
                      {formatDate(statementDisplayDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Total Amount Due</p>
                    <p className="truncate font-semibold text-foreground">
                      {formatMoney(statement.statementTotalAmountDue)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Minimum Amount Due</p>
                    <p className="truncate font-semibold text-foreground">
                      {formatMoney(statement.minimumDue)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="truncate font-semibold text-foreground">
                      {formatDate(statement.dueDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Statement Transactions</p>
                    <p className="truncate font-semibold text-foreground">
                      {statement.transactionsExtracted}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Real-Time Activity */}
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
                  navigate(`/transactions?creditCardId=${encodeURIComponent(account.id)}`)
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
