import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccountsHeaderProps {
  onLinkAccount: () => void
  onSyncAll: () => void
  isSyncing?: boolean
}

export function AccountsHeader({ onLinkAccount, onSyncAll, isSyncing }: AccountsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Financial Accounts</h1>
        <p className="text-body-sm text-muted-foreground">
          Real-time overview of all connected bank accounts.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onSyncAll} disabled={isSyncing}>
          <RefreshCw className={isSyncing ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
          {isSyncing ? 'Syncing…' : 'Sync All'}
        </Button>
        <Button size="sm" onClick={onLinkAccount}>
          <Plus className="size-4" aria-hidden="true" />
          Link Account
        </Button>
      </div>
    </div>
  )
}
