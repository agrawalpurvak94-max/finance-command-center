import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransactionsHeaderProps {
  onExportCsv: () => void
  onNewTransaction: () => void
}

export function TransactionsHeader({ onExportCsv, onNewTransaction }: TransactionsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Transaction Ledger</h1>
        <p className="text-body-sm text-muted-foreground">
          Manage and audit institutional fiscal movements.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="size-4" aria-hidden="true" />
          CSV Export
        </Button>
        <Button size="sm" onClick={onNewTransaction}>
          <Plus className="size-4" aria-hidden="true" />
          New Transaction
        </Button>
      </div>
    </div>
  )
}
