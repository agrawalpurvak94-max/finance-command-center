import type { AccountStatementTile, AccountStatementsSummary } from '@/domain/AccountStatements'
import type { BankAccountType } from '@/domain/Account'
import type { Statement } from '@/domain/Statement'
import { bankAccountRepository } from '@/services/accounts.service'
import { creditCardRepository } from '@/services/credit-cards.service'
import { statementRepository } from '@/services/statements.service'

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

export const accountStatementsService = {
  getAccountStatementTiles,
  getAccountStatementsSummary,
}
