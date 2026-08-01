import type { Transaction, TransactionStatus } from '@/types/transaction'
import {
  mockAccounts,
  mockCategories,
  mockClients,
  mockMerchants,
} from '@/repositories/mock-data/reference-data'

// Deterministic PRNG (mulberry32) so the mock dataset is stable across
// reloads and test runs instead of re-randomizing every time.
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

const random = mulberry32(20260801)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

const statusWeights: readonly [TransactionStatus, number][] = [
  ['reviewed', 40],
  ['verified', 20],
  ['pending_review', 15],
  ['uncategorized', 12],
  ['flagged', 8],
  ['duplicate', 5],
]

function pickStatus(): TransactionStatus {
  const total = statusWeights.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [status, weight] of statusWeights) {
    if (roll < weight) return status
    roll -= weight
  }
  return 'reviewed'
}

const notesPool = [
  'Monthly server scaling',
  'Team meeting coffee',
  'Airport commute',
  'Database backup nodes',
  'Client kickoff dinner',
  'Quarterly filing',
  'Annual subscription renewal',
  'Reimbursable — see receipt',
]

function generateTransaction(index: number): Transaction {
  const daysAgo = Math.floor(random() * 150)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  const status = pickStatus()
  const merchant = pick(mockMerchants)
  const account = pick(mockAccounts)
  const category = status === 'uncategorized' ? null : pick(mockCategories)
  const client = random() > 0.15 ? pick(mockClients) : null
  const amount = Math.round((random() * 145000 + 250) * 100) / 100

  return {
    id: `txn-${index.toString().padStart(4, '0')}`,
    date: date.toISOString().slice(0, 10),
    merchant,
    category,
    client,
    account,
    ownerType: random() > 0.25 ? 'business' : 'personal',
    type: random() > 0.08 ? 'debit' : 'credit',
    amount,
    status,
    notes: random() > 0.6 ? pick(notesPool) : null,
    duplicateOfId: null,
  }
}

const TRANSACTION_COUNT = 320

export const mockTransactions: readonly Transaction[] = Array.from(
  { length: TRANSACTION_COUNT },
  (_, i) => generateTransaction(i + 1),
).sort((a, b) => b.date.localeCompare(a.date))
