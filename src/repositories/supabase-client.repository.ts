import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ClientCategorySpend,
  ClientCreateInput,
  ClientListParams,
  ClientListResult,
  ClientMerchantSpend,
  ClientRecord,
  ClientRecordStatus,
  ClientSummary,
  ClientUpdateInput,
} from '@/domain/Client'
import type { ClientRepository } from '@/repositories/client.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Reads `vw_client_summary` (aggregates) plus `vw_client_top_categories` /
 * `vw_client_top_merchants` (see DATABASE_MIGRATIONS.sql Phase 7). Writes go
 * directly to `clients`, scoped by RLS (`own_clients_all`: auth.uid() =
 * user_id).
 *
 * Known schema gaps (documented, not silently patched by altering the
 * domain model — see MODULE12A_SUPABASE_INTEGRATION_REPORT.md):
 * - `ClientRecord.company` has no matching `clients` column. Always reads
 *   null; writes to it are not persisted.
 * - `ClientRecordStatus` is 3-valued (active/pending/suspended) but
 *   `clients` only has a boolean `is_active`. 'pending' and 'suspended'
 *   are indistinguishable in the database today — both read/write as
 *   `is_active = false`.
 * - `vw_client_top_categories`/`vw_client_top_merchants` expose only a
 *   name, not the category/merchant id (transactions.client_id is also
 *   unbackfilled on every live row today, so both arrays are empty in
 *   practice regardless). The category/merchant name is used as a
 *   synthetic `id` until a real id column is added.
 */

type ClientSummaryRow = {
  client_id: string
  client_name: string
  client_type: string | null
  is_active: boolean | null
  total_spend: number | string | null
  transaction_count: number | string | null
  linked_accounts_count: number | string | null
  linked_credit_cards_count: number | string | null
  linked_statements_count: number | string | null
  first_transaction_at: string | null
  last_transaction_at: string | null
}

type ClientDetailRow = {
  id: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string | null
}

function toStatus(isActive: boolean | null): ClientRecordStatus {
  return isActive === false ? 'suspended' : 'active'
}

async function fetchTopSpend(
  client: SupabaseClient,
  view: 'vw_client_top_categories' | 'vw_client_top_merchants',
  nameColumn: 'category_name' | 'merchant_name',
  clientIds: readonly string[],
): Promise<Map<string, Array<{ name: string; totalSpend: number }>>> {
  const map = new Map<string, Array<{ name: string; totalSpend: number }>>()
  if (clientIds.length === 0) return map

  const { data, error } = await client
    .from(view)
    .select('client_id,' + nameColumn + ',total_spend,rank')
    .in('client_id', clientIds)
    .lte('rank', 5)
    .order('rank')
  if (error) throw new Error(`Failed to load ${view}: ${error.message}`)

  for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
    const clientId = row.client_id as string
    const list = map.get(clientId) ?? []
    list.push({ name: row[nameColumn] as string, totalSpend: Number(row.total_spend ?? 0) })
    map.set(clientId, list)
  }
  return map
}

function mapRow(
  row: ClientSummaryRow,
  detail: ClientDetailRow | undefined,
  topCategories: Array<{ name: string; totalSpend: number }>,
  topMerchants: Array<{ name: string; totalSpend: number }>,
): ClientRecord {
  const categories: readonly ClientCategorySpend[] = topCategories.map((c) => ({
    category: { id: c.name, name: c.name },
    totalSpend: c.totalSpend,
  }))
  const merchants: readonly ClientMerchantSpend[] = topMerchants.map((m) => ({
    merchant: { id: m.name, name: m.name },
    totalSpend: m.totalSpend,
  }))

  return {
    id: row.client_id,
    name: row.client_name,
    clientType: (row.client_type as ClientRecord['clientType']) ?? 'personal',
    company: null,
    email: detail?.email ?? null,
    phone: detail?.phone ?? null,
    status: toStatus(row.is_active),
    notes: detail?.notes ?? null,
    totalSpend: Number(row.total_spend ?? 0),
    transactionCount: Number(row.transaction_count ?? 0),
    linkedAccountsCount: Number(row.linked_accounts_count ?? 0),
    linkedCreditCardsCount: Number(row.linked_credit_cards_count ?? 0),
    linkedStatementsCount: Number(row.linked_statements_count ?? 0),
    topCategories: categories,
    topMerchants: merchants,
    firstTransactionAt: row.first_transaction_at,
    lastTransactionAt: row.last_transaction_at,
    createdAt: detail?.created_at ?? new Date().toISOString(),
  }
}

const CLIENT_SORT_COLUMN: Record<NonNullable<ClientListParams['sort']>['id'], string> = {
  name: 'client_name',
  totalSpend: 'total_spend',
  transactionCount: 'transaction_count',
  createdAt: 'client_id', // vw_client_summary has no created_at; stable fallback, see note in list()
}

