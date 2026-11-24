import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BankAccountCreateInput,
  BankAccountHealth,
  BankAccountListParams,
  BankAccountListResult,
  BankAccountRecord,
  BankAccountSummary,
  BankAccountType,
  BankAccountUpdateInput,
} from '@/domain/Account'
import type { BankAccountRepository } from '@/repositories/bank-account.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'
import type { AccountCredentialRecord } from '@/domain/Credential'

/**
 * Reads `vw_accounts` / `vw_account_summary` / `vw_account_health` (see
 * DATABASE_MIGRATIONS.sql Phase 7), filtered to account_kind = 'bank'
 * (account_type <> 'Credit Card' — same physical `accounts` table as
 * Credit Cards, per CLAUDE.md). Writes go directly to `accounts`, scoped by
 * RLS (`own_accounts_all`: auth.uid() = user_id) and always additionally
 * scoped to account_type <> 'Credit Card' so this repository can never
 * touch a credit card row.
 *
 * Mapping decisions (documented, not silently invented — see
 * MODULE12A_SUPABASE_INTEGRATION_REPORT.md):
 * - `account_type`: DB uses 'Savings'/'Current'/'OD'/'Credit Card' (live
 *   CHECK constraint, left untouched per Decision 3). Domain uses
 *   lowercase 'savings'/'current'/'overdraft'. Mapped both directions;
 *   'OD' <-> 'overdraft' specifically, per instruction — the live
 *   vocabulary itself is never changed.
 * - `currentBalance`/`availableBalance` are non-nullable `number` in the
 *   domain model (not touched, per instruction). Where the DB value is
 *   NULL (all 7 live rows today — no real balance has been entered yet),
 *   this maps to `0` as the only type-safe representation available
 *   without changing the domain model — this is a display fallback, not a
 *   fabricated balance; nothing is written back to the database as 0.
 * - `availableBalance` has no distinct bank-account column in `accounts`
 *   (`available_credit` is credit-card-oriented) — mapped to the same
 *   value as `currentBalance` for bank accounts, since a savings/current
 *   account has no separate credit line to net against.
 * - `lastSyncAt` has no dedicated column — mapped to `updated_at`.
 *   `syncAll()` touches `updated_at` for every bank account row; there is
 *   no real sync integration in Module 12A (that is Workflow B/D
 *   territory, out of scope here), so this is an honest timestamp bump,
 *   not a fabricated sync.
 * - `monthlyCredits`/`monthlyDebits`/`topMerchant`/`topCategory`/
 *   `recentActivityCount`/`lastTransactionAt` are derived from
 *   `transactions.account_id`, which is unbackfilled on every live row
 *   today (documented, pre-existing limitation) — these all read as
 *   0/null in practice, but the query logic is real and forward-compatible.
 * - Per Decision 1, `transactions.type` is OwnerType (business/personal);
 *   `transactions.transaction_type` is debit/credit direction — used here
 *   for monthlyCredits/monthlyDebits, not `type`.
 */

const DB_TO_DOMAIN_TYPE: Record<string, BankAccountType> = {
  Savings: 'savings',
  Current: 'current',
  OD: 'overdraft',
}
const DOMAIN_TO_DB_TYPE: Record<BankAccountType, string> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'OD',
}

type AccountRow = {
  id: string
  institution_name: string
  account_name: string
  account_nickname: string | null
  account_type: string
  resolved_last4: string | null
  current_balance: number | string | null
  notes: string | null
  updated_at: string | null
  created_at: string | null
  resolved_is_active: boolean | null
  client_id: string | null
  account_holder_name: string | null
}

type ActivityAgg = {
  count: number
  lastTransactionAt: string | null
  monthlyCredits: number
  monthlyDebits: number
  merchantSpend: Map<string, number>
  categorySpend: Map<string, number>
}

function topOf(spend: Map<string, number>): { id: string; name: string } | null {
  let best: [string, number] | null = null
  for (const entry of spend) {
    if (!best || entry[1] > best[1]) best = entry
  }
  return best ? { id: best[0], name: best[0] } : null
}

