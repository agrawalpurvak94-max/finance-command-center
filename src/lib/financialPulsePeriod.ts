import type { AccountKind } from '@/domain/Account'

export type FinancialPulsePeriodType = 'statement_cycle' | 'calendar_month'

export interface FinancialPulsePeriod {
  /** ISO date (YYYY-MM-DD). Null when the period genuinely cannot be determined — never fabricated. */
  readonly startDate: string | null
  /** ISO date (YYYY-MM-DD), always today. */
  readonly endDate: string
  readonly periodType: FinancialPulsePeriodType
  /** False for a credit card with no statement yet, or an unusable statement date — see edge cases below. */
  readonly available: boolean
}

/**
 * Formats a Date's LOCAL calendar date as YYYY-MM-DD — deliberately never
 * `.toISOString()`, which converts to UTC and can shift the date by a day
 * in any timezone ahead of UTC (confirmed live: IST turned "2026-08-01"
 * into "2026-07-31" and "day after 2026-08-18" into "2026-08-18" itself).
 * All arithmetic below stays in local-time Date methods for the same
 * reason — never mixing in a UTC read/write partway through.
 */
function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses a YYYY-MM-DD string as a local-midnight Date of that literal calendar date. */
function parseIsoDateLocal(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Single source of truth for Financial Pulse's "current reporting period"
 * per account — credit cards use their OWN latest statement's cycle end
 * (statement_period_end + 1 day), bank accounts (Savings/Current/OD) use
 * the calendar month. Never scattered into individual components/services.
 *
 * `latestStatementPeriodEnd` must be resolved by the caller from that
 * SPECIFIC account's own latest statement (never a global "latest
 * statement across all accounts") — see `dashboard.service.ts`.
 */
export function getFinancialPulsePeriod(
  accountKind: AccountKind,
  latestStatementPeriodEnd: string | null,
  today: Date = new Date(),
): FinancialPulsePeriod {
  const endDate = toLocalIsoDate(today)

  if (accountKind === 'bank') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      startDate: toLocalIsoDate(monthStart),
      endDate,
      periodType: 'calendar_month',
      available: true,
    }
  }

  // Credit card: period starts the day after the latest statement's cycle end.
  if (!latestStatementPeriodEnd) {
    return { startDate: null, endDate, periodType: 'statement_cycle', available: false }
  }
  const statementEnd = parseIsoDateLocal(latestStatementPeriodEnd)
  if (!statementEnd) {
    return { startDate: null, endDate, periodType: 'statement_cycle', available: false }
  }
  const periodStart = new Date(statementEnd)
  periodStart.setDate(periodStart.getDate() + 1)
  const startDate = toLocalIsoDate(periodStart)

  // Edge case: bad/future statement data would otherwise produce an
  // inverted or all-future window — fail safely instead of returning one.
  if (startDate > endDate) {
    return { startDate: null, endDate, periodType: 'statement_cycle', available: false }
  }

  return { startDate, endDate, periodType: 'statement_cycle', available: true }
}

const PERIOD_LABEL_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }

/** "1 Aug – 22 Aug" / "23 Aug – Today" / "No statement period available". */
export function formatPeriodLabel(period: FinancialPulsePeriod): string {
  if (!period.available || !period.startDate) return 'No statement period available'
  const start = parseIsoDateLocal(period.startDate)
  const end = parseIsoDateLocal(period.endDate)
  if (!start || !end) return 'No statement period available'
  const startLabel = start.toLocaleDateString('en-IN', PERIOD_LABEL_FORMAT)
  const isToday = period.endDate === toLocalIsoDate(new Date())
  const endLabel = isToday ? 'Today' : end.toLocaleDateString('en-IN', PERIOD_LABEL_FORMAT)
  return `${startLabel} – ${endLabel}`
}
