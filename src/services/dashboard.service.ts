import type {
  AccountKind,
  AccountStatus,
  BankAccountType,
  ConnectedAccount,
} from '@/domain/Account'
import type {
  FinancialSnapshotMetric,
  QuickAction,
  RecentTransaction,
  RecentTransactionStatus,
  ResolutionQueueItem,
} from '@/domain/Dashboard'
import type { BankAccountHealth } from '@/domain/Account'
import type { CreditCardHealth, CreditCardPosition } from '@/domain/CreditCard'
import type { Statement } from '@/domain/Statement'
import type { Transaction, TransactionStatus } from '@/domain/Transaction'
import { transactionRepository } from '@/services/transactions.service'
import { bankAccountRepository } from '@/services/accounts.service'
import { creditCardRepository } from '@/services/credit-cards.service'
import { statementRepository } from '@/services/statements.service'
import { getFinancialPulsePeriod, formatPeriodLabel } from '@/lib/financialPulsePeriod'

/**
 * Financial Pulse (formerly "Dashboard") — the user's real-time
 * current-period spend/inflow view, not a monthly accounting report. Reads
 * real Supabase data via the same repositories every other module uses —
 * no direct Supabase access from this file, per CLAUDE.md's service-layer
 * rule. File/hook names are left as `dashboard.*`/`useDashboard` (internal
 * identifiers, route stays `/`) — only user-facing text changed; renaming
 * files was not required to satisfy "no 'Dashboard' anywhere in the
 * visible UI" and CLAUDE.md prefers not renaming modules without need.
 *
 * Single transaction source rule: every calculation here reads
 * `public.transactions` only, via `transactionRepository`. `statement_transactions`
 * is never summed into these figures — see DATABASE_MIGRATIONS.sql / the
 * frontend data contract doc for why (statement-level reporting has its
 * own separate future home, not this page).
 *
 * `getQuickActions` is intentionally unchanged — static navigation, not data.
 */

function dateLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function relativeSyncLabel(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Unknown'
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

const BANK_HEALTH_TO_STATUS: Record<BankAccountHealth, AccountStatus> = {
  healthy: 'active',
  low_balance: 'urgent',
  needs_review: 'urgent',
  sync_required: 'syncing',
}

const CARD_HEALTH_TO_STATUS: Record<CreditCardHealth, AccountStatus> = {
  healthy: 'active',
  due_soon: 'urgent',
  high_utilization: 'urgent',
  payment_overdue: 'urgent',
}

const BANK_TYPE_LABEL: Record<BankAccountType, string> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'Overdraft',
}

const RECENT_STATUS_MAP: Record<TransactionStatus, RecentTransactionStatus> = {
  reviewed: 'processed',
  verified: 'processed',
  pending_review: 'pending',
  uncategorized: 'flagged',
  flagged: 'flagged',
  duplicate: 'flagged',
}

interface PeriodActivity {
  readonly spend: number
  readonly inflow: number
  readonly count: number
}

const EMPTY_ACTIVITY: PeriodActivity = { spend: 0, inflow: 0, count: 0 }

/** Sums real `transactions` rows for one account's own current period. Never reads statement_transactions. */
async function fetchPeriodActivity(
  accountFilter: { bankAccountId: string } | { creditCardId: string },
  dateFrom: string,
  dateTo: string,
): Promise<PeriodActivity> {
  const { rows } = await transactionRepository.list({
    page: 1,
    pageSize: 1000,
    filters: { ...accountFilter, dateFrom, dateTo },
  })
  let spend = 0
  let inflow = 0
  for (const t of rows) {
    if (t.type === 'debit') spend += t.amount
    else inflow += t.amount
  }
  return { spend, inflow, count: rows.length }
}

/** The account's OWN latest statement's cycle-end date — never a global "latest statement across all accounts". */
async function latestStatementPeriodEnd(accountId: string): Promise<string | null> {
  const { rows } = await statementRepository.list({
    page: 1,
    pageSize: 1,
    filters: { accountId },
    sort: { id: 'statementPeriodEnd', desc: true },
  })
  return rows[0]?.statementPeriodEnd ?? null
}

