import { describe, expect, it } from 'vitest'
import { categoriesToCsv, transactionsToCsv } from '@/utils/csv'
import type { Transaction } from '@/domain/Transaction'
import type { CategoryRecord } from '@/domain/Category'

const baseTransaction: Transaction = {
  id: 'txn-1',
  date: '2026-01-15',
  merchant: { id: 'm1', name: 'Amazon Web Services' },
  category: { id: 'c1', name: 'Cloud Infrastructure' },
  client: { id: 'cl1', name: 'Acme Corp' },
  account: {
    id: 'a1',
    kind: 'credit_card',
    bankName: 'HDFC Bank',
    cardNetwork: 'VISA',
    last4: '4292',
  },
  ownerType: 'business',
  type: 'debit',
  amount: 14299,
  status: 'reviewed',
  notes: null,
  duplicateOfId: null,
}

describe('transactionsToCsv', () => {
  it('includes a header row and one row per transaction', () => {
    const csv = transactionsToCsv([baseTransaction])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      'Date,Merchant,Category,Client,Bank/Card,Business/Personal,Amount,Status,Notes',
    )
    expect(lines[1]).toBe(
      '2026-01-15,Amazon Web Services,Cloud Infrastructure,Acme Corp,HDFC Bank 4292,business,14299.00,reviewed,',
    )
  })

  it('falls back to Uncategorized when category is null', () => {
    const csv = transactionsToCsv([{ ...baseTransaction, category: null }])
    expect(csv).toContain('Uncategorized')
  })

  it('quotes values containing commas', () => {
    const csv = transactionsToCsv([
      { ...baseTransaction, merchant: { id: 'm2', name: 'Foo, Bar & Co' } },
    ])
    expect(csv).toContain('"Foo, Bar & Co"')
  })
})

const baseCategory: CategoryRecord = {
  id: 'cat-1',
  name: 'Cloud Infrastructure',
  description: 'Cloud compute and hosting spend.',
  parentCategory: { id: 'cat-parent', name: 'Software/SaaS' },
  status: 'active',
  color: 'primary',
  icon: 'Cloud',
  transactionCount: 42,
  merchantsAssigned: 5,
  lastUpdatedAt: '2025-12-14',
}

describe('categoriesToCsv', () => {
  it('includes a header row and one row per category', () => {
    const csv = categoriesToCsv([baseCategory])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      'Category Name,Parent Category,Description,Transaction Count,Merchants Assigned,Status,Last Updated',
    )
    expect(lines[1]).toBe(
      'Cloud Infrastructure,Software/SaaS,Cloud compute and hosting spend.,42,5,active,2025-12-14',
    )
  })

  it('leaves parent category blank when there is none', () => {
    const csv = categoriesToCsv([{ ...baseCategory, parentCategory: null }])
    const lines = csv.split('\n')
    expect(lines[1].startsWith('Cloud Infrastructure,,')).toBe(true)
  })

  it('quotes descriptions containing commas', () => {
    const csv = categoriesToCsv([{ ...baseCategory, description: 'Compute, storage, and CDN' }])
    expect(csv).toContain('"Compute, storage, and CDN"')
  })
})
