import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    cardProduct: 'Infinia',
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

describe('getUpcomingCardPayments', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns one line per card, never merging cards even when due dates match', () => {
    const tiles = [
      tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-25' }),
      tile({ id: 'card-b', statementTotalAmountDue: 30000, dueDate: '2026-09-25' }),
    ]
    const payments = accountStatementsService.getUpcomingCardPayments(tiles)
    expect(payments).toHaveLength(2)
    expect(payments.map((p) => p.amount)).toEqual([20000, 30000])
  })

  it('computes daysRemaining against the current UTC date', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-25' })]
    const payments = accountStatementsService.getUpcomingCardPayments(tiles)
    expect(payments[0].daysRemaining).toBe(8)
  })

  it('daysRemaining is negative for an overdue payment', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-10' })]
    const payments = accountStatementsService.getUpcomingCardPayments(tiles)
    expect(payments[0].daysRemaining).toBe(-7)
  })

  it('sorts payments by due date ascending', () => {
    const tiles = [
      tile({ id: 'card-a', dueDate: '2026-09-27' }),
      tile({ id: 'card-b', dueDate: '2026-09-07' }),
    ]
    const payments = accountStatementsService.getUpcomingCardPayments(tiles)
    expect(payments.map((p) => p.dueDate)).toEqual(['2026-09-07', '2026-09-27'])
  })

  it('carries the card product through from the tile, and null when unset', () => {
    const tiles = [
      tile({ id: 'card-a', cardProduct: 'Infinia', dueDate: '2026-09-25' }),
      tile({ id: 'card-b', cardProduct: null, dueDate: '2026-09-25' }),
    ]
    const payments = accountStatementsService.getUpcomingCardPayments(tiles)
    expect(payments.map((p) => p.cardProduct)).toEqual(['Infinia', null])
  })

  it('excludes cards with nothing outstanding, rather than showing a zero-value line', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 0, dueDate: '2026-09-25' })]
    expect(accountStatementsService.getUpcomingCardPayments(tiles)).toEqual([])
  })

  it('returns an empty array when there are no cards at all', () => {
    expect(accountStatementsService.getUpcomingCardPayments([])).toEqual([])
  })
})

describe('getAccountIntelligenceInsights', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns no insights for an empty tile list', () => {
    expect(accountStatementsService.getAccountIntelligenceInsights([])).toEqual([])
  })

  it('flags an upcoming payment concentration when a card is due within 7 days', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-09-20' })]
    const insights = accountStatementsService.getAccountIntelligenceInsights(tiles)
    expect(insights.some((i) => i.id === 'upcoming-payment-concentration')).toBe(true)
  })

  it('does not flag upcoming payment concentration when the only due date is more than 7 days out', () => {
    const tiles = [tile({ id: 'card-a', statementTotalAmountDue: 20000, dueDate: '2026-10-15' })]
    const insights = accountStatementsService.getAccountIntelligenceInsights(tiles)
    expect(insights.some((i) => i.id === 'upcoming-payment-concentration')).toBe(false)
  })

  it('identifies the single card with the highest outstanding balance', () => {
    const tiles = [
      tile({ id: 'card-a', name: 'Card A', statementTotalAmountDue: 20000, dueDate: '2026-10-15' }),
      tile({ id: 'card-b', name: 'Card B', statementTotalAmountDue: 80000, dueDate: '2026-10-20' }),
    ]
    const insights = accountStatementsService.getAccountIntelligenceInsights(tiles)
    const insight = insights.find((i) => i.id === 'highest-outstanding-card')
    expect(insight?.title).toContain('Card B')
  })

  it('flags spend concentration only when one card represents at least 40% of card spend across 2+ cards', () => {
    const concentrated = [
      tile({ id: 'card-a', name: 'Card A', totalDebits: 80000 }),
      tile({ id: 'card-b', name: 'Card B', totalDebits: 20000 }),
    ]
    expect(
      accountStatementsService
        .getAccountIntelligenceInsights(concentrated)
        .some((i) => i.id === 'card-spend-concentration'),
    ).toBe(true)

    const balanced = [
      tile({ id: 'card-a', name: 'Card A', totalDebits: 34000 }),
      tile({ id: 'card-b', name: 'Card B', totalDebits: 33000 }),
      tile({ id: 'card-c', name: 'Card C', totalDebits: 33000 }),
    ]
    expect(
      accountStatementsService
        .getAccountIntelligenceInsights(balanced)
        .some((i) => i.id === 'card-spend-concentration'),
    ).toBe(false)
  })

  it('does not flag spend concentration for a single card (trivially 100%)', () => {
    const tiles = [tile({ id: 'card-a', totalDebits: 10000 })]
    expect(
      accountStatementsService
        .getAccountIntelligenceInsights(tiles)
        .some((i) => i.id === 'card-spend-concentration'),
    ).toBe(false)
  })
})
