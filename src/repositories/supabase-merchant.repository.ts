import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MerchantCreateInput,
  MerchantListParams,
  MerchantListResult,
  MerchantRecord,
  MerchantSummary,
  MerchantUpdateInput,
} from '@/domain/Merchant'
import type { MerchantRepository } from '@/repositories/merchant.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Reads `vw_merchants` (merchant_memory joined with categories and computed
 * transaction_count/total_spend/last_transaction_at — see
 * DATABASE_MIGRATIONS.sql Phase 7). Writes go directly to `merchant_memory`,
 * scoped by RLS (`own_merchant_memory_all`: auth.uid() = user_id). Unlike
 * categories, all 79 live merchant_memory rows already belong to the
 * authenticated dev user (verified during the Database Foundation phase),
 * so read/update/delete work against real data without the ownership gap
 * Categories has.
 *
 * `lookup_merchant` / `upsert_merchant_memory` (Workflow C's production
 * functions) are untouched — this repository only reads/writes the table
 * directly for the UI's own CRUD, per instruction.
 *
 * `defaultCategory` fallback: `vw_merchants` only resolves a category via
 * the `default_category_id` FK (never populated by Workflow C — it writes
 * the free-text `merchant_memory.category` column only, per its own data
 * contract, see MODULE12B_N8N_AUDIT.md). Rather than showing "no category"
 * for every merchant Workflow C has actually categorized, `defaultCategory`
 * falls back to that free-text value when the FK is unresolved. This is a
 * display fallback only — no schema change, no fabricated FK, and no write
 * ever sets `default_category_id` from this fallback. The fallback
 * category's `id` is synthesized as its own name (same pattern already
 * used for Clients' topCategories/topMerchants), since there is no real
 * `categories.id` to point at.
 */

export type MerchantRow = {
  id: string
  display_name: string | null
  normalized_merchant: string
  aliases: string[] | null
  default_category_id: string | null
  default_category_name: string | null
  status: string | null
  notes: string | null
  has_rules: boolean | null
  transaction_count: number | string | null
  total_spend: number | string | null
  last_transaction_at: string | null
}

/** Exported for unit testing the category-fallback mapping (see tests/unit/supabase-merchant.repository.test.ts) — not used outside this module otherwise. */
export function mapRow(row: MerchantRow, fallbackCategoryName?: string | null): MerchantRecord {
  const transactionCount = Number(row.transaction_count ?? 0)
  const totalSpend = Number(row.total_spend ?? 0)
  const defaultCategory =
    row.default_category_id && row.default_category_name
      ? { id: row.default_category_id, name: row.default_category_name }
      : fallbackCategoryName
        ? { id: fallbackCategoryName, name: fallbackCategoryName }
        : null
  return {
    id: row.id,
    name: row.display_name ?? row.normalized_merchant,
    aliases: row.aliases ?? [],
    defaultCategory,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    notes: row.notes,
    hasRules: row.has_rules ?? false,
    transactionCount,
    totalSpend,
    averageTransaction: transactionCount > 0 ? totalSpend / transactionCount : 0,
    lastTransactionAt: row.last_transaction_at,
  }
}

const MERCHANT_SORT_COLUMN: Record<NonNullable<MerchantListParams['sort']>['id'], string> = {
  name: 'display_name',
  transactionCount: 'transaction_count',
  totalSpend: 'total_spend',
  averageTransaction: 'total_spend',
  lastTransactionAt: 'last_transaction_at',
}

