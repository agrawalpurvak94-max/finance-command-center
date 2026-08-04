import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MerchantsHeaderProps {
  onAddMerchant: () => void
  onExport: () => void
  isExportDisabled?: boolean
}

export function MerchantsHeader({
  onAddMerchant,
  onExport,
  isExportDisabled,
}: MerchantsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Merchant Center</h1>
        <p className="text-body-sm text-muted-foreground">
          Master data every transaction is matched against, and its default category mapping.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onExport} disabled={isExportDisabled}>
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" onClick={onAddMerchant}>
          <Plus className="size-4" aria-hidden="true" />
          Add Merchant
        </Button>
      </div>
    </div>
  )
}
