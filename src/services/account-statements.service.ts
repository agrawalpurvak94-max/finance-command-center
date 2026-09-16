import type {
  AccountStatementTile,
  AccountStatementsSummary,
  CreditCardDueDateInsight,
  CreditCardPaymentSummary,
} from '@/domain/AccountStatements'
import type { BankAccountType } from '@/domain/Account'
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
  const [cardsRes, bankRes] = await Promise.all([
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
  ])

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

function ordinal(day: number): string {
  const rem100 = day % 100
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
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
 * passes its own currently-filtered (search + type filter) tile list, so
 * this summary always matches what the grid below it shows. Each tile is
 * already ONE card's own latest statement (see `latestStatementFor` above),
 * so summing tiles can never double-count a card's older statements.
 * `nextDueDate` is the EARLIEST due date among included cards, never an
 * implication that the whole total is due on that one date.
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
 * Groups cards by their EXACT due date, not just day-of-month — two cards
 * due on the 25th of different months are never merged just because both
 * happen to land on "a 25th"; only cards sharing the identical date combine
 * into one line. Cards with nothing outstanding are excluded, not shown as
 * a zero-value line.
 */
function getCreditCardDueDateInsights(
  tiles: readonly AccountStatementTile[],
): CreditCardDueDateInsight[] {
  const cards = creditCardTilesWithStatement(tiles).filter(
    (t) => !!t.dueDate && (t.statementTotalAmountDue ?? 0) > 0,
  )
  const totals = new Map<string, number>()
  for (const t of cards) {
    totals.set(t.dueDate!, (totals.get(t.dueDate!) ?? 0) + (t.statementTotalAmountDue ?? 0))
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dueDate, amount]) => {
      // `dueDate` is a Postgres `date` column value ("YYYY-MM-DD") -- read
      // the day digits directly rather than through `Date`, so this can
      // never be shifted a day by the viewer's timezone (same reasoning
      // `lib/statementDate.ts`'s `parseDateOnly` documents).
      const day = Number(dueDate.slice(8, 10))
      return { dueDate, amount, label: `${formatINR(amount)} due by ${ordinal(day)} of the month.` }
    })
}

export const accountStatementsService = {
  getAccountStatementTiles,
  getAccountStatementsSummary,
  getCreditCardPaymentSummary,
  getCreditCardDueDateInsights,
}
