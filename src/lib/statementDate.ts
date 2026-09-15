const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/**
 * `statements.statement_date` / `statement_period_start` / `statement_period_end`
 * are Postgres `date` columns, so a real value always starts with
 * `YYYY-MM-DD` — but the column is nullable, and `SupabaseStatementRepository`
 * maps a missing value to `''` for `statementDate` specifically (see its
 * `mapRow` doc comment). Statement Control previously fed that straight into
 * `new Date(value)`, which turns `''` into `Invalid Date` and renders the
 * literal string "Invalid Date" — the bug this fixes. Parsing the digits
 * directly (never going through `Date`/`toLocaleDateString`) also means a
 * valid value can never be shifted a day by the viewer's timezone.
 */
function parseDateOnly(
  value: string | null | undefined,
): { year: string; month: string; day: string } | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return null
  return { year, month, day }
}

/** Display formatting for a statement date column — "Not available" instead of "Invalid Date". */
export function formatStatementDate(value: string | null | undefined): string {
  const parsed = parseDateOnly(value)
  if (!parsed) return 'Not available'
  return `${parsed.day} ${MONTHS[Number(parsed.month) - 1]} ${parsed.year}`
}

/** Value for a controlled `<input type="date">` editing a statement date column — '' when unset/invalid. */
export function toDateInputValue(value: string | null | undefined): string {
  const parsed = parseDateOnly(value)
  return parsed ? `${parsed.year}-${parsed.month}-${parsed.day}` : ''
}
