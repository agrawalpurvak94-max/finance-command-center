import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CategoriesHeaderProps {
  onAddCategory: () => void
  onExport: () => void
  isExportDisabled?: boolean
}

export function CategoriesHeader({
  onAddCategory,
  onExport,
  isExportDisabled,
}: CategoriesHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Category Management</h1>
        <p className="text-body-sm text-muted-foreground">
          Master data every transaction, statement, and merchant is classified against.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onExport} disabled={isExportDisabled}>
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" onClick={onAddCategory}>
          <Plus className="size-4" aria-hidden="true" />
          Add Category
        </Button>
      </div>
    </div>
  )
}