async function fetchActivity(
  client: SupabaseClient,
  accountIds: readonly string[],
): Promise<Map<string, ActivityAgg>> {
  const map = new Map<string, ActivityAgg>()
  if (accountIds.length === 0) return map

  const { data, error } = await client
    .from('transactions')
    .select('account_id, amount, transaction_type, transaction_date, merchant, category')
    .in('account_id', accountIds)
  if (error) throw new Error(`Failed to load account activity: ${error.message}`)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  for (const row of (data ?? []) as Array<{
    account_id: string
    amount: number | string
    transaction_type: string | null
    transaction_date: string | null
    merchant: string | null
    category: string | null
  }>) {
    const agg = map.get(row.account_id) ?? {
      count: 0,
      lastTransactionAt: null,
      monthlyCredits: 0,
      monthlyDebits: 0,
      merchantSpend: new Map(),
      categorySpend: new Map(),
    }
    agg.count += 1
    const amount = Number(row.amount ?? 0)
    if (row.transaction_date) {
      if (!agg.lastTransactionAt || row.transaction_date > agg.lastTransactionAt) {
        agg.lastTransactionAt = row.transaction_date
      }
      if (new Date(row.transaction_date) >= monthStart) {
        if ((row.transaction_type ?? '').toLowerCase() === 'credit') agg.monthlyCredits += amount
        if ((row.transaction_type ?? '').toLowerCase() === 'debit') agg.monthlyDebits += amount
      }
    }
    if (row.merchant)
      agg.merchantSpend.set(row.merchant, (agg.merchantSpend.get(row.merchant) ?? 0) + amount)
    if (row.category)
      agg.categorySpend.set(row.category, (agg.categorySpend.get(row.category) ?? 0) + amount)
    map.set(row.account_id, agg)
  }
  return map
}

function mapRow(
  row: AccountRow,
  health: BankAccountHealth,
  activity: ActivityAgg | undefined,
): BankAccountRecord {
  const balance = Number(row.current_balance ?? 0)
  return {
    id: row.id,
    bankName: row.institution_name,
    accountName: row.account_name,
    nickname: row.account_nickname,
    accountType: DB_TO_DOMAIN_TYPE[row.account_type] ?? 'savings',
    last4: row.resolved_last4 ?? '0000',
    maskedAccountNumber: `•••• •••• ${row.resolved_last4 ?? '0000'}`,
    currentBalance: balance,
    availableBalance: balance,
    monthlyCredits: activity?.monthlyCredits ?? 0,
    monthlyDebits: activity?.monthlyDebits ?? 0,
    topMerchant: activity ? topOf(activity.merchantSpend) : null,
    topCategory: activity ? topOf(activity.categorySpend) : null,
    recentActivityCount: activity?.count ?? 0,
    lastSyncAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    lastTransactionAt: activity?.lastTransactionAt ?? null,
    health,
    status: row.resolved_is_active === false ? 'inactive' : 'active',
    notes: row.notes,
    clientId: row.client_id,
    accountHolder: row.account_holder_name,
  }
}

const DB_TO_ACCOUNT_TYPE_LABEL: Record<string, string> = {
  Savings: 'Savings',
  Current: 'Current',
  OD: 'Overdraft',
}

type CredentialRow = {
  id: string
  institution_name: string
  account_type: string
  card_last4: string | null
  account_number_last4: string | null
  statement_password: string | null
  account_category: string | null
  currency: string | null
  is_active: boolean | null
  updated_at: string | null
  created_at: string | null
}

