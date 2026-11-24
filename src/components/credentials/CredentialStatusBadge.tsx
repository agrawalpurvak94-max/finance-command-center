import { cn } from '@/lib/utils'

interface CredentialStatusBadgeProps {
  configured: boolean
}

/**
 * Dot + full-pill chip, matching the Stitch Credentials reference's status
 * treatment exactly (not the app's usual outlined `Badge`/`success` tone —
 * Stitch's "Configured" state is deliberately primary/blue, not emerald).
 */
export function CredentialStatusBadge({ configured }: CredentialStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-full px-sm py-0.5 text-label-caps font-semibold uppercase tracking-wide',
        configured ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-400',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          configured ? 'bg-primary' : 'animate-pulse bg-amber-400',
        )}
        aria-hidden="true"
      />
      {configured ? 'Configured' : 'Missing Credential'}
    </span>
  )
}
