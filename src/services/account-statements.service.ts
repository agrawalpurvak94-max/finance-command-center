import type {
  AccountStatementTile,
  AccountStatementsSummary,
  CreditCardPaymentSummary,
  UpcomingCardPayment,
} from '@/domain/AccountStatements'
import type { BankAccountType } from '@/domain/Account'
import type { AnalyticsInsight } from '@/domain/Analytics'
import type { Statement } from '@/domain/Statement'
import { bankAccountRepository } from '@/services/accounts.service'
import { creditCardRepository } from '@/services/credit-cards.service'
import { statementRepository } from '@/services/statements.service'
import { formatINR } from '@/utils/currency'

/**
 * Account Statements — the unified statement-analysis view replacing the
 * separate Credit Cards / Financial Accounts pages (Module 12B follow-up).
 *
 * NOT real-time: unlike Financial Pulse (`dashboard.service.ts`, which reads
 * `transactions` for the current period), every figure here comes from
 * `statements` (via `statementRepository`, itself `vw_statements`) — the
 * account's own latest statement, never "today". `statement_transactions` is
 * not queried directly here; `statements.total_debits/total_credits` (the
 * pre-aggregated rollup Workflow D already computes from
 * `statement_transactions`) is the authoritative figure — see the Module
 * 12B Phase 2 verification (diff: 0 against a fresh SUM for every tested
 * statement). Never sums `transactions` + `statement_transactions`, and
 * never sums both `statements.total_debits` AND a fresh
 * `statement_transactions` SUM for the same figure.
 */

const BANK_TYPE_LABEL: Record<BankAccountType, AccountStatementTile['accountType']> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'Overdraft',
}

/** The account's OWN latest statement — never a global "latest statement across all accounts". */
async function latestStatementFor(accountId: string): Promise<Statement | null> {
  const { rows } = await statementRepository.list({
    page: 1,
    pageSize: 1,
    filters: { accountId },
    sort: { id: 'statementPeriodEnd', desc: true },
  })
  return rows[0] ?? null
}

function tileFromStatement(
  base: Omit<
    AccountStatementTile,
    | 'hasStatement'
    | 'statementId'
    | 'statementPeriodLabel'
    | 'statementDate'
    | 'dueDate'
    | 'totalDebits'
    | 'totalCredits'
    | 'closingBalance'
    | 'minimumDue'
    | 'statementTotalAmountDue'
    | 'transactionsExtracted'
  >,
  statement: Statement | null,
): AccountStatementTile {
  return {
    ...base,
    hasStatement: statement !== null,
    statementId: statement?.id ?? null,
    statementPeriodLabel: statement?.statementPeriodLabel || null,
    statementDate: statement?.statementDate || null,
    dueDate: statement?.dueDate ?? null,
    totalDebits: statement?.totalDebits ?? null,
    totalCredits: statement?.totalCredits ?? null,
    closingBalance: statement?.closingBalance ?? null,
    minimumDue: statement?.minimumDue ?? null,
    statementTotalAmountDue: statement?.statementTotalAmountDue ?? null,
    transactionsExtracted: statement?.transactionsExtracted ?? 0,
  }
}

async function getAccountStatementTiles(clientId?: string): Promise<AccountStatementTile[]> {
  const [cardsRes, bankRes, cardCredentials] = await Promise.all([
    creditCardRepository.list({
      page: 1,
      pageSize: 100,
      filters: clientId ? { clientId } : undefined,
    }),
    bankAccountRepository.list({
      page: 1,
      pageSize: 100,
      filters: clientId ? { clientId } : undefined,
    }),
    // Single batched call (never per-card) — `card_product` isn't projected
    // by `vw_accounts` (see `domain/Credential.ts`), so `CreditCardRecord`
    // itself can't carry it. `listCredentials()` already reads `accounts`
    // directly for exactly this column.
    creditCardRepository.listCredentials(),
  ])
  const cardProductById = new Map(cardCredentials.map((c) => [c.id, c.cardProduct]))

  const cardTiles = await Promise.all(
    cardsRes.rows.map(async (c) => {
      const statement = await latestStatementFor(c.id)
      return tileFromStatement(
        {
          id: c.id,
          kind: 'credit_card',
          accountType: 'Credit Card',
          name: c.nickname || c.cardName,
          institutionName: c.bankName,
          maskedNumber: c.maskedNumber,
          cardProduct: cardProductById.get(c.id) ?? null,
          accountHolder: c.accountHolder,
        },
        statement,
      )
    }),
  )

  const bankTiles = await Promise.all(
    bankRes.rows.map(async (a) => {
      const statement = await latestStatementFor(a.id)
      return tileFromStatement(
        {
          id: a.id,
          kind: 'bank',
          accountType: BANK_TYPE_LABEL[a.accountType],
          name: a.nickname || a.accountName,
          institutionName: a.bankName,
          maskedNumber: a.maskedAccountNumber,
          cardProduct: null,
          accountHolder: a.accountHolder,
        },
        statement,
      )
    }),
  )

  return [...cardTiles, ...bankTiles]
}