export class SupabaseClientRepository implements ClientRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: ClientListParams): Promise<ClientListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client.from('vw_client_summary').select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('client_name', `%${search}%`)
    }
    if (filters?.clientType) {
      query = query.eq('client_type', filters.clientType)
    }
    if (filters?.status) {
      query = query.eq('is_active', filters.status === 'active')
    }
    if (filters?.categoryId) {
      const { data: category } = await this.client
        .from('categories')
        .select('name')
        .eq('id', filters.categoryId)
        .maybeSingle()
      if (category?.name) {
        const { data: matches } = await this.client
          .from('vw_client_top_categories')
          .select('client_id')
          .eq('category_name', category.name)
        const ids = [...new Set((matches ?? []).map((m) => (m as { client_id: string }).client_id))]
        query = query.in(
          'client_id',
          ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'],
        )
      }
    }

    // createdAt sort/filter needs the `clients` table itself (not exposed by
    // vw_client_summary) — for the common case (no dateAdded filter, sort by
    // something else) we skip the extra round trip entirely.
    let createdAtByClientId: Map<string, string> | null = null
    if (filters?.dateAddedFrom || filters?.dateAddedTo || sort?.id === 'createdAt') {
      const { data } = await this.client.from('clients').select('id, created_at')
      createdAtByClientId = new Map(
        (data ?? []).map((r) => [
          (r as { id: string }).id,
          (r as { created_at: string }).created_at,
        ]),
      )
      if (filters?.dateAddedFrom) {
        const ids = [...createdAtByClientId.entries()]
          .filter(([, d]) => d >= filters.dateAddedFrom!)
          .map(([id]) => id)
        query = query.in(
          'client_id',
          ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'],
        )
      }
      if (filters?.dateAddedTo) {
        const ids = [...createdAtByClientId.entries()]
          .filter(([, d]) => d <= filters.dateAddedTo!)
          .map(([id]) => id)
        query = query.in(
          'client_id',
          ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'],
        )
      }
    }

    const sortColumn = sort ? CLIENT_SORT_COLUMN[sort.id] : 'client_name'
    if (sort?.id !== 'createdAt') {
      query = query.order(sortColumn, { ascending: !sort?.desc })
    }

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list clients: ${error.message}`)

    let rows = (data ?? []) as ClientSummaryRow[]
    if (sort?.id === 'createdAt' && createdAtByClientId) {
      rows = [...rows].sort((a, b) => {
        const da = createdAtByClientId!.get(a.client_id) ?? ''
        const db = createdAtByClientId!.get(b.client_id) ?? ''
        return sort.desc ? db.localeCompare(da) : da.localeCompare(db)
      })
    }

    const start = (page - 1) * pageSize
    const pageRows = rows.slice(start, start + pageSize)
    const ids = pageRows.map((r) => r.client_id)

    const [{ data: details }, topCategoriesMap, topMerchantsMap] = await Promise.all([
      this.client
        .from('clients')
        .select('id,email,phone,notes,created_at')
        .in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']),
      fetchTopSpend(this.client, 'vw_client_top_categories', 'category_name', ids),
      fetchTopSpend(this.client, 'vw_client_top_merchants', 'merchant_name', ids),
    ])
    const detailById = new Map(
      (details ?? []).map((d) => [(d as ClientDetailRow).id, d as ClientDetailRow]),
    )

    return {
      rows: pageRows.map((row) =>
        mapRow(
          row,
          detailById.get(row.client_id),
          topCategoriesMap.get(row.client_id) ?? [],
          topMerchantsMap.get(row.client_id) ?? [],
        ),
      ),
      total: count ?? rows.length,
    }
  }

  async getSummary(): Promise<ClientSummary> {
    const { data, error } = await this.client
      .from('vw_client_summary')
      .select('is_active, total_spend')
    if (error) throw new Error(`Failed to load client summary: ${error.message}`)

    const rows = (data ?? []) as Array<{
      is_active: boolean | null
      total_spend: number | string | null
    }>
    const totalSpend = rows.reduce((sum, r) => sum + Number(r.total_spend ?? 0), 0)
    const activeClients = rows.filter((r) => r.is_active !== false).length
    const clientsRequiringReview = rows.filter((r) => r.is_active === false).length

    return { totalClients: rows.length, totalSpend, clientsRequiringReview, activeClients }
  }

  async create(input: ClientCreateInput): Promise<ClientRecord> {
    const userId = await getCurrentUserId()

    const { data, error } = await this.client
      .from('clients')
      .insert({
        user_id: userId,
        client_name: input.name,
        client_type: input.clientType,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        is_active: input.status === 'active',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create client: ${error.message}`)

    return mapRow(
      {
        client_id: data.id,
        client_name: data.client_name,
        client_type: data.client_type,
        is_active: data.is_active,
        total_spend: 0,
        transaction_count: 0,
        linked_accounts_count: 0,
        linked_credit_cards_count: 0,
        linked_statements_count: 0,
        first_transaction_at: null,
        last_transaction_at: null,
      },
      data as ClientDetailRow,
      [],
      [],
    )
  }

  async update(id: string, input: ClientUpdateInput): Promise<ClientRecord> {
    const { data, error } = await this.client
      .from('clients')
      .update({
        client_name: input.name,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        is_active: input.status === 'active',
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw new Error(`Failed to update client ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Client ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )

    const { data: summaryRow } = await this.client
      .from('vw_client_summary')
      .select('*')
      .eq('client_id', id)
      .single()
    const [topCategoriesMap, topMerchantsMap] = await Promise.all([
      fetchTopSpend(this.client, 'vw_client_top_categories', 'category_name', [id]),
      fetchTopSpend(this.client, 'vw_client_top_merchants', 'merchant_name', [id]),
    ])

    return mapRow(
      (summaryRow ?? {
        client_id: id,
        client_name: data.client_name,
        client_type: data.client_type,
        is_active: data.is_active,
        total_spend: 0,
        transaction_count: 0,
        linked_accounts_count: 0,
        linked_credit_cards_count: 0,
        linked_statements_count: 0,
        first_transaction_at: null,
        last_transaction_at: null,
      }) as ClientSummaryRow,
      data as ClientDetailRow,
      topCategoriesMap.get(id) ?? [],
      topMerchantsMap.get(id) ?? [],
    )
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('clients')
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error) throw new Error(`Failed to delete client ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Client ${id} could not be deleted — it does not exist, or RLS denied the write.`,
      )
  }
}
