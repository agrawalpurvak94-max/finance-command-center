import { describe, expect, it } from 'vitest'
import { formatStatementDate, toDateInputValue } from '@/lib/statementDate'

describe('formatStatementDate', () => {
  it('formats a valid date-only column value', () => {
    expect(formatStatementDate('2026-08-20')).toBe('20 Aug 2026')
  })

  it('formats a value with a trailing time component', () => {
    expect(formatStatementDate('2026-08-20T00:00:00')).toBe('20 Aug 2026')
  })

  it('never shifts the day regardless of any time/timezone suffix', () => {
    expect(formatStatementDate('2026-01-01T23:59:59+05:30')).toBe('01 Jan 2026')
  })

  it('returns "Not available" for an empty string, not "Invalid Date"', () => {
    expect(formatStatementDate('')).toBe('Not available')
  })

  it('returns "Not available" for null', () => {
    expect(formatStatementDate(null)).toBe('Not available')
  })

  it('returns "Not available" for undefined', () => {
    expect(formatStatementDate(undefined)).toBe('Not available')
  })

  it('returns "Not available" for a malformed value', () => {
    expect(formatStatementDate('not-a-date')).toBe('Not available')
  })
})

describe('toDateInputValue', () => {
  it('passes a plain date-only value through unchanged for <input type="date">', () => {
    expect(toDateInputValue('2026-08-20')).toBe('2026-08-20')
  })

  it('strips a trailing time component', () => {
    expect(toDateInputValue('2026-08-20T00:00:00')).toBe('2026-08-20')
  })

  it('returns "" for null/undefined/empty so the input renders unset, not invalid', () => {
    expect(toDateInputValue(null)).toBe('')
    expect(toDateInputValue(undefined)).toBe('')
    expect(toDateInputValue('')).toBe('')
  })
})