async function getAccountStatementsSummary(): Promise<AccountStatementsSummary> {
  const tiles = await getAccountStatementTiles()
  const withStatement = tiles.filter((t) => t.hasStatement)
  // Inflow: Savings/Current/Overdraft ONLY, same rule as Financial Pulse —
  // a credit card's "credits" are refunds/payments against its own balance,
  // not money received, so they never contribute to Inflow. Spend stays
  // scoped to every account/card, matching Financial Pulse's convention.
  const bankWithStatement = withStatement.filter((t) => t.kind === 'bank')
  return {
    totalAccounts: tiles.length,
    statementsAvailable: withStatement.length,
    latestStatementSpend: withStatement.reduce((sum, t) => sum + (t.totalDebits ?? 0), 0),
    latestStatementInflow: bankWithStatement.reduce((sum, t) => sum + (t.totalCredits ?? 0), 0),
  }
}

/** Credit-card tiles with a real latest statement to sum — a card with no statement yet ("Statement not available") is excluded, never treated as zero. */
function creditCardTilesWithStatement(
  tiles: readonly AccountStatementTile[],
): AccountStatementTile[] {
  return tiles.filter((t) => t.kind === 'credit_card' && t.hasStatement)
}

/**
 * Operates on whatever tile set the caller passes — Account Intelligence
 * passes the FULL (not type-filter/search-narrowed) tile list, so the
 * payment position stays meaningful no matter what the account list below
 * is currently filtered to. Each tile is already ONE card's own latest
 * statement (see `latestStatementFor` above), so summing tiles can never
 * double-count a card's older statements. `nextDueDate` is the EARLIEST due
 * date among included cards, never an implication that the whole total is
 * due on that one date.
 */
function getCreditCardPaymentSummary(
  tiles: readonly AccountStatementTile[],
): CreditCardPaymentSummary {
  const cards = creditCardTilesWithStatement(tiles)
  const totalAmountDue = cards.reduce((s, t) => s + (t.statementTotalAmountDue ?? 0), 0)
  const minimumAmountDue = cards.reduce((s, t) => s + (t.minimumDue ?? 0), 0)
  const dueDates = cards
    .map((t) => t.dueDate)
    .filter((d): d is string => !!d)
    .sort()
  return {
    totalAmountDue,
    minimumAmountDue,
    nextDueDate: dueDates[0] ?? null,
    cardsWithDue: dueDates.length,
  }
}

/**
 * Days from "today" to a Postgres `date` column value ("YYYY-MM-DD"). Both
 * sides are computed as UTC-midnight instants — "today" from the UTC
 * calendar date, never the viewer's local one — so this can never be
 * shifted a day by the viewer's timezone, same reasoning
 * `lib/statementDate.ts`'s `parseDateOnly` documents for parsing `dueDate`
 * itself. Negative means overdue, 0 means due today.
 */
function daysUntilDueDate(dueDate: string): number {
  const [year, month, day] = dueDate.slice(0, 10).split('-').map(Number)
  const due = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((due - today) / 86_400_000)
}

/**
 * One line per card with something due — never merged across cards, unlike
 * a by-date rollup — so the UI can show which specific card owes what and
 * how urgent it is. Cards with nothing outstanding are excluded, not shown
 * as a zero-value line. Sorted soonest-due first.
 */
