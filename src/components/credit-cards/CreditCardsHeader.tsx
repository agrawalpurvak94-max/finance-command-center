import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreditCardsHeaderProps {
  onAddCreditCard: () => void
}

export function CreditCardsHeader({ onAddCreditCard }: CreditCardsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Credit Cards</h1>
        <p className="text-body-sm text-muted-foreground">
          Real-time overview of all connected credit cards.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button size="sm" onClick={onAddCreditCard}>
          <Plus className="size-4" aria-hidden="true" />
          Add Credit Card
        </Button>
      </div>
    </div>
  )
}
