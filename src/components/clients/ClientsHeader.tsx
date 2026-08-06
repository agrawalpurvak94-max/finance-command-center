import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClientsHeaderProps {
  onAddClient: () => void
  onExport: () => void
  isExportDisabled?: boolean
}

export function ClientsHeader({ onAddClient, onExport, isExportDisabled }: ClientsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Client Management</h1>
        <p className="text-body-sm text-muted-foreground">
          Manage financial entities linked to transactions, accounts and statements.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onExport} disabled={isExportDisabled}>
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" onClick={onAddClient}>
          <Plus className="size-4" aria-hidden="true" />
          Add Client
        </Button>
      </div>
    </div>
  )
}
