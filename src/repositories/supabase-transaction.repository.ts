import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccountKind, TransactionAccount } from '@/domain/Account'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type {
  OwnerType,
  PaymentMode,
  Transaction,
  TransactionCreateInput,
  TransactionListParams,
  TransactionListResult,
  TransactionPatch,
  TransactionStatus,
} from '@/domain/Transaction'
import type { TransactionRepository } from '@/repositories/transaction.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Reads `vw_transactions` (list) / `vw_transaction_details` (getById) — see
 * DATABASE_MIGRATIONS.sql Phase 7 and REPOSITORY_IMPLEMENTATION_PLAN.md's
 * "TransactionRepository" section, which this file follows directly. Writes
 * go to `transactions` (base table), scoped by RLS (`own_tx_select/insert/
 * update/delete`).
 *
 * Mapping decisions (per REPOSITORY_IMPLEMENTATION_PLAN.md, Decision 1):
 * - `transactions.type` is OwnerType (business/personal) — NOT direction.
 *   `transactions.transaction_type` is debit/credit direction. Both views
 *   only expose the former as `raw_type`; direction comes from the base
 *   table's `transaction_type` column directly.
 * - `ownerType` unresolved (raw_type NULL/'uncategorized'/anything else)
 *   falls back to 'personal' — a disclosed default (domain field is
 *   non-nullable), not a real signal.
 * - `status`: `duplicate_flag = 'duplicate'` (from `is_duplicate`) always
 *   wins over the view's `status` CASE, since that's the only place
 *   'duplicate' can come from — the view's own CASE never produces it.
 * - **Temporary compatibility layer (Option 1 from the plan)**: `Transaction
 *   .account` is non-nullable but `account_id` is NULL on every live row
 *   today. Falls back to a synthetic, non-linking `TransactionAccount`
 *   built from the base table's free-text `bank_name`/`card_last4`/
 *   `account_last4`/`account_type` columns (fetched in a second batched
 *   query, since the views only resolve these via the FK join and go NULL
 *   when it's unmatched) — never fuzzy-matched to a real `accounts` row,
 *   per the migration's own "a wrong id is worse than a null one" guidance.
 *   Remove this layer once `transactions.account_id` is backfilled/fixed
 *   at the source (Module 12B).
 * - `merchant`/`category`/`client` use the FK id when resolved, else the
 *   legacy free-text value as a synthetic id (same pattern used by
 *   Clients' topCategories/topMerchants) — never silently "Uncategorized"
 *   when free-text data actually exists.
 * - `delete`/`bulkDelete` are real hard deletes. REPOSITORY_IMPLEMENTATION_
 *   PLAN.md flagged this as unresolved against CLAUDE.md's soft-delete
 *   preference (`transactions` has no `deleted_at` column) — not resolved
 *   here either; flagged again in MODULE12A_SUPABASE_INTEGRATION_REPORT.md.
 * - `create()` resolves `merchantName` to a real `merchant_memory` row via
 *   the existing `lookup_merchant`/`upsert_merchant_memory` RPCs (per the
 *   plan) — these are the same production functions Workflow C uses, left
 *   untouched, just called from the repository too.
 */

const STATUS_DB_TO_DOMAIN: Record<string, TransactionStatus> = {
  reviewed: 'reviewed',
  pending_review: 'pending_review',
  flagged: 'flagged',
  verified: 'verified',
  uncategorized: 'uncategorized',
}
const STATUS_DOMAIN_TO_DB: Partial<Record<TransactionStatus, string>> = {
  reviewed: 'reviewed',
  pending_review: 'pending_review',
  flagged: 'flagged',
  verified: 'verified',
  uncategorized: 'uncategorized',
}

const PAYMENT_MODES: readonly PaymentMode[] = [
  'upi',
  'card',
  'netbanking',
  'cash',
  'cheque',
  'auto_debit',
]

function toOwnerType(rawType: string | null): OwnerType {
  if (rawType === 'personal') return 'personal'
  if (rawType === 'business') return 'business'
  return 'personal'
}

function toPaymentMode(value: string | null): PaymentMode {
  const lower = (value ?? '').toLowerCase()
  return (PAYMENT_MODES as readonly string[]).includes(lower) ? (lower as PaymentMode) : 'upi'
}

function toStatus(rawStatus: string | null, duplicateFlag: string | null): TransactionStatus {
  if (duplicateFlag === 'duplicate') return 'duplicate'
  return rawStatus ? (STATUS_DB_TO_DOMAIN[rawStatus] ?? 'uncategorized') : 'uncategorized'
}

// `transactions` has no `account_type` column (that's an `accounts`-table
// column) — the free-text fallback can only use bank_name/card_last4/
// account_last4, so its kind can't be determined and defaults to 'bank'.
type AccountFreeText = {
  bank_name: string | null
  card_last4: string | null
  account_last4: string | null
}

function syntheticAccount(free: AccountFreeText | undefined): TransactionAccount {
  return {
    id: '',
    kind: 'bank',
    bankName: free?.bank_name ?? 'Unknown',
    last4: free?.card_last4 ?? free?.account_last4 ?? '0000',
  }
}

function resolvedAccount(
  accountId: string | null,
  accountName: string | null,
  bankName: string | null,
  accountType: string | null,
  accountLast4: string | null,
  cardNetwork: string | null,
  free: AccountFreeText | undefined,
): TransactionAccount {
  if (!accountId) return syntheticAccount(free)
  return {
    id: accountId,
    kind: accountType === 'Credit Card' ? 'credit_card' : 'bank',
    bankName: bankName ?? accountName ?? 'Unknown',
    cardNetwork:
      accountType === 'Credit Card'
        ? (cardNetwork as TransactionAccount['cardNetwork'])
        : undefined,
    last4: accountLast4 ?? '0000',
  }
}

function resolvedMerchant(merchantId: string | null, merchantName: string | null): Merchant {
  return { id: merchantId ?? merchantName ?? '', name: merchantName ?? 'Unknown Merchant' }
}
function resolvedCategory(categoryId: string | null, categoryName: string | null): Category | null {
  if (!categoryName) return null
  return { id: categoryId ?? categoryName, name: categoryName }
}
function resolvedClient(clientId: string | null, clientName: string | null): Client | null {
  if (!clientName) return null
  return { id: clientId ?? clientName, name: clientName }
}

type ListRow = {
  id: string
  transaction_date: string
  amount: number | string
  raw_status: string | null
  status: string | null
  duplicate_flag: string | null
  duplicate_of_id: string | null
  raw_type: string | null
  payment_mode: string | null
  note: string | null
  merchant_id: string | null
  merchant_name: string | null
  category_id: string | null
  category_name: string | null
  client_id: string | null
  client_name: string | null
  account_id: string | null
  account_name: string | null
  bank_name: string | null
  account_type: string | null
  account_last4: string | null
  card_network: string | null
}

async function fetchFreeTextAccounts(
  client: SupabaseClient,
  ids: readonly string[],
): Promise<Map<string, AccountFreeText>> {
  const map = new Map<string, AccountFreeText>()
  if (ids.length === 0) return map
  const { data, error } = await client
    .from('transactions')
    .select('id,bank_name,card_last4,account_last4')
    .in('id', ids)
  if (error) throw new Error(`Failed to resolve transaction accounts: ${error.message}`)
  for (const row of (data ?? []) as Array<{ id: string } & AccountFreeText>) map.set(row.id, row)
  return map
}

function mapListRow(row: ListRow, freeText: Map<string, AccountFreeText>): Transaction {
  return {
    id: row.id,
    date: row.transaction_date,
    merchant: resolvedMerchant(row.merchant_id, row.merchant_name),
    category: resolvedCategory(row.category_id, row.category_name),
    client: resolvedClient(row.client_id, row.client_name),
    account: resolvedAccount(
      row.account_id,
      row.account_name,
      row.bank_name,
      row.account_type,
      row.account_last4,
      row.card_network,
      freeText.get(row.id),
    ),
    ownerType: toOwnerType(row.raw_type),
    type: 'debit', // see note: TransactionType comes from transaction_type, not exposed by vw_transactions — see fetchDirection below, applied post-map in list()
    amount: Number(row.amount),
    status: toStatus(row.status, row.duplicate_flag),
    paymentMode: toPaymentMode(row.payment_mode),
    notes: row.note,
    duplicateOfId: row.duplicate_of_id,
  }
}

const SORT_COLUMN: Record<NonNullable<TransactionListParams['sort']>['id'], string> = {
  date: 'transaction_date',
  merchant: 'merchant_name',
  amount: 'amount',
  status: 'status',
}

export class SupabaseTransactionRepository implements TransactionRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: TransactionListParams): Promise<TransactionListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client.from('vw_transactions').select('*', { count: 'exact' })
    if (filters?.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('transaction_date', filters.dateTo)
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.clientId) query = query.eq('client_id', filters.clientId)
    if (filters?.merchantId) query = query.eq('merchant_id', filters.merchantId)
    if (filters?.bankAccountId) query = query.eq('account_id', filters.bankAccountId)
    if (filters?.creditCardId) query = query.eq('account_id', filters.creditCardId)
    if (filters?.ownerType) query = query.eq('raw_type', filters.ownerType)
    if (filters?.status)
      query = query.eq('status', STATUS_DOMAIN_TO_DB[filters.status] ?? filters.status)
    if (filters?.amountMin !== undefined) query = query.gte('amount', filters.amountMin)
    if (filters?.amountMax !== undefined) query = query.lte('amount', filters.amountMax)
    // `type` (direction) isn't exposed by vw_transactions (only raw_type,
    // which is OwnerType) — filtered client-side below via fetchDirection().
    if (search) {
      query = query.or(
        `merchant_name.ilike.%${search}%,category_name.ilike.%${search}%,client_name.ilike.%${search}%,note.ilike.%${search}%`,
      )
    }

    const sortColumn = sort ? SORT_COLUMN[sort.id] : 'transaction_date'
    query = query.order(sortColumn, { ascending: sort ? !sort.desc : false })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list transactions: ${error.message}`)

    const rows = (data ?? []) as ListRow[]
    const ids = rows.map((r) => r.id)
    const [freeText, directionMap] = await Promise.all([
      fetchFreeTextAccounts(
        this.client,
        rows.filter((r) => !r.account_id).map((r) => r.id),
      ),
      this.fetchDirection(ids),
    ])

    let mapped = rows.map((row) => {
      const base = mapListRow(row, freeText)
      return { ...base, type: directionMap.get(row.id) ?? base.type }
    })

    if (filters?.type) mapped = mapped.filter((t) => t.type === filters.type)
    if (filters?.paymentMode) mapped = mapped.filter((t) => t.paymentMode === filters.paymentMode)

    return { rows: mapped, total: count ?? mapped.length }
  }

  private async fetchDirection(ids: readonly string[]): Promise<Map<string, 'debit' | 'credit'>> {
    const map = new Map<string, 'debit' | 'credit'>()
    if (ids.length === 0) return map
    const { data, error } = await this.client
      .from('transactions')
      .select('id,transaction_type')
      .in('id', ids)
    if (error) throw new Error(`Failed to resolve transaction direction: ${error.message}`)
    for (const row of (data ?? []) as Array<{ id: string; transaction_type: string | null }>) {
      map.set(row.id, (row.transaction_type ?? '').toLowerCase() === 'credit' ? 'credit' : 'debit')
    }
    return map
  }

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.client
      .from('vw_transaction_details')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load transaction ${id}: ${error.message}`)
    if (!data) return null

    const row = data as Record<string, unknown>
    const accountId = row.account_id as string | null
    const freeText = accountId
      ? new Map<string, AccountFreeText>()
      : await fetchFreeTextAccounts(this.client, [id])

    const duplicateFlag = (row.is_duplicate as boolean) ? 'duplicate' : null

    return {
      id: row.id as string,
      date: row.transaction_date as string,
      merchant: resolvedMerchant(
        row.merchant_id as string | null,
        (row.merchant_display_name as string | null) ?? (row.merchant as string | null),
      ),
      category: resolvedCategory(
        row.category_id as string | null,
        row.category_name as string | null,
      ),
      client: resolvedClient(
        row.client_id as string | null,
        (row.resolved_client_name as string | null) ?? (row.client_name as string | null),
      ),
      account: resolvedAccount(
        accountId,
        row.account_name as string | null,
        row.institution_name as string | null,
        row.account_type as string | null,
        (row.card_last4 as string | null) ?? (row.account_last4 as string | null),
        row.card_network as string | null,
        freeText.get(id),
      ),
      ownerType: toOwnerType(row.type as string | null),
      type:
        ((row.transaction_type as string | null) ?? '').toLowerCase() === 'credit'
          ? 'credit'
          : 'debit',
      amount: Number(row.amount),
      status: toStatus(row.status as string | null, duplicateFlag),
      paymentMode: toPaymentMode(row.payment_mode as string | null),
      notes: row.note as string | null,
      duplicateOfId: row.duplicate_of_id as string | null,
    }
  }

  async create(input: TransactionCreateInput): Promise<Transaction> {
    const userId = await getCurrentUserId()
    const normalized = input.merchantName.trim().toUpperCase()

    const { data: lookup, error: lookupError } = await this.client.rpc('lookup_merchant', {
      p_user_id: userId,
      p_normalized_merchant: normalized,
    })
    if (lookupError) throw new Error(`Merchant lookup failed: ${lookupError.message}`)

    let merchantId: string | null = null
    const found = Array.isArray(lookup) ? lookup[0] : lookup
    if (found?.found && found.merchant_id) {
      merchantId = found.merchant_id
    } else {
      const { data: upserted, error: upsertError } = await this.client.rpc(
        'upsert_merchant_memory',
        {
          p_user_id: userId,
          p_normalized_merchant: normalized,
          p_display_name: input.merchantName,
          p_category: 'Uncategorized',
          p_confidence: 100,
        },
      )
      if (upsertError) throw new Error(`Merchant upsert failed: ${upsertError.message}`)
      merchantId =
        (upserted as { merchant_id?: string; id?: string } | null)?.merchant_id ??
        (upserted as { id?: string } | null)?.id ??
        null
    }

    const { data, error } = await this.client
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_date: input.date,
        merchant: input.merchantName,
        merchant_id: merchantId,
        category_id: input.categoryId,
        client_id: input.clientId,
        account_id: input.accountId,
        type: input.ownerType,
        transaction_type: input.type,
        amount: input.amount,
        status: 'reviewed',
        is_manually_entered: true,
        is_duplicate: false,
        confidence: 100,
        category_source: 'manual',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create transaction: ${error.message}`)

    const created = await this.getById(data.id)
    if (!created) throw new Error(`Transaction ${data.id} vanished immediately after creation.`)
    return created
  }

  async update(id: string, patch: TransactionPatch): Promise<Transaction> {
    const payload = this.buildPatchPayload(patch)
    const { error, count } = await this.client
      .from('transactions')
      .update(payload, { count: 'exact' })
      .eq('id', id)
    if (error) throw new Error(`Failed to update transaction ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Transaction ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )

    const updated = await this.getById(id)
    if (!updated) throw new Error(`Transaction ${id} vanished after update.`)
    return updated
  }

  async bulkUpdate(ids: readonly string[], patch: TransactionPatch): Promise<void> {
    if (ids.length === 0) return
    const payload = this.buildPatchPayload(patch)
    const { error } = await this.client.from('transactions').update(payload).in('id', ids)
    if (error) throw new Error(`Failed to bulk-update transactions: ${error.message}`)
  }

  private buildPatchPayload(patch: TransactionPatch): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if (patch.categoryId !== undefined) payload.category_id = patch.categoryId
    if (patch.clientId !== undefined) payload.client_id = patch.clientId
    if (patch.merchantId !== undefined) payload.merchant_id = patch.merchantId
    if (patch.ownerType !== undefined) payload.type = patch.ownerType
    if (patch.notes !== undefined) payload.note = patch.notes
    if (patch.status !== undefined) {
      if (patch.status === 'duplicate') {
        payload.is_duplicate = true
      } else {
        payload.is_duplicate = false
        payload.status = STATUS_DOMAIN_TO_DB[patch.status] ?? patch.status
      }
    }
    payload.manually_edited = true
    return payload
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error) throw new Error(`Failed to delete transaction ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Transaction ${id} could not be deleted — it does not exist, or RLS denied the write.`,
      )
  }

  async bulkDelete(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return
    const { error } = await this.client.from('transactions').delete().in('id', ids)
    if (error) throw new Error(`Failed to bulk-delete transactions: ${error.message}`)
  }

  async listCategories(): Promise<readonly Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('id,name')
      .eq('status', 'active')
      .order('name')
    if (error) throw new Error(`Failed to list categories: ${error.message}`)
    return (data ?? []) as Category[]
  }

  async listClients(): Promise<readonly Client[]> {
    const { data, error } = await this.client
      .from('clients')
      .select('id,client_name')
      .eq('is_active', true)
      .order('client_name')
    if (error) throw new Error(`Failed to list clients: ${error.message}`)
    return (data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      name: (r as { client_name: string }).client_name,
    }))
  }

  async listMerchants(): Promise<readonly Merchant[]> {
    const { data, error } = await this.client
      .from('merchant_memory')
      .select('id,display_name')
      .eq('status', 'active')
      .order('display_name')
    if (error) throw new Error(`Failed to list merchants: ${error.message}`)
    return (data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      name: (r as { display_name: string }).display_name,
    }))
  }

  async listAccounts(): Promise<readonly TransactionAccount[]> {
    const { data, error } = await this.client
      .from('vw_accounts')
      .select('id,account_kind,institution_name,card_network,resolved_last4')
    if (error) throw new Error(`Failed to list accounts: ${error.message}`)
    return (data ?? []).map((r) => {
      const row = r as {
        id: string
        account_kind: AccountKind
        institution_name: string
        card_network: string | null
        resolved_last4: string | null
      }
      return {
        id: row.id,
        kind: row.account_kind,
        bankName: row.institution_name,
        cardNetwork:
          row.account_kind === 'credit_card'
            ? (row.card_network as TransactionAccount['cardNetwork'])
            : undefined,
        last4: row.resolved_last4 ?? '0000',
      }
    })
  }
}
