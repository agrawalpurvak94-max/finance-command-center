import { describe, expect, it } from 'vitest'
import { mapRow, type MerchantRow } from '@/repositories/supabase-merchant.repository'

function baseRow(overrides: Partial<MerchantRow> = {}): MerchantRow {
  return {
    id: 'merchant-1',
    display_name: 'BigBasket',
    normalized_merchant: 'BIGBASKET',
    aliases: [],
    default_category_id: null,
    default_category_name: null,
    status: 'active',
    notes: null,
    has_rules: false,
    transaction_count: 0,
    total_spend: 0,
    last_transaction_at: null,
    ...overrides,
  }
}

describe('supabase-merchant.repository mapRow — default category fallback', () => {
  it('uses the resolved FK category when default_category_id/name are both present', () => {
    const row = baseRow({ default_category_id: 'cat-123', default_category_name: 'Groceries' })
    const record = mapRow(row, 'Groceries')
    expect(record.defaultCategory).toEqual({ id: 'cat-123', name: 'Groceries' })
  })

  it('falls back to the free-text merchant_memory.category when the FK is unresolved', () => {
    const row = baseRow({ default_category_id: null, default_category_name: null })
    const record = mapRow(row, 'Groceries')
    expect(record.defaultCategory).toEqual({ id: 'Groceries', name: 'Groceries' })
  })

  it('returns null when the FK is unresolved and there is no free-text category either', () => {
    const row = baseRow({ default_category_id: null, default_category_name: null })
    const record = mapRow(row, null)
    expect(record.defaultCategory).toBeNull()
  })

  it('returns null when no fallback argument is passed at all', () => {
    const row = baseRow({ default_category_id: null, default_category_name: null })
    const record = mapRow(row)
    expect(record.defaultCategory).toBeNull()
  })

  it('never fabricates a category — an empty-string fallback is treated as absent', () => {
    const row = baseRow({ default_category_id: null, default_category_name: null })
    const record = mapRow(row, '')
    expect(record.defaultCategory).toBeNull()
  })

  it('prefers the resolved FK over the fallback even if both are present', () => {
    const row = baseRow({ default_category_id: 'cat-123', default_category_name: 'Groceries' })
    const record = mapRow(row, 'SomeStaleFreeTextValue')
    expect(record.defaultCategory).toEqual({ id: 'cat-123', name: 'Groceries' })
  })
})