function toCredentialRecord(row: CredentialRow): AccountCredentialRecord {
  return {
    id: row.id,
    kind: 'bank',
    institutionName: row.institution_name,
    cardProduct: null,
    last4: row.account_number_last4 ?? row.card_last4 ?? '0000',
    accountTypeLabel: DB_TO_ACCOUNT_TYPE_LABEL[row.account_type] ?? row.account_type,
    accountCategory: row.account_category,
    currency: row.currency ?? 'INR',
    statementPassword: row.statement_password,
    status: row.is_active === false ? 'inactive' : 'active',
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

const SORT_COLUMN: Record<NonNullable<BankAccountListParams['sort']>['id'], string> = {
  bankName: 'institution_name',
  accountName: 'account_name',
  currentBalance: 'current_balance',
  availableBalance: 'current_balance',
  lastSyncAt: 'updated_at',
}

export class SupabaseBankAccountRepository implements BankAccountRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: BankAccountListParams): Promise<BankAccountListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client
      .from('vw_accounts')
      .select('*', { count: 'exact' })
      .eq('account_kind', 'bank')

    if (search) {
      query = query.or(
        `institution_name.ilike.%${search}%,account_name.ilike.%${search}%,account_nickname.ilike.%${search}%`,
      )
    }
    if (filters?.bankName) query = query.eq('institution_name', filters.bankName)
    if (filters?.accountType)
      query = query.eq('account_type', DOMAIN_TO_DB_TYPE[filters.accountType])
    if (filters?.status) query = query.eq('resolved_is_active', filters.status === 'active')
    if (filters?.clientId) query = query.eq('client_id', filters.clientId)

    if (filters?.health) {
      const { data: healthRows } = await this.client
        .from('vw_account_health')
        .select('account_id,health')
        .eq('account_kind', 'bank')
        .eq('health', filters.health)
      const ids = (healthRows ?? []).map((r) => (r as { account_id: string }).account_id)
      query = query.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
    }

    const sortColumn = sort ? SORT_COLUMN[sort.id] : 'institution_name'
    query = query.order(sortColumn, { ascending: !sort?.desc })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list accounts: ${error.message}`)

    const rows = (data ?? []) as AccountRow[]
    const ids = rows.map((r) => r.id)

    const [{ data: healthRows }, activityMap] = await Promise.all([
      this.client
        .from('vw_account_health')
        .select('account_id,health')
        .in('account_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']),
      fetchActivity(this.client, ids),
    ])
    const healthById = new Map(
      (healthRows ?? []).map((r) => [
        (r as { account_id: string }).account_id,
        (r as { health: string }).health as BankAccountHealth,
      ]),
    )

    return {
      rows: rows.map((row) =>
        mapRow(row, healthById.get(row.id) ?? 'healthy', activityMap.get(row.id)),
      ),
      total: count ?? rows.length,
    }
  }

  async getSummary(): Promise<BankAccountSummary> {
    const { data: summaryRow, error } = await this.client
      .from('vw_account_summary')
      .select('*')
      .eq('account_kind', 'bank')
      .maybeSingle()
    if (error) throw new Error(`Failed to load account summary: ${error.message}`)

    const { count: totalBankAccounts, error: countError } = await this.client
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .neq('account_type', 'Credit Card')
    if (countError) throw new Error(`Failed to load account summary: ${countError.message}`)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const { count: statementsImportedThisMonth, error: stError } = await this.client
      .from('statements')
      .select('*, accounts!inner(account_type)', { count: 'exact', head: true })
      .neq('accounts.account_type', 'Credit Card')
      .gte('created_at', monthStart)
    if (stError) throw new Error(`Failed to load account summary: ${stError.message}`)

    return {
      totalBankAccounts: totalBankAccounts ?? 0,
      totalCurrentBalance: Number(
        (summaryRow as { total_current_balance?: number | string | null } | null)
          ?.total_current_balance ?? 0,
      ),
      totalAvailableBalance: Number(
        (summaryRow as { total_available_balance?: number | string | null } | null)
          ?.total_available_balance ?? 0,
      ),
      statementsImportedThisMonth: statementsImportedThisMonth ?? 0,
    }
  }

  async create(input: BankAccountCreateInput): Promise<BankAccountRecord> {
    const userId = await getCurrentUserId()
    const last4 = input.accountNumber.slice(-4).padStart(4, '0')

    const { data, error } = await this.client
      .from('accounts')
      .insert({
        user_id: userId,
        account_name: input.accountName,
        institution_name: input.bankName,
        account_type: DOMAIN_TO_DB_TYPE[input.accountType],
        account_number_last4: last4,
        account_nickname: input.nickname,
        opening_balance: input.openingBalance,
        current_balance: input.openingBalance,
        is_active: input.status === 'active',
        account_holder_name: input.accountHolder ?? null,
        statement_password: input.statementPassword ?? null,
        account_category: input.accountCategory ?? 'Personal',
        currency: input.currency ?? 'INR',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create account: ${error.message}`)

    return mapRow(
      {
        id: data.id,
        institution_name: data.institution_name,
        account_name: data.account_name,
        account_nickname: data.account_nickname,
        account_type: data.account_type,
        resolved_last4: data.account_number_last4,
        current_balance: data.current_balance,
        notes: data.notes,
        updated_at: data.updated_at,
        created_at: data.created_at,
        resolved_is_active: data.is_active,
        client_id: data.client_id,
        account_holder_name: data.account_holder_name,
      },
      'healthy',
      undefined,
    )
  }

  /** Narrow write — see `BankAccountRepository.updateAccountHolder`'s doc comment. Mirrors `SupabaseCreditCardRepository.updateAccountHolder`. */
  async updateAccountHolder(id: string, accountHolder: string | null): Promise<string | null> {
    const { data, error } = await this.client
      .from('accounts')
      .update({ account_holder_name: accountHolder })
      .eq('id', id)
      .neq('account_type', 'Credit Card')
      .select('account_holder_name')
      .maybeSingle()

    if (error) throw new Error(`Failed to update account holder for ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Account ${id}'s holder could not be updated — it does not exist, is a credit card, or RLS denied the write.`,
      )

    return (data as { account_holder_name: string | null }).account_holder_name
  }

  async update(id: string, input: BankAccountUpdateInput): Promise<BankAccountRecord> {
    const { data, error } = await this.client
      .from('accounts')
      .update({
        account_nickname: input.nickname,
        is_active: input.status === 'active',
        notes: input.notes,
      })
      .eq('id', id)
      .neq('account_type', 'Credit Card')
      .select('*')
      .maybeSingle()

    if (error) throw new Error(`Failed to update account ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Account ${id} could not be updated — it does not exist, is a credit card, or RLS denied the write.`,
      )

    const [{ data: healthRow }, activityMap] = await Promise.all([
      this.client.from('vw_account_health').select('health').eq('account_id', id).maybeSingle(),
      fetchActivity(this.client, [id]),
    ])

    return mapRow(
      {
        id: data.id,
        institution_name: data.institution_name,
        account_name: data.account_name,
        account_nickname: data.account_nickname,
        account_type: data.account_type,
        resolved_last4: data.account_number_last4,
        current_balance: data.current_balance,
        notes: data.notes,
        updated_at: data.updated_at,
        created_at: data.created_at,
        resolved_is_active: data.is_active,
        client_id: data.client_id,
        account_holder_name: data.account_holder_name,
      },
      ((healthRow as { health?: BankAccountHealth } | null)?.health ??
        'healthy') as BankAccountHealth,
      activityMap.get(id),
    )
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('accounts')
      .delete({ count: 'exact' })
      .eq('id', id)
      .neq('account_type', 'Credit Card')
    if (error) throw new Error(`Failed to delete account ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Account ${id} could not be deleted — it does not exist, is a credit card, or RLS denied the write.`,
      )
  }

  async syncAll(): Promise<void> {
    const userId = await getCurrentUserId()
    const { error } = await this.client
      .from('accounts')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('account_type', 'Credit Card')
    if (error) throw new Error(`Failed to sync accounts: ${error.message}`)
  }

  /** Settings → Credentials read — see `BankAccountRepository.listCredentials`'s doc comment. */
  async listCredentials(): Promise<AccountCredentialRecord[]> {
    const { data, error } = await this.client
      .from('accounts')
      .select(
        'id, institution_name, account_type, card_last4, account_number_last4, statement_password, account_category, currency, is_active, updated_at, created_at',
      )
      .neq('account_type', 'Credit Card')
      .order('institution_name', { ascending: true })
    if (error) throw new Error(`Failed to load bank account credentials: ${error.message}`)

    return ((data as CredentialRow[] | null) ?? []).map(toCredentialRecord)
  }

  /** Narrow write for `accounts.statement_password` — mirrors `updateAccountHolder`'s pattern. */
  async updateStatementPassword(
    id: string,
    statementPassword: string | null,
  ): Promise<string | null> {
    const { data, error } = await this.client
      .from('accounts')
      .update({ statement_password: statementPassword })
      .eq('id', id)
      .neq('account_type', 'Credit Card')
      .select('statement_password')
      .maybeSingle()

    if (error) throw new Error(`Failed to update statement credential for ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Account ${id}'s credential could not be updated — it does not exist, is a credit card, or RLS denied the write.`,
      )

    return (data as { statement_password: string | null }).statement_password
  }
}
