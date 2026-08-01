import type { TransactionAccount } from '@/types/transaction'

interface AccountCellProps {
  account: TransactionAccount
}

export function AccountCell({ account }: AccountCellProps) {
  return (
    <div className="flex flex-col">
      <span className="text-body-sm font-medium text-foreground">{account.bankName}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {account.kind === 'credit_card'
          ? `${account.cardNetwork} •••• ${account.last4}`
          : `•••• ${account.last4}`}
      </span>
    </div>
  )
}
