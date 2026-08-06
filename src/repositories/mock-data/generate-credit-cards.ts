import type { CreditCardHealth, CreditCardRecord } from '@/domain/CreditCard'
import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import { mockCreditCards } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

// Deterministic PRNG (mulberry32) — same pattern as the other generate-*.ts
// files, own seed so the datasets don't shadow each other.
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

const random = mulberry32(20260804)

// Explicit per-card display name — reads far more like real connected cards
// than a slug-derived label, for all 16 cards in reference-data.ts.
const CARD_NAMES: Record<string, string> = {
  'cc-hdfc-corp-plat': 'HDFC Corporate Platinum',
  'cc-hdfc-biz-gold': 'HDFC Business Gold',
  'cc-icici-amex': 'ICICI Amex Corporate',
  'cc-icici-visa': 'ICICI Visa Signature',
  'cc-axis-magnus': 'Axis Magnus',
  'cc-axis-biz': 'Axis Business Card',
  'cc-kotak-white': 'Kotak White Reserve',
  'cc-kotak-corp': 'Kotak Corporate Card',
  'cc-sbi-prime': 'SBI Prime',
  'cc-sbi-elite': 'SBI Elite',
  'cc-amex-gold': 'American Express Gold',
  'cc-amex-plat': 'American Express Platinum',
  'cc-yes-marquee': 'Yes Bank Marquee',
  'cc-indusind-legend': 'IndusInd Legend',
  'cc-rbl-world': 'RBL World Safari',
  'cc-hsbc-premier': 'HSBC Premier',
}

// Module 7 (Clients) drill-down target — most cards belong to the business
// generally (null), a handful are tied to a specific client so "View Credit
// Cards" has real rows to show across several different clients.
const CARD_CLIENT_IDS: Record<string, string | null> = {
  'cc-hdfc-biz-gold': 'client-acme',
  'cc-axis-magnus': 'client-stellar',
  'cc-kotak-corp': 'client-vortex',
  'cc-amex-gold': 'client-finstrat',
  'cc-indusind-legend': 'client-solargrid',
}

const healthWeights: readonly [CreditCardHealth, number][] = [
  ['healthy', 50],
  ['due_soon', 20],
  ['high_utilization', 20],
  ['payment_overdue', 10],
]

function pickHealth(): CreditCardHealth {
  const total = healthWeights.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [health, weight] of healthWeights) {
    if (roll < weight) return health
    roll -= weight
  }
  return 'healthy'
}

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
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

interface UtilizationRange {
  readonly min: number
  readonly max: number
  readonly dueOffsetMin: number
  readonly dueOffsetMax: number
}

const HEALTH_PROFILE: Record<CreditCardHealth, UtilizationRange> = {
  healthy: { min: 0.1, max: 0.45, dueOffsetMin: 10, dueOffsetMax: 25 },
  due_soon: { min: 0.3, max: 0.7, dueOffsetMin: 1, dueOffsetMax: 5 },
  high_utilization: { min: 0.75, max: 0.98, dueOffsetMin: 8, dueOffsetMax: 20 },
  payment_overdue: { min: 0.4, max: 0.9, dueOffsetMin: -10, dueOffsetMax: -1 },
}

function generateCreditCard(card: (typeof mockCreditCards)[number]): CreditCardRecord {
  const cardTransactions = mockTransactions.filter((txn) => txn.account.id === card.id)
  const thisMonthTxns = cardTransactions.filter((txn) => isThisMonth(txn.date))
  const monthlySpend = thisMonthTxns
    .filter((txn) => txn.type === 'debit')
    .reduce((sum, txn) => sum + txn.amount, 0)

  const topMerchant = mostFrequent<Merchant>(cardTransactions.map((txn) => txn.merchant))
  const topCategory = mostFrequent<Category>(
    cardTransactions.flatMap((txn) => (txn.category ? [txn.category] : [])),
  )
  const lastTransactionAt = cardTransactions.reduce<string | null>(
    (latest, txn) => (!latest || txn.date > latest ? txn.date : latest),
    null,
  )

  const health = pickHealth()
  const profile = HEALTH_PROFILE[health]

  const creditLimit = Math.round((random() * 1_400_000 + 300_000) * 100) / 100
  const utilizationPercent =
    Math.round((profile.min + random() * (profile.max - profile.min)) * 1000) / 10
  const outstanding = Math.round(((creditLimit * utilizationPercent) / 100) * 100) / 100
  const availableCredit = Math.max(0, Math.round((creditLimit - outstanding) * 100) / 100)
  const minimumDue = Math.round(outstanding * 0.05 * 100) / 100

  const dueOffset =
    profile.dueOffsetMin + Math.floor(random() * (profile.dueOffsetMax - profile.dueOffsetMin + 1))
  const dueDate = isoDaysFromNow(dueOffset)
  const statementDate = isoDaysFromNow(dueOffset - 20)

  return {
    id: card.id,
    bankName: card.bankName,
    cardName: CARD_NAMES[card.id] ?? `${card.bankName} Card`,
    nickname: null,
    network: card.cardNetwork ?? 'VISA',
    last4: card.last4,
    maskedNumber: `•••• •••• •••• ${card.last4}`,
    creditLimit,
    outstanding,
    availableCredit,
    utilizationPercent,
    statementDate,
    dueDate,
    minimumDue,
    monthlySpend,
    topMerchant,
    topCategory,
    lastTransactionAt,
    health,
    status: 'active',
    notes: null,
    clientId: CARD_CLIENT_IDS[card.id] ?? null,
  }
}

export const mockCreditCardRecords: readonly CreditCardRecord[] =
  mockCreditCards.map(generateCreditCard)
