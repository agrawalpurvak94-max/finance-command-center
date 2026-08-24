import { Landmark, CreditCard } from 'lucide-react'
import type { TransactionAccount } from '@/domain/Account'

interface AccountCellProps {
  account: TransactionAccount
}

export function AccountCell({ account }: AccountCellProps) {
  const Icon = account.kind === 'credit_card' ? CreditCard : Landmark

  return (
    <div className="flex items-center gap-xs">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium text-foreground">
          {account.bankName}
        </span>
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground tabular-nums">
          {account.kind === 'credit_card' && account.cardNetwork
            ? `${account.cardNetwork} •••• ${account.last4}`
            : `•••• ${account.last4}`}
        </span>
      </div>
    </div>
  )
}
