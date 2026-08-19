import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_COLORS } from '@/domain/Category'
import type {
  CategoryColor,
  CategoryCreateInput,
  CategoryListParams,
  CategoryListResult,
  CategoryRecord,
  CategorySummary,
  CategoryUpdateInput,
} from '@/domain/Category'
import type { CategoryRepository } from '@/repositories/category.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Reads `vw_categories` (categories joined with computed transaction_count/
 * merchants_assigned — see DATABASE_MIGRATIONS.sql Phase 7). Writes go
 * directly to the `categories` table, scoped by RLS (`own_cat_all`:
 * auth.uid() = user_id for ALL commands; `read_default_categories`: anyone
 * may SELECT rows where user_id IS NULL).
 *
 * Known RLS consequence, not a bug: all 24 live categories currently have
 * user_id = NULL (global/default categories, matching how the existing n8n
 * "Load categories" node already treats them). `own_cat_all` only grants
 * UPDATE/DELETE on rows the authenticated user owns, so editing or deleting
 * one of the 24 default categories will be rejected by RLS (zero rows
 * affected) until that category's ownership model is revisited — only
 * categories this user creates going forward are editable/deletable by
 * them. See MODULE12A_SUPABASE_INTEGRATION_REPORT.md.
 */

type CategoryRow = {
  id: string
  name: string
  description: string | null
  parent_category_id: string | null
  parent_category_name: string | null
  status: string | null
  color: string | null
  icon: string | null
  transaction_count: number | string | null
  merchants_assigned: number | string | null
  updated_at: string | null
}

function toCategoryColor(color: string | null): CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(color ?? '')
    ? (color as CategoryColor)
    : 'primary'
}

function mapRow(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    parentCategory:
      row.parent_category_id && row.parent_category_name
        ? { id: row.parent_category_id, name: row.parent_category_name }
        : null,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    color: toCategoryColor(row.color),
    icon: row.icon ?? 'tag',
    transactionCount: Number(row.transaction_count ?? 0),
    merchantsAssigned: Number(row.merchants_assigned ?? 0),
    lastUpdatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

const CATEGORY_SORT_COLUMN: Record<NonNullable<CategoryListParams['sort']>['id'], string> = {
  name: 'name',
  transactionCount: 'transaction_count',
  merchantsAssigned: 'merchants_assigned',
  lastUpdatedAt: 'updated_at',
}

export class SupabaseCategoryRepository implements CategoryRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: CategoryListParams): Promise<CategoryListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client.from('vw_categories').select('*', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.parentCategoryId) {
      query = query.eq('parent_category_id', filters.parentCategoryId)
    }
    if (filters?.minTransactionCount !== undefined) {
      query = query.gte('transaction_count', filters.minTransactionCount)
    }
    if (filters?.maxTransactionCount !== undefined) {
      query = query.lte('transaction_count', filters.maxTransactionCount)
    }

    const sortColumn = sort ? CATEGORY_SORT_COLUMN[sort.id] : 'name'
    query = query.order(sortColumn, { ascending: !sort?.desc })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list categories: ${error.message}`)

    return { rows: (data ?? []).map((row) => mapRow(row as CategoryRow)), total: count ?? 0 }
  }

  async getSummary(): Promise<CategorySummary> {
    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: uncategorizedTransactions },
    ] = await Promise.all([
      this.client.from('categories').select('*', { count: 'exact', head: true }),
      this.client
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      this.client
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive'),
      this.client
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .is('category_id', null),
    ]).then((results) =>
      results.map((r) => {
        if (r.error) throw new Error(`Failed to load category summary: ${r.error.message}`)
        return r
      }),
    )

    return {
      total: total ?? 0,
      active: active ?? 0,
      inactive: inactive ?? 0,
      uncategorizedTransactions: uncategorizedTransactions ?? 0,
    }
  }

  async create(input: CategoryCreateInput): Promise<CategoryRecord> {
    const userId = await getCurrentUserId()

    const { data, error } = await this.client
      .from('categories')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description,
        parent_category_id: input.parentCategoryId,
        status: input.status,
        color: input.color,
        icon: 'tag',
      })
      .select('*, parent:parent_category_id(name)')
      .single()

    if (error) throw new Error(`Failed to create category: ${error.message}`)

    return mapRow({
      ...data,
      parent_category_name: (data as { parent?: { name: string } | null }).parent?.name ?? null,
      transaction_count: 0,
      merchants_assigned: 0,
    } as CategoryRow)
  }

  async update(id: string, input: CategoryUpdateInput): Promise<CategoryRecord> {
    const { data, error } = await this.client
      .from('categories')
      .update({
        name: input.name,
        description: input.description,
        parent_category_id: input.parentCategoryId,
        status: input.status,
        color: input.color,
      })
      .eq('id', id)
      .select('*, parent:parent_category_id(name)')
      .maybeSingle()

    if (error) throw new Error(`Failed to update category ${id}: ${error.message}`)
    if (!data) {
      throw new Error(
        `Category ${id} could not be updated — it does not exist, or RLS denied the write (only categories you created are editable).`,
      )
    }

    return mapRow({
      ...data,
      parent_category_name: (data as { parent?: { name: string } | null }).parent?.name ?? null,
      transaction_count: 0,
      merchants_assigned: 0,
    } as CategoryRow)
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('categories')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) throw new Error(`Failed to delete category ${id}: ${error.message}`)
    if (!count) {
      throw new Error(
        `Category ${id} could not be deleted — it does not exist, or RLS denied the write (only categories you created are deletable).`,
      )
    }
  }
}
