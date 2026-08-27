import type {
  StatementExplorerDetail,
  StatementSelectorOption,
  StatementTransactionRow,
} from '@/domain/StatementTransaction'
import type { OwnerType } from '@/domain/Transaction'
import { statementRepository } from '@/services/statements.service'
import { statementTransactionRepository } from '@/services/statement-transactions.service'
import { statementAnalyticsRepository } from '@/services/statement-analytics-repo.service'

/**
 * Statement Explorer (Statements module, Tab 2) — composes the existing
 * `statementRepository` (Statement Control's own data source, reused as-is)
 * with the new `statementTransactionRepository`. Never queries Supabase
 * directly; never sums `statement_transactions` into a figure that
 * duplicates `statements.total_debits`/`total_credits` — those authoritative
 * totals are read straight from the statement, not recalculated here.
 */

async function getStatementExplorerDetail(
  statementId: string,
): Promise<StatementExplorerDetail | null> {
  const statement = await statementRepository.getById(statementId)
  if (!statement) return null

  const identity = statement.account.id
    ? await statementTransactionRepository.getAccountIdentity(statement.account.id)
    : null

  const last4 = identity
    ? statement.account.kind === 'credit_card'
      ? identity.cardLast4
      : identity.accountLast4
    : null

  const creditLimit =
    statement.account.kind === 'credit_card' ? (identity?.creditLimit ?? null) : null
  // "As of this statement" available credit -- Credit Limit minus this
  // statement's own authoritative Total Amount Due. Scoped to the statement
  // being explored (not "today", which is Financial Pulse's separate,
  // real-time version of this same idea).
  const availableCredit =
    creditLimit !== null && statement.statementTotalAmountDue !== null
      ? Math.max(0, creditLimit - statement.statementTotalAmountDue)
      : null

  return {
    statement,
    accountName: identity?.accountName ?? statement.account.bankName,
    last4,
    cardNetwork: identity?.cardNetwork ?? statement.account.cardNetwork ?? null,
    creditLimit,
    availableCredit,
    accountHolder: identity?.accountHolder ?? statement.account.accountHolder ?? null,
  }
}

/** Populates the top statement-selector dropdown — every statement, most recent cycle first. */
async function getStatementSelectorOptions(): Promise<StatementSelectorOption[]> {
  const { rows } = await statementRepository.list({
    page: 1,
    pageSize: 200,
    sort: { id: 'statementPeriodEnd', desc: true },
  })
  return rows.map((s) => ({
    id: s.id,
    // Holder-first — see the STATEMENT EXPLORER — STATEMENT SELECTOR spec:
    // priority order is Holder, then Bank, then Last 4, then Statement
    // Period, and holder must never be dropped for width. 'UNASSIGNED' (not
    // a guessed value) when accountHolder is genuinely unset.
    label: `${(s.account.accountHolder ?? 'Unassigned').toUpperCase()} · ${s.account.bankName} •••• ${s.account.last4} — ${s.statementPeriodLabel}`,
  }))
}

/**
 * Every row in a single-statement view shares the same account, so its
 * accountHolder is resolved once from the statement itself (already fetched
 * by callers via `getStatementExplorerDetail`) rather than re-resolved per
 * row — cheaper than the "All Statements" per-row map below, and correct
 * either way since there's only one account in play here.
 */
async function getStatementTransactions(statementId: string): Promise<StatementTransactionRow[]> {
  const [rows, statement] = await Promise.all([
    statementTransactionRepository.listByStatement(statementId),
    statementRepository.getById(statementId),
  ])
  const accountHolder = statement?.account.accountHolder ?? null
  return rows.map((row) => ({ ...row, accountHolder }))
}

/**
 * Every statement_transactions row across every statement — backs
 * Statement Explorer's "All Statements" mode (`/statements/explorer`, no
 * `:statementId`), which Statement Analytics drill-downs navigate into.
 * Reuses `statementAnalyticsRepository` (same underlying table) rather than
 * duplicating a second "fetch everything" query here.
 *
 * Per-row accountHolder is resolved via statement_id -> statements.account_id
 * -> accounts.account_holder_name, the same statementId->account map
 * `statement-analytics.service.ts`'s `getAdaptedTransactions` builds for its
 * own per-row account resolution — not duplicated logic, just the same
 * technique applied to this module's own row shape.
 */
async function getAllStatementTransactions(): Promise<StatementTransactionRow[]> {
  const [rows, statementsRes] = await Promise.all([
    statementAnalyticsRepository.listAllTransactions(),
    statementRepository.list({ page: 1, pageSize: 500 }),
  ])
  const holderByStatementId = new Map<string, string | null>()
  for (const s of statementsRes.rows) holderByStatementId.set(s.id, s.account.accountHolder)
  return rows.map((row) => ({
    ...row,
    accountHolder: holderByStatementId.get(row.statementId) ?? null,
  }))
}

async function updateStatementTransactionCategory(id: string, category: string): Promise<void> {
  return statementTransactionRepository.updateCategory(id, category)
}

async function updateStatementTransactionClient(
  id: string,
  clientId: string | null,
): Promise<void> {
  return statementTransactionRepository.updateClient(id, clientId)
}

async function updateStatementTransactionOwnerType(
  id: string,
  ownerType: OwnerType,
): Promise<void> {
  return statementTransactionRepository.updateOwnerType(id, ownerType)
}

export const statementExplorerService = {
  getStatementExplorerDetail,
  getStatementSelectorOptions,
  getStatementTransactions,
  getAllStatementTransactions,
  updateStatementTransactionCategory,
  updateStatementTransactionClient,
  updateStatementTransactionOwnerType,
}