/**
 * Full latest statement for ONE account, for the Credit Card drawer's
 * "Last Statement" section — fetched only when that drawer opens, never
 * during initial Financial Pulse load (which only needs `statementPeriodEnd`,
 * via `latestStatementPeriodEnd` above, for period math). Reuses the same
 * "account's own latest statement" sort as that function.
 */
async function getLatestStatementForAccount(accountId: string): Promise<Statement | null> {
  const { rows } = await statementRepository.list({
    page: 1,
    pageSize: 1,
    filters: { accountId },
    sort: { id: 'statementPeriodEnd', desc: true },
  })
  return rows[0] ?? null
}

/**
 * Raw nullable credit-position fields for the Credit Card drawer's "Credit
 * Position" section. Deliberately bypasses `creditCardRepository.list()`'s
 * mapping, which fabricates 0/'VISA' for genuinely-null DB values as a
 * disclosed display fallback for tile/list views — the drawer must show
 * "—" for unknown data instead, per explicit instruction.
 */
async function getCreditPosition(cardId: string): Promise<CreditCardPosition> {
  return creditCardRepository.getCreditPosition(cardId)
}

/** Financial Pulse drawer's inline credit-limit edit — see `CreditCardRepository.updateCreditLimit`'s doc comment for why this is a narrow write, not the full `update()`. */
async function updateCreditLimit(cardId: string, creditLimit: number): Promise<CreditCardPosition> {
  return creditCardRepository.updateCreditLimit(cardId, creditLimit)
}

async function buildBankAccountCards(): Promise<ConnectedAccount[]> {
  const { rows } = await bankAccountRepository.list({ page: 1, pageSize: 50 })
  return Promise.all(
    rows.map(async (a) => {
      const period = getFinancialPulsePeriod('bank', null)
      const activity = period.available
        ? await fetchPeriodActivity({ bankAccountId: a.id }, period.startDate!, period.endDate)
        : EMPTY_ACTIVITY
      return {
        id: a.id,
        kind: 'bank',
        name: a.nickname || a.accountName,
        maskedNumber: a.maskedAccountNumber,
        balance: a.currentBalance,
        status: BANK_HEALTH_TO_STATUS[a.health],
        lastSyncedLabel: relativeSyncLabel(a.lastSyncAt),
        inflow: activity.inflow,
        outflow: activity.spend,
        periodLabel: formatPeriodLabel(period),
        periodAvailable: period.available,
        transactionCount: activity.count,
        institutionName: a.bankName,
        accountTypeLabel: BANK_TYPE_LABEL[a.accountType],
      } satisfies ConnectedAccount
    }),
  )
}

async function buildCreditCardCards(): Promise<ConnectedAccount[]> {
  const { rows } = await creditCardRepository.list({ page: 1, pageSize: 50 })
  return Promise.all(
    rows.map(async (c) => {
      const periodEnd = await latestStatementPeriodEnd(c.id)
      const period = getFinancialPulsePeriod('credit_card', periodEnd)
      const activity = period.available
        ? await fetchPeriodActivity({ creditCardId: c.id }, period.startDate!, period.endDate)
        : EMPTY_ACTIVITY
      return {
        id: c.id,
        kind: 'credit_card',
        name: c.nickname || c.cardName,
        maskedNumber: c.maskedNumber,
        balance: c.outstanding,
        status: CARD_HEALTH_TO_STATUS[c.health],
        // Tracked for completeness, but never rendered and never summed
        // into the consolidated Inflow metric — credit cards are Spend-only
        // per explicit instruction (see getFinancialSnapshot below).
        inflow: activity.inflow,
        outflow: activity.spend,
        periodLabel: formatPeriodLabel(period),
        periodAvailable: period.available,
        transactionCount: activity.count,
        institutionName: c.bankName,
        accountTypeLabel: 'Credit Card',
      } satisfies ConnectedAccount
    }),
  )
}