export class SupabaseMerchantRepository implements MerchantRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: MerchantListParams): Promise<MerchantListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client.from('vw_merchants').select('*', { count: 'exact' })

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,normalized_merchant.ilike.%${search}%`)
    }
    if (filters?.categoryId) {
      query = query.eq('default_category_id', filters.categoryId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.hasRules !== undefined) {
      query = query.eq('has_rules', filters.hasRules)
    }
    if (filters?.minTransactionCount !== undefined) {
      query = query.gte('transaction_count', filters.minTransactionCount)
    }
    if (filters?.maxTransactionCount !== undefined) {
      query = query.lte('transaction_count', filters.maxTransactionCount)
    }

    const sortColumn = sort ? MERCHANT_SORT_COLUMN[sort.id] : 'display_name'
    query = query.order(sortColumn, { ascending: !sort?.desc })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list merchants: ${error.message}`)

    const rows = (data ?? []) as MerchantRow[]
    const unresolvedIds = rows.filter((r) => !r.default_category_id).map((r) => r.id)
    const fallbackById = await this.fetchCategoryFallback(unresolvedIds)

    return {
      rows: rows.map((row) => mapRow(row, fallbackById.get(row.id))),
      total: count ?? 0,
    }
  }

  /**
   * Free-text `merchant_memory.category` for rows whose `default_category_id`
   * FK is unresolved — `vw_merchants` doesn't expose this column at all
   * (only the FK-joined name), so it's fetched separately from the base
   * table. See the class-level doc comment for why this fallback exists.
   */
  private async fetchCategoryFallback(ids: readonly string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (ids.length === 0) return map
    const { data, error } = await this.client
      .from('merchant_memory')
      .select('id,category')
      .in('id', ids)
    if (error) throw new Error(`Failed to load merchant category fallback: ${error.message}`)
    for (const row of (data ?? []) as Array<{ id: string; category: string | null }>) {
      if (row.category) map.set(row.id, row.category)
    }
    return map
  }

  async getSummary(): Promise<MerchantSummary> {
    const [totalRes, activeRes, uncategorizedRes, spendRes] = await Promise.all([
      this.client.from('merchant_memory').select('*', { count: 'exact', head: true }),
      this.client
        .from('merchant_memory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      this.client
        .from('merchant_memory')
        .select('*', { count: 'exact', head: true })
        .is('default_category_id', null),
      this.client.from('vw_merchants').select('total_spend'),
    ])
    for (const r of [totalRes, activeRes, uncategorizedRes, spendRes]) {
      if (r.error) throw new Error(`Failed to load merchant summary: ${r.error.message}`)
    }

    const totalSpend = (spendRes.data ?? []).reduce(
      (sum, row) => sum + Number((row as { total_spend: number | string | null }).total_spend ?? 0),
      0,
    )

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count: transactionsThisMonth, error: monthError } = await this.client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('transaction_date', monthStart)
    if (monthError) throw new Error(`Failed to load merchant summary: ${monthError.message}`)

    return {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      uncategorized: uncategorizedRes.count ?? 0,
      totalSpend,
      transactionsThisMonth: transactionsThisMonth ?? 0,
    }
  }

  async create(input: MerchantCreateInput): Promise<MerchantRecord> {
    const userId = await getCurrentUserId()

    let categoryName = 'Uncategorized'
    if (input.defaultCategoryId) {
      const { data: category } = await this.client
        .from('categories')
        .select('name')
        .eq('id', input.defaultCategoryId)
        .maybeSingle()
      if (category?.name) categoryName = category.name
    }

    const normalized = input.name.trim().toUpperCase()

    const { data, error } = await this.client
      .from('merchant_memory')
      .insert({
        user_id: userId,
        normalized_merchant: normalized,
        display_name: input.name,
        category: categoryName,
        default_category_id: input.defaultCategoryId,
        status: input.status,
        notes: input.notes,
        has_rules: false,
        confidence: 100,
      })
      .select('*, default_category:default_category_id(name)')
      .single()

    if (error) throw new Error(`Failed to create merchant: ${error.message}`)

    return mapRow(
      {
        ...data,
        default_category_name:
          (data as { default_category?: { name: string } | null }).default_category?.name ?? null,
        transaction_count: 0,
        total_spend: 0,
      } as MerchantRow,
      (data as { category?: string | null }).category,
    )
  }

  async update(id: string, input: MerchantUpdateInput): Promise<MerchantRecord> {
    const { data, error } = await this.client
      .from('merchant_memory')
      .update({
        display_name: input.name,
        default_category_id: input.defaultCategoryId,
        status: input.status,
        notes: input.notes,
      })
      .eq('id', id)
      .select('*, default_category:default_category_id(name)')
      .maybeSingle()

    if (error) throw new Error(`Failed to update merchant ${id}: ${error.message}`)
    if (!data) {
      throw new Error(
        `Merchant ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )
    }

    // transaction_count/total_spend aren't in this select — refetch via the
    // view so the returned record matches what list() would show.
    const { data: viewRow } = await this.client
      .from('vw_merchants')
      .select('*')
      .eq('id', id)
      .single()

    return mapRow(
      (viewRow ?? {
        ...data,
        default_category_name:
          (data as { default_category?: { name: string } | null }).default_category?.name ?? null,
        transaction_count: 0,
        total_spend: 0,
      }) as MerchantRow,
      (data as { category?: string | null }).category,
    )
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('merchant_memory')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) throw new Error(`Failed to delete merchant ${id}: ${error.message}`)
    if (!count) {
      throw new Error(
        `Merchant ${id} could not be deleted — it does not exist, or RLS denied the write.`,
      )
    }
  }
}
