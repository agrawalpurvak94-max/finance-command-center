import { useEffect } from 'react'
import { CircleCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToastProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

/**
 * Minimal, generic success toast — no toast library exists in this project
 * yet (checked `package.json`), so this is a lightweight, self-contained
 * primitive rather than a new dependency. Auto-dismisses after `durationMs`;
 * the timer is a genuine external-system subscription (not state derived
 * from a prop), so this doesn't hit the "no setState in effect" issue
 * CategoryFormDialog/MerchantFormDialog worked around elsewhere.
 */
export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [onDismiss, durationMs])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-lg right-lg z-[60] flex items-center gap-sm rounded-lg border border-border bg-popover px-md py-sm shadow-lg"
    >
      <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
      <span className="text-body-sm text-foreground">{message}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-xs"
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
