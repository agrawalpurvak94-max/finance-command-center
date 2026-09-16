import { describe, expect, it } from 'vitest'
import { accountStatementsService } from '@/services/account-statements.service'
import type { AccountStatementTile } from '@/domain/AccountStatements'

function tile(overrides: Partial<AccountStatementTile> = {}): AccountStatementTile {
  return {
    id: 'card-1',
    kind: 'credit_card',
    accountType: 'Credit Card',
    name: 'HDFC Bank Credit Card',
    institutionName: 'HDFC Bank',
    maskedNumber: '•••• 1581',
    accountHolder: 'Purvak Agrawal',
    hasStatement: true,
    statementId: 'stmt-1',
    statementPeriodLabel: '2026-08-06 – 2026-09-05',
    statementDate: '2026-09-05',
    dueDate: '2026-09-25',
    totalDebits: 10000,
    totalCredits: 0,
    closingBalance: 20000,
    minimumDue: 2000,
    statementTotalAmountDue: 20000,
    transactionsExtracted: 12,
    ...overrides,
  }
}

describe('getCreditCardPaymentSummary', () => {
  it('sums Total/Minimum Due across cards without double-counting a card that has multiple statements', () => {
    // Two DIFFERENT cards, each already represented by exactly one tile
    // (one latest statement each) — this is the only shape
    // getAccountStatementTiles ever produces, so "multiple statements for
    // one card" can never appear as multiple tiles for the same id.
    const tiles = [
      tile({
        id: 'card-a',
        statementTotalAmountDue: 20000,
        minimumDue: 2000,
        dueDate: '2026-09-25',
      }),
      tile({
        id: 'card-b',
        statementTotalAmountDue: 30000,
        minimumDue: 3000,
        dueDate: '2026-09-27',
      }),
    ]
    const summary = accountStatementsService.getCreditCardPaymentSummary(tiles)
    expect(summary.totalAmountDue).toBe(50000)
    expect(summary.minimumAmountDue).toBe(5000)
  })

  it('nextDueDate is the EARLIEST due date among included cards, not the latest or an average', () => {
    const tiles = [
      tile({ id: 'card-a', dueDate: '2026-09-27' }),
      tile({ id: 'card-b', dueDate: '2026-09-25' }),
      tile({ id: 'card-c', dueDate: '2026-10-07' }),
    ]
    const summary = accountStatementsService.getCreditCardPaymentSummary(tiles)
    expect(summary.nextDueDate).toBe('2026-09-25')
  })

  it('excludes cards with no statement yet, rather than treating them as zero', () => {
    const tiles = [
      tile({ id: 'card-a', statementTotalAmountDue: 20000 }),
      tile({
        id: 'card-b',
        hasStatement: false,
        statementTotalAmountDue: null,
        minimumDue: null,
        dueDate: null,
      }),
    ]
    const summary = accountStatementsService.getCreditCardPaymentSummary(tiles)
    expect(summary.totalAmountDue).toBe(20000)
  })

  it('ignores non-credit-card tiles (bank accounts)', () => {
    const tiles = [
      tile({ id: 'card-a', statementTotalAmountDue: 20000 }),
      tile({ id: 'bank-a', kind: 'bank', accountType: 'Savings', statementTotalAmountDue: 999999 }),
    ]
    const summary = accountStatementsService.getCreditCardPaymentSummary(tiles)
    expect(summary.totalAmountDue).toBe(20000)
  })

  it('returns nextDueDate null and zero totals for an empty tile list', () => {
    const summary = accountStatementsService.getCreditCardPaymentSummary([])
    expect(summary).toEqual({
      totalAmountDue: 0,
      minimumAmountDue: 0,
      nextDueDate: null,
      cardsWithDue: 0,
    })
  })
})

describe('getCreditCardDueDateInsights', () => {
  it('combines cards that share the EXACT same due date into one line', () => {
    const tiles = [
      tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-25' }),
      tile({ id: 'card-b', statementTotalAmountDue: 30000, dueDate: '2026-09-25' }),
    ]
    const insights = accountStatementsService.getCreditCardDueDateInsights(tiles)
    expect(insights).toHaveLength(1)
    expect(insights[0].amount).toBe(50000)
    expect(insights[0].label).toBe('₹50,000 due by 25th of the month.')
  })

  it('does NOT merge cards that land on the same day-of-month in different months', () => {
    const tiles = [
      tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-25' }),
      tile({ id: 'card-b', statementTotalAmountDue: 30000, dueDate: '2026-10-25' }),
    ]
    const insights = accountStatementsService.getCreditCardDueDateInsights(tiles)
    expect(insights).toHaveLength(2)
  })

  it('sorts insights by due date ascending', () => {
    const tiles = [
      tile({ id: 'card-a', dueDate: '2026-09-27' }),
      tile({ id: 'card-b', dueDate: '2026-09-07' }),
    ]
    const insights = accountStatementsService.getCreditCardDueDateInsights(tiles)
    expect(insights.map((i) => i.dueDate)).toEqual(['2026-09-07', '2026-09-27'])
  })

  it('excludes cards with nothing outstanding, rather than showing a zero-value line', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 0, dueDate: '2026-09-25' })]
    expect(accountStatementsService.getCreditCardDueDateInsights(tiles)).toEqual([])
  })

  it('returns an empty array (meaningful empty state upstream) when there are no cards at all', () => {
    expect(accountStatementsService.getCreditCardDueDateInsights([])).toEqual([])
  })

  it('correctly formats ordinal suffixes (1st, 2nd, 3rd, 11th-13th, 21st)', () => {
    const cases: [string, string][] = [
      ['2026-09-01', '1st'],
      ['2026-09-02', '2nd'],
      ['2026-09-03', '3rd'],
      ['2026-09-11', '11th'],
      ['2026-09-12', '12th'],
      ['2026-09-13', '13th'],
      ['2026-09-21', '21st'],
    ]
    for (const [dueDate, suffix] of cases) {
      const insights = accountStatementsService.getCreditCardDueDateInsights([
        tile({ id: `card-${dueDate}`, statementTotalAmountDue: 100, dueDate }),
      ])
      expect(insights[0].label).toContain(`due by ${suffix} of the month.`)
    }
  })
})
