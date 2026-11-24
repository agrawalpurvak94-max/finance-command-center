import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PasswordCellProps {
  value: string | null
  /** Accessible label suffix, e.g. "for HDFC Bank •••• 7125" — read alongside "Reveal password"/"Hide password". */
  labelSuffix: string
}

/**
 * Read-only masked/reveal cell for the Credentials table. Never logs
 * `value` — masked display uses a fixed dot count, not the real password
 * length, so the mask itself never leaks information about the credential.
 */
export function PasswordCell({ value, labelSuffix }: PasswordCellProps) {
  const [revealed, setRevealed] = useState(false)

  if (!value) {
    return <span className="text-body-sm text-muted-foreground">—</span>
  }

  return (
    <div className="flex items-center gap-xs">
      <span className="text-table-mono tabular-nums text-foreground">
        {revealed ? value : '••••••••'}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? `Hide password ${labelSuffix}` : `Reveal password ${labelSuffix}`}
      >
        {revealed ? (
          <EyeOff className="size-3.5" aria-hidden="true" />
        ) : (
          <Eye className="size-3.5" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