async function getFinancialSnapshot(): Promise<FinancialSnapshotMetric[]> {
  const [bankAccounts, creditCards] = await Promise.all([
    buildBankAccountCards(),
    buildCreditCardCards(),
  ])
  // Spend: every connected account/card. Inflow: Savings/Current/Overdraft
  // ONLY — credit cards never contribute, by explicit instruction, not just
  // by convention. Enforced by account_type (bankAccounts vs creditCards
  // are already two separate, correctly-typed arrays), not by inferring it
  // from transaction_type alone.
  const totalSpend = [...bankAccounts, ...creditCards].reduce((sum, a) => sum + (a.outflow ?? 0), 0)
  const totalInflow = bankAccounts.reduce((sum, a) => sum + (a.inflow ?? 0), 0)

  return [
    { id: 'spend', label: 'Spend', value: totalSpend },
    { id: 'inflow', label: 'Inflow', value: totalInflow },
  ]
}

async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  return buildBankAccountCards()
}

async function getCreditCards(): Promise<ConnectedAccount[]> {
  return buildCreditCardCards()
}

async function getResolutionQueue(): Promise<ResolutionQueueItem[]> {
  const { rows } = await transactionRepository.list({
    page: 1,
    pageSize: 5,
    sort: { id: 'date', desc: true },
    filters: { status: 'uncategorized' },
  })
  return rows.map((t) => ({
    id: t.id,
    reason: 'uncategorized',
    reasonLabel: 'Uncategorized',
    description: t.merchant.name,
    amount: t.amount,
    flaggedOnLabel: dateLabel(t.date),
  }))
}

function accountLabel(t: Transaction): string {
  return `${t.account.bankName} ••••${t.account.last4}`
}

function toRecentTransaction(t: Transaction): RecentTransaction {
  return {
    id: t.id,
    dateLabel: dateLabel(t.date),
    account: accountLabel(t),
    type: t.type,
    merchant: t.merchant.name,
    category: t.category?.name ?? 'Uncategorized',
    amount: t.amount,
    status: RECENT_STATUS_MAP[t.status],
  }
}

async function getRecentTransactions(): Promise<RecentTransaction[]> {
  const { rows } = await transactionRepository.list({
    page: 1,
    pageSize: 5,
    sort: { id: 'date', desc: true },
  })
  return rows.map(toRecentTransaction)
}

const DRAWER_LIST_LIMIT = 10

interface AccountPeriodContext {
  readonly id: string
  readonly kind: AccountKind
  readonly dateFrom: string | null
  readonly dateTo: string
  readonly available: boolean
}

/**
 * Every connected account/card's own current Financial Pulse period —
 * shared by the consolidated Spend/Inflow drawers below, so their "latest
 * 10" lists only ever include transactions that actually fall inside the
 * same period the Summary figure above them was computed from. (An earlier
 * version queried `transactions` globally with no period filter — caught
 * live: a card with no statement yet still showed a transaction in the
 * list, which the Summary total correctly excludes. That's why this exists.)
 */
async function getAccountPeriodContexts(): Promise<AccountPeriodContext[]> {
  const [bankRes, cardRes] = await Promise.all([
    bankAccountRepository.list({ page: 1, pageSize: 50 }),
    creditCardRepository.list({ page: 1, pageSize: 50 }),
  ])

  const bankContexts: AccountPeriodContext[] = bankRes.rows.map((a) => {
    const period = getFinancialPulsePeriod('bank', null)
    return {
      id: a.id,
      kind: 'bank',
      dateFrom: period.startDate,
      dateTo: period.endDate,
      available: period.available,
    }
  })

  const cardContexts: AccountPeriodContext[] = await Promise.all(
    cardRes.rows.map(async (c) => {
      const periodEnd = await latestStatementPeriodEnd(c.id)
      const period = getFinancialPulsePeriod('credit_card', periodEnd)
      return {
        id: c.id,
        kind: 'credit_card' as const,
        dateFrom: period.startDate,
        dateTo: period.endDate,
        available: period.available,
      }
    }),
  )

  return [...bankContexts, ...cardContexts]
}

