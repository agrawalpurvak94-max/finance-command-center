import type { BankAccountHealth, BankAccountRecord, BankAccountType } from '@/domain/Account'
import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import { mockBankAccounts } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

// Deterministic PRNG (mulberry32) — same pattern as
// generate-transactions.ts/generate-statements.ts, own seed so the three
// datasets don't shadow each other.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20260803)

// Explicit per-account authoring (type/nickname/clientId) rather than random
// pick — with only 5 accounts, this reads far more like real connected
// accounts than a randomly assigned label would, and guarantees all three
// supported account types (Savings/Current/Overdraft) actually appear.
// clientId is mostly null (most accounts belong to the business generally,
// not a specific client) — one account is tied to a client so Module 7's
// "View Accounts" drill-down has a real row to show.
const ACCOUNT_META: Record<
  string,
  { type: BankAccountType; nickname: string | null; clientId: string | null }
> = {
  'acct-hdfc-current': { type: 'current', nickname: 'Primary Operating Account', clientId: null },
  'acct-icici-current': {
    type: 'current',
    nickname: 'Vendor Payments Account',
    clientId: null,
  },
  'acct-axis-savings': { type: 'savings', nickname: 'Payroll Reserve', clientId: null },
  'acct-kotak-treasury': { type: 'overdraft', nickname: 'OD Facility', clientId: 'client-vortex' },
  'acct-sbi-current': { type: 'current', nickname: null, clientId: null },
}

const accountTypeLabel: Record<BankAccountType, string> = {
  savings: 'Savings Account',
  current: 'Current Account',
  overdraft: 'Overdraft Account',
}

const healthWeights: readonly [BankAccountHealth, number][] = [
  ['healthy', 55],
  ['low_balance', 15],
  ['sync_required', 15],
  ['needs_review', 15],
]

function pickHealth(): BankAccountHealth {
  const total = healthWeights.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [health, weight] of healthWeights) {
    if (roll < weight) return health
    roll -= weight
  }
  return 'healthy'
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function isThisMonth(date: string): boolean {
  const now = new Date()
  const txnDate = new Date(date)
  return txnDate.getFullYear() === now.getFullYear() && txnDate.getMonth() === now.getMonth()
}

function mostFrequent<T extends { id: string }>(items: readonly T[]): T | null {
  if (items.length === 0) return null
  const counts = new Map<string, { item: T; count: number }>()
  for (const item of items) {
    const existing = counts.get(item.id)
    counts.set(item.id, { item, count: (existing?.count ?? 0) + 1 })
  }
  let best: { item: T; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best?.item ?? null
}

function generateBankAccount(account: (typeof mockBankAccounts)[number]): BankAccountRecord {
  const meta = ACCOUNT_META[account.id] ?? {
    type: 'current' as BankAccountType,
    nickname: null,
    clientId: null,
  }
  const accountTransactions = mockTransactions.filter((txn) => txn.account.id === account.id)
  const thisMonthTxns = accountTransactions.filter((txn) => isThisMonth(txn.date))

  const monthlyCredits = thisMonthTxns
    .filter((txn) => txn.type === 'credit')
    .reduce((sum, txn) => sum + txn.amount, 0)
  const monthlyDebits = thisMonthTxns
    .filter((txn) => txn.type === 'debit')
    .reduce((sum, txn) => sum + txn.amount, 0)

  const topMerchant = mostFrequent<Merchant>(accountTransactions.map((txn) => txn.merchant))
  const topCategory = mostFrequent<Category>(
    accountTransactions.flatMap((txn) => (txn.category ? [txn.category] : [])),
  )

  const lastTransactionAt = accountTransactions.reduce<string | null>(
    (latest, txn) => (!latest || txn.date > latest ? txn.date : latest),
    null,
  )

  const currentBalance = Math.round((random() * 4_500_000 + 150_000) * 100) / 100
  const holdAmount = Math.round(random() * 80_000 * 100) / 100
  const availableBalance = Math.max(0, currentBalance - holdAmount)

  const health = pickHealth()
  const lastSyncAt =
    health === 'sync_required' ? daysAgoIso(4 + Math.floor(random() * 5)) : daysAgoIso(0)

  return {
    id: account.id,
    bankName: account.bankName,
    accountName: `${account.bankName} ${accountTypeLabel[meta.type]}`,
    nickname: meta.nickname,
    accountType: meta.type,
    last4: account.last4,
    maskedAccountNumber: `•••• •••• ${account.last4}`,
    currentBalance,
    availableBalance,
    monthlyCredits,
    monthlyDebits,
    topMerchant,
    topCategory,
    recentActivityCount: accountTransactions.filter((txn) => {
      const daysSince = (Date.now() - new Date(txn.date).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 30
    }).length,
    lastSyncAt,
    lastTransactionAt,
    health,
    status: 'active',
    notes: null,
    clientId: meta.clientId,
  }
}

export const mockBankAccountRecords: readonly BankAccountRecord[] =
  mockBankAccounts.map(generateBankAccount)
