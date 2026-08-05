import { RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BankAccountHealthBadge } from '@/components/accounts/BankAccountHealthBadge'
import { getBankInitials } from '@/utils/bank'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { BankAccountRecord } from '@/domain/Account'

const accountTypeLabel: Record<BankAccountRecord['accountType'], string> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'Overdraft',
}

interface BankAccountCardProps {
  account: BankAccountRecord
  isSelected?: boolean
  onOpen: (account: BankAccountRecord) => void
}

export function BankAccountCard({ account, isSelected, onOpen }: BankAccountCardProps) {
  return (
    <button
      type="button"
      data-bank-account-card-trigger={account.id}
      onClick={() => onOpen(account)}
      aria-label={`View ${account.nickname ?? account.accountName}`}
      className={cn(
        'group flex h-full flex-col gap-md rounded-xl border border-border bg-card p-md text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'border-primary/50 ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="flex min-w-0 flex-1 items-center gap-sm">
          <Avatar className="shrink-0">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {getBankInitials(account.bankName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-foreground">
              {account.nickname ?? account.accountName}
            </p>
            <p className="truncate text-body-sm text-muted-foreground">{account.bankName}</p>
          </div>
        </div>
        <BankAccountHealthBadge health={account.health} />
      </div>

      <div className="flex items-center gap-xs text-body-sm text-muted-foreground">
        <span className="shrink-0">{accountTypeLabel[account.accountType]}</span>
        <span aria-hidden="true">•</span>
        <span className="shrink-0 text-table-mono tabular-nums">•••• {account.last4}</span>
      </div>

      <div className="min-w-0">
        <p className="text-label-caps uppercase text-muted-foreground">Current Balance</p>
        <p
          className="truncate text-headline-lg tabular-nums text-foreground"
          title={formatINR(account.currentBalance)}
        >
          {formatINR(account.currentBalance)}
        </p>
        <p className="mt-1 truncate text-body-sm text-muted-foreground">
          Available: {formatINR(account.availableBalance)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-sm rounded-lg bg-muted/40 p-sm text-table-mono text-xs">
        <div className="min-w-0">
          <p className="text-muted-foreground">Monthly Credits</p>
          <p className="truncate font-semibold text-secondary">
            +{formatINR(account.monthlyCredits)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Monthly Debits</p>
          <p className="truncate font-semibold text-destructive">
            -{formatINR(account.monthlyDebits)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm text-body-sm">
        <div className="min-w-0">
          <p className="text-label-caps uppercase text-muted-foreground">Top Merchant</p>
          <p className="truncate text-foreground">{account.topMerchant?.name ?? '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-label-caps uppercase text-muted-foreground">Top Category</p>
          <p className="truncate text-foreground">{account.topCategory?.name ?? '—'}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-sm border-t border-border pt-sm text-body-sm text-muted-foreground">
        <span className="min-w-0 truncate">
          {account.recentActivityCount} {account.recentActivityCount === 1 ? 'txn' : 'txns'} · 30d
        </span>
        <span className="flex min-w-0 shrink-0 items-center gap-xs">
          {account.health === 'sync_required' && (
            <RefreshCw className="size-3 shrink-0 text-blue-400" aria-hidden="true" />
          )}
          <span className="truncate">Last Sync: {account.lastSyncAt}</span>
        </span>
      </div>
    </button>
  )
}