function getUpcomingCardPayments(tiles: readonly AccountStatementTile[]): UpcomingCardPayment[] {
  const cards = creditCardTilesWithStatement(tiles).filter(
    (t) => !!t.dueDate && (t.statementTotalAmountDue ?? 0) > 0,
  )
  return cards
    .map((t) => ({
      tileId: t.id,
      name: t.name,
      institutionName: t.institutionName,
      maskedNumber: t.maskedNumber,
      cardProduct: t.cardProduct,
      amount: t.statementTotalAmountDue ?? 0,
      dueDate: t.dueDate!,
      daysRemaining: daysUntilDueDate(t.dueDate!),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/**
 * Account Intelligence's portfolio-level insight cards — every rule here
 * operates on the SAME already-fetched tile list the page renders, so this
 * can never drift from what's on screen and never issues a separate query.
 * Rules that don't apply to the current data are simply omitted, never
 * rendered as a fabricated/zero-value insight (see `InsightsPanel`'s empty
 * state for when nothing qualifies at all).
 */
function getAccountIntelligenceInsights(
  tiles: readonly AccountStatementTile[],
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []
  const dueCards = creditCardTilesWithStatement(tiles).filter(
    (t) => !!t.dueDate && (t.statementTotalAmountDue ?? 0) > 0,
  )

  // 1. Upcoming payment concentration — cards due within the next 7 days.
  const dueSoon = dueCards.filter((t) => daysUntilDueDate(t.dueDate!) <= 7)
  if (dueSoon.length > 0) {
    const amount = dueSoon.reduce((sum, t) => sum + (t.statementTotalAmountDue ?? 0), 0)
    const soonest = Math.min(...dueSoon.map((t) => daysUntilDueDate(t.dueDate!)))
    insights.push({
      id: 'upcoming-payment-concentration',
      severity: soonest <= 3 ? 'serious' : 'warning',
      title: 'Upcoming payment concentration',
      description: `${formatINR(amount)} across ${dueSoon.length} card${dueSoon.length === 1 ? '' : 's'} due within the next 7 days.`,
    })
  }

  // 2. The single card carrying the highest outstanding balance.
  const highestOutstanding = [...dueCards].sort(
    (a, b) => (b.statementTotalAmountDue ?? 0) - (a.statementTotalAmountDue ?? 0),
  )[0]
  if (highestOutstanding) {
    const days = daysUntilDueDate(highestOutstanding.dueDate!)
    const dueLabel =
      days < 0
        ? 'Payment is overdue.'
        : days === 0
          ? 'Payment is due today.'
          : `Payment due in ${days} day${days === 1 ? '' : 's'}.`
    insights.push({
      id: 'highest-outstanding-card',
      severity: days < 0 ? 'critical' : days <= 3 ? 'serious' : days <= 7 ? 'warning' : 'info',
      title: `${highestOutstanding.name} has the highest outstanding balance`,
      description: `${formatINR(highestOutstanding.statementTotalAmountDue ?? 0)} currently due. ${dueLabel}`,
    })
  }

  // 3. Statement spend concentrated on a single card (needs 2+ cards with
  // statement spend — a single card is trivially 100%, not informative).
  const spendCards = creditCardTilesWithStatement(tiles).filter((t) => (t.totalDebits ?? 0) > 0)
  if (spendCards.length >= 2) {
    const totalSpend = spendCards.reduce((sum, t) => sum + (t.totalDebits ?? 0), 0)
    const topSpender = [...spendCards].sort(
      (a, b) => (b.totalDebits ?? 0) - (a.totalDebits ?? 0),
    )[0]
    const share = (topSpender.totalDebits ?? 0) / totalSpend
    if (share >= 0.4) {
      insights.push({
        id: 'card-spend-concentration',
        severity: share >= 0.6 ? 'warning' : 'info',
        title: `${topSpender.name} represents ${Math.round(share * 100)}% of this month's card spend`,
        description: `${formatINR(topSpender.totalDebits ?? 0)} spent on ${topSpender.institutionName} ${topSpender.name} this statement period.`,
      })
    }
  }

  return insights
}

export const accountStatementsService = {
  getAccountStatementTiles,
  getAccountStatementsSummary,
  getCreditCardPaymentSummary,
  getUpcomingCardPayments,
  getAccountIntelligenceInsights,
}
