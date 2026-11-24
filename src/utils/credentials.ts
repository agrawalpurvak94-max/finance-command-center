import type { AccountCredentialRecord } from '@/domain/Credential'

/**
 * Case-insensitive match on bank + last 4 within the same account kind —
 * used before inserting a new credit card/bank account so the same physical
 * card/account can't be registered twice.
 */
export function findDuplicateCredential(
  existing: readonly AccountCredentialRecord[],
  kind: AccountCredentialRecord['kind'],
  institutionName: string,
  last4: string,
): AccountCredentialRecord | undefined {
  const normalizedBank = institutionName.trim().toLowerCase()
  const normalizedLast4 = last4.trim()
  return existing.find(
    (record) =>
      record.kind === kind &&
      record.institutionName.trim().toLowerCase() === normalizedBank &&
      record.last4 === normalizedLast4,
  )
}

/** Short relative label ("today", "3 days ago", or a date) for an ISO timestamp. */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'unknown date'
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
