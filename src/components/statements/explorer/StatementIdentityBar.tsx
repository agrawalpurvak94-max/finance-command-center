import { Landmark, CreditCard as CreditCardIcon } from 'lucide-react'
import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { cn } from '@/lib/utils'
import type { StatementExplorerDetail } from '@/domain/StatementTransaction'

interface StatementIdentityBarProps {
  detail: StatementExplorerDetail
}

/**
 * Answers "which statement am I looking at" at a glance — bank/card
 * identity (reusing Stage 4's getInstitutionIdentity, the same system
 * Statement Control's own table already uses), masked account number, and
 * period, all read straight from the existing StatementExplorerDetail. No
 * new data source, no invented title.
 */
export function StatementIdentityBar({ detail }: StatementIdentityBarProps) {
  const { statement } = detail
  const isCard = statement.account.kind === 'credit_card'
  const identity = getInstitutionIdentity(statement.account.bankName)
  const Icon = isCard ? CreditCardIcon : Landmark

  return (
    <div className="flex flex-wrap items-center gap-md rounded-xl border border-border bg-card p-md">
      <div
        aria-hidden="true"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
          identity.chipClassName,
        )}
      >
        {identity.initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-foreground">{detail.accountName}</p>
        <p className="flex items-center gap-xs text-body-sm text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {statement.account.bankName}
          {detail.last4 && (
            <span className="font-mono text-[11px] tracking-wide tabular-nums">
              {detail.cardNetwork ? `${detail.cardNetwork} ` : ''}•••• {detail.last4}
            </span>
          )}
        </p>
      </div>
      <div className="mx-sm hidden h-8 w-px bg-border sm:block" />
      <div className="min-w-0">
        <p className="text-label-caps uppercase text-muted-foreground">Statement Period</p>
        <p className="truncate text-body-sm font-medium text-foreground">
          {statement.statementPeriodLabel}
        </p>
      </div>
      <div className="ml-auto">
        <StatementStatusBadge status={statement.status} />
      </div>
    </div>
  )
}