function accountFilterFor(ctx: AccountPeriodContext) {
  return ctx.kind === 'credit_card' ? { creditCardId: ctx.id } : { bankAccountId: ctx.id }
}

function mergeNewestFirst(
  groups: readonly (readonly Transaction[])[],
  limit: number,
): Transaction[] {
  return groups
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

/**
 * Spend drawer — latest 10 debit transactions across every connected
 * account/card, each constrained to that account's own current period
 * (same periods `buildBankAccountCards`/`buildCreditCardCards` use), then
 * merged and re-sorted. `transactions` only. Fetched only when the drawer
 * opens (see useDashboard.ts), never as part of initial Financial Pulse
 * load — this is N+1-shaped (one query per account) but bounded by the
 * small number of connected accounts, and only runs on demand.
 */
async function getConsolidatedSpendTransactions(): Promise<RecentTransaction[]> {
  const contexts = await getAccountPeriodContexts()
  const perAccount = await Promise.all(
    contexts
      .filter((c) => c.available)
      .map(async (c) => {
        const { rows } = await transactionRepository.list({
          page: 1,
          pageSize: DRAWER_LIST_LIMIT,
          sort: { id: 'date', desc: true },
          filters: {
            ...accountFilterFor(c),
            type: 'debit',
            dateFrom: c.dateFrom!,
            dateTo: c.dateTo,
          },
        })
        return rows
      }),
  )
  return mergeNewestFirst(perAccount, DRAWER_LIST_LIMIT).map(toRecentTransaction)
}

/**
 * Inflow drawer — latest 10 credit transactions, Savings/Current/Overdraft
 * ONLY (credit-card contexts are never included in the source set at all —
 * not filtered out afterward), each constrained to that account's own
 * current period, merged and re-sorted.
 */
async function getConsolidatedInflowTransactions(): Promise<RecentTransaction[]> {
  const contexts = await getAccountPeriodContexts()
  const perAccount = await Promise.all(
    contexts
      .filter((c) => c.kind === 'bank' && c.available)
      .map(async (c) => {
        const { rows } = await transactionRepository.list({
          page: 1,
          pageSize: DRAWER_LIST_LIMIT,
          sort: { id: 'date', desc: true },
          filters: {
            ...accountFilterFor(c),
            type: 'credit',
            dateFrom: c.dateFrom!,
            dateTo: c.dateTo,
          },
        })
        return rows
      }),
  )
  return mergeNewestFirst(perAccount, DRAWER_LIST_LIMIT).map(toRecentTransaction)
}

/**
 * Account/card drawer — latest 10 transactions for ONE specific account,
 * no date/period filter (this is "recent activity", separate from the
 * period-scoped Spend/Inflow summary shown above it in the same drawer,
 * which reuses the already-computed tile figures instead of refetching).
 */
async function getAccountRecentTransactions(
  accountId: string,
  kind: AccountKind,
): Promise<RecentTransaction[]> {
  const { rows } = await transactionRepository.list({
    page: 1,
    pageSize: DRAWER_LIST_LIMIT,
    sort: { id: 'date', desc: true },
    filters: kind === 'credit_card' ? { creditCardId: accountId } : { bankAccountId: accountId },
  })
  return rows.map(toRecentTransaction)
}

const quickActions: QuickAction[] = [
  { id: 'add-transaction', label: 'Add Transaction', href: '/transactions' },
  { id: 'add-client', label: 'Add Client', href: '/clients' },
  { id: 'add-merchant', label: 'Add Merchant', href: '/merchants' },
  { id: 'new-report', label: 'New Report', href: '/analytics' },
]

async function getQuickActions(): Promise<QuickAction[]> {
  return quickActions
}

export const dashboardService = {
  getFinancialSnapshot,
  getConnectedAccounts,
  getCreditCards,
  getResolutionQueue,
  getRecentTransactions,
  getQuickActions,
  getConsolidatedSpendTransactions,
  getConsolidatedInflowTransactions,
  getAccountRecentTransactions,
  getLatestStatementForAccount,
  getCreditPosition,
  updateCreditLimit,
}
