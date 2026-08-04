import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EntityReviewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Fires once the close transition has genuinely finished (Base UI's own
   * `onOpenChangeComplete`, not a guessed timeout) — the correct place to
   * restore focus to whatever row control opened the drawer, since Base UI
   * keeps moving focus within its own popup until the exit animation ends.
   */
  onClosed?: () => void
  /** Accessible + visible drawer heading, e.g. "Merchant Review". */
  title: string
  children: ReactNode
}

/**
 * Generic right-side review drawer — the standard interaction pattern for
 * master-data modules (Merchants today; Categories/Clients/Accounts/Credit
 * Cards are expected to reuse this unchanged, supplying only their own
 * section content — and their own `EntityReviewDrawerFooter` — as
 * `children`). Not Merchant-specific: no merchant import anywhere in this
 * file.
 *
 * Built on the existing `Sheet` primitive (Base UI Dialog under the hood),
 * the same one TransactionDetailsDrawer/StatementDetailsDrawer already use
 * — its CSS transitions already slide/fade/blur smoothly, so no new
 * animation library was introduced. Escape-to-close, click-outside-to-close,
 * and focus trapping are all inherited from that same primitive. Focus
 * *restoration* to the triggering element is not (Base UI only auto-restores
 * when opened via its own Trigger component, and every dialog in this app
 * — including this one — is opened via externally-controlled state instead)
 * — see `onClosed` below, which the caller uses to do it explicitly.
 *
 * Deliberately has no opinion on Save/Cancel: the entity-specific body
 * (e.g. MerchantReviewDrawer) owns its own draft state and mutation, so it
 * renders `EntityReviewDrawerFooter` itself as the last child instead of
 * this shell reaching into a child's state through props.
 */
export function EntityReviewDrawer({
  open,
  onOpenChange,
  onClosed,
  title,
  children,
}: EntityReviewDrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(stillOpen) => {
        if (!stillOpen) onClosed?.()
      }}
    >
      <SheetContent side="right" className="flex h-full w-full flex-col sm:max-w-lg">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-lg overflow-y-auto px-lg pb-lg">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

interface EntityReviewDrawerFooterProps {
  onCancel: () => void
  onSave: () => void
  isSaving?: boolean
  saveLabel?: string
  className?: string
}

/**
 * Standardized Cancel / Save Changes footer, meant to be rendered as the
 * last element inside `EntityReviewDrawer`'s children (sticks to the bottom
 * of the drawer's own scroll container via `sticky`). Shared so every
 * future entity drawer gets identical footer behavior without this shell
 * needing access to that entity's save logic.
 */
export function EntityReviewDrawerFooter({
  onCancel,
  onSave,
  isSaving,
  saveLabel = 'Save Changes',
  className,
}: EntityReviewDrawerFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-lg -mb-lg flex justify-end gap-sm border-t border-border bg-popover px-lg py-md',
        className,
      )}
    >
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : saveLabel}
      </Button>
    </div>
  )
}
