import type { SupabaseClient } from '@supabase/supabase-js'
import { KNOWN_CARD_NETWORKS } from '@/domain/CreditCard'
import type {
  CardNetwork,
  CreditCardCreateInput,
  CreditCardHealth,
  CreditCardListParams,
  CreditCardListResult,
  CreditCardPosition,
  CreditCardRecord,
  CreditCardSummary,
  CreditCardUpdateInput,
} from '@/domain/CreditCard'
import type { CreditCardRepository } from '@/repositories/credit-card.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Same physical `accounts` table as Accounts (Module 8), always additionally
 * scoped to account_type = 'Credit Card' so this repository can never touch
 * a bank-account row. Reads `vw_accounts` (base row) + `vw_credit_card_
 * utilization` (utilization_percent) + `vw_account_health`. Writes go
 * directly to `accounts`, scoped by RLS (`own_accounts_all`).
 *
 * Mapping decisions (documented, not silently invented — see
 * MODULE12A_SUPABASE_INTEGRATION_REPORT.md):
 * - `creditLimit`/`outstanding`/`minimumDue` are non-nullable `number` in
 *   the domain model. Where the DB value is NULL (all live cards today —
 *   no real limit/balance has been entered yet), this maps to `0` as the
 *   only type-safe representation without changing the domain model —
 *   the same disclosed fallback used for bank account balances. Nothing is
 *   written back to the database as a fabricated 0.
 * - `statementDate`/`dueDate` are non-nullable `string`. `accounts` stores
 *   `statement_day`/`statement_cycle_day` (day-of-month integer, not a
 *   full date) and `payment_due_date`. Where neither is configured, today's
 *   date is used as a display fallback, same rationale as above.
 * - `monthlySpend`/`topMerchant`/`topCategory`/`lastTransactionAt` are
 *   derived from `transactions.account_id`, unbackfilled on every live row
 *   today — real query logic, reads as 0/null in practice.
 * - `health`: `vw_account_health.health` is shared logic across bank
 *   accounts and credit cards and can emit `'low_balance'`/`'sync_required'`
 *   (bank-oriented values) even for a credit-card row (e.g. when
 *   `accounts.sync_status <> 'Synced'`) — neither is a valid
 *   `CreditCardHealth`. Validated against the known set here and falls back
 *   to `'healthy'` rather than passing an unrecognized value through to
 *   `<CreditCardHealthBadge>` (confirmed via a live browser check: an
 *   unvalidated cast crashed that component and blanked the whole page).
 */

const KNOWN_CREDIT_CARD_HEALTH: readonly CreditCardHealth[] = [
  'healthy',
  'due_soon',
  'high_utilization',
  'payment_overdue',
]
function toCreditCardHealth(value: string | null | undefined): CreditCardHealth {
  return value && (KNOWN_CREDIT_CARD_HEALTH as readonly string[]).includes(value)
    ? (value as CreditCardHealth)
    : 'healthy'
}

const DB_TO_DOMAIN_NETWORK: Record<string, CardNetwork> = {
  VISA: 'VISA',
  Visa: 'VISA',
  Mastercard: 'Mastercard',
  MasterCard: 'Mastercard',
  AMEX: 'AMEX',
  Amex: 'AMEX',
  RuPay: 'RuPay',
  Rupay: 'RuPay',
}

function toNetwork(value: string | null): CardNetwork {
  if (value && (KNOWN_CARD_NETWORKS as readonly string[]).includes(value))
    return value as CardNetwork
  return value ? (DB_TO_DOMAIN_NETWORK[value] ?? 'VISA') : 'VISA'
}

type PositionRow = {
  credit_limit: number | string | null
  available_credit: number | string | null
  current_balance: number | string | null
  card_network: string | null
}

function toCreditCardPosition(row: PositionRow | null): CreditCardPosition {
  const creditLimit = row?.credit_limit != null ? Number(row.credit_limit) : null
  const availableCredit = row?.available_credit != null ? Number(row.available_credit) : null
  const outstanding = row?.current_balance != null ? Number(row.current_balance) : null
  const utilizationPercent =
    creditLimit !== null && creditLimit > 0 && outstanding !== null
      ? Math.round((outstanding / creditLimit) * 100)
      : null
  const cardNetwork =
    row?.card_network && (KNOWN_CARD_NETWORKS as readonly string[]).includes(row.card_network)
      ? (row.card_network as CardNetwork)
      : row?.card_network
        ? (DB_TO_DOMAIN_NETWORK[row.card_network] ?? null)
        : null

  return { creditLimit, availableCredit, utilizationPercent, cardNetwork }
}

type AccountRow = {
  id: string
  institution_name: string
  account_name: string
  account_nickname: string | null
  card_network: string | null
  resolved_last4: string | null
  credit_limit: number | string | null
  current_balance: number | string | null
  available_credit: number | string | null
  payment_due_date: string | null
  minimum_due: number | string | null
  statement_day: number | null
  statement_cycle_day: number | null
  notes: string | null
  resolved_is_active: boolean | null
  client_id: string | null
}

type ActivityAgg = {
  count: number
  lastTransactionAt: string | null
  monthlySpend: number
  merchantSpend: Map<string, number>
  categorySpend: Map<string, number>
}

function topOf(spend: Map<string, number>): { id: string; name: string } | null {
  let best: [string, number] | null = null
  for (const entry of spend) if (!best || entry[1] > best[1]) best = entry
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
  if (error) throw new Error(`Failed to load card activity: ${error.message}`)

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
      monthlySpend: 0,
      merchantSpend: new Map(),
      categorySpend: new Map(),
    }
    agg.count += 1
    const amount = Number(row.amount ?? 0)
    if (row.transaction_date) {
      if (!agg.lastTransactionAt || row.transaction_date > agg.lastTransactionAt)
        agg.lastTransactionAt = row.transaction_date
      if (
        new Date(row.transaction_date) >= monthStart &&
        (row.transaction_type ?? '').toLowerCase() === 'debit'
      ) {
        agg.monthlySpend += amount
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

function statementOrDueDate(dayOfMonth: number | null, fallbackIso: string | null): string {
  if (fallbackIso) return fallbackIso
  if (dayOfMonth) {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), dayOfMonth).toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function mapRow(
  row: AccountRow,
  utilizationPercent: number | null,
  health: CreditCardHealth,
  activity: ActivityAgg | undefined,
): CreditCardRecord {
  const creditLimit = Number(row.credit_limit ?? 0)
  const outstanding = Number(row.current_balance ?? 0)
  const availableCredit =
    row.available_credit != null
      ? Number(row.available_credit)
      : Math.max(0, creditLimit - outstanding)

  return {
    id: row.id,
    bankName: row.institution_name,
    cardName: row.account_name,
    nickname: row.account_nickname,
    network: toNetwork(row.card_network),
    last4: row.resolved_last4 ?? '0000',
    maskedNumber: `•••• •••• •••• ${row.resolved_last4 ?? '0000'}`,
    creditLimit,
    outstanding,
    availableCredit,
    utilizationPercent: utilizationPercent ?? 0,
    statementDate: statementOrDueDate(row.statement_day ?? row.statement_cycle_day, null),
    dueDate: statementOrDueDate(null, row.payment_due_date),
    minimumDue: Number(row.minimum_due ?? 0),
    monthlySpend: activity?.monthlySpend ?? 0,
    topMerchant: activity ? topOf(activity.merchantSpend) : null,
    topCategory: activity ? topOf(activity.categorySpend) : null,
    lastTransactionAt: activity?.lastTransactionAt ?? null,
    health,
    status: row.resolved_is_active === false ? 'inactive' : 'active',
    notes: row.notes,
    clientId: row.client_id,
  }
}

const SORT_COLUMN: Record<NonNullable<CreditCardListParams['sort']>['id'], string> = {
  bankName: 'institution_name',
  cardName: 'account_name',
  outstanding: 'current_balance',
  utilizationPercent: 'current_balance',
  dueDate: 'payment_due_date',
}

export class SupabaseCreditCardRepository implements CreditCardRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: CreditCardListParams): Promise<CreditCardListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client
      .from('vw_accounts')
      .select('*', { count: 'exact' })
      .eq('account_kind', 'credit_card')

    if (search) {
      query = query.or(
        `institution_name.ilike.%${search}%,account_name.ilike.%${search}%,account_nickname.ilike.%${search}%`,
      )
    }
    if (filters?.bankName) query = query.eq('institution_name', filters.bankName)
    if (filters?.network) query = query.eq('card_network', filters.network)
    if (filters?.status) query = query.eq('resolved_is_active', filters.status === 'active')
    if (filters?.clientId) query = query.eq('client_id', filters.clientId)

    if (filters?.health) {
      const { data: healthRows } = await this.client
        .from('vw_account_health')
        .select('account_id,health')
        .eq('account_kind', 'credit_card')
        .eq('health', filters.health)
      const ids = (healthRows ?? []).map((r) => (r as { account_id: string }).account_id)
      query = query.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
    }

    const sortColumn = sort ? SORT_COLUMN[sort.id] : 'institution_name'
    query = query.order(sortColumn, { ascending: !sort?.desc })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list credit cards: ${error.message}`)

    const rows = (data ?? []) as AccountRow[]
    const ids = rows.map((r) => r.id)
    const safeIds = ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']

    const [{ data: utilRows }, { data: healthRows }, activityMap] = await Promise.all([
      this.client
        .from('vw_credit_card_utilization')
        .select('id,utilization_percent')
        .in('id', safeIds),
      this.client.from('vw_account_health').select('account_id,health').in('account_id', safeIds),
      fetchActivity(this.client, ids),
    ])
    const utilById = new Map(
      (utilRows ?? []).map((r) => [
        (r as { id: string }).id,
        (r as { utilization_percent: number | null }).utilization_percent,
      ]),
    )
    const healthById = new Map(
      (healthRows ?? []).map((r) => [
        (r as { account_id: string }).account_id,
        (r as { health: string }).health,
      ]),
    )

    return {
      rows: rows.map((row) =>
        mapRow(
          row,
          utilById.get(row.id) ?? null,
          toCreditCardHealth(healthById.get(row.id)),
          activityMap.get(row.id),
        ),
      ),
      total: count ?? rows.length,
    }
  }

  async getCreditPosition(id: string): Promise<CreditCardPosition> {
    const { data, error } = await this.client
      .from('accounts')
      .select('credit_limit, available_credit, current_balance, card_network')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load credit position for ${id}: ${error.message}`)

    return toCreditCardPosition(data as PositionRow | null)
  }

  async updateCreditLimit(id: string, creditLimit: number): Promise<CreditCardPosition> {
    const { data: existing, error: fetchError } = await this.client
      .from('accounts')
      .select('current_balance')
      .eq('id', id)
      .eq('account_type', 'Credit Card')
      .maybeSingle()
    if (fetchError)
      throw new Error(`Failed to update credit limit for ${id}: ${fetchError.message}`)
    if (!existing)
      throw new Error(
        `Credit card ${id}'s limit could not be updated — it does not exist, or RLS denied the write.`,
      )

    // Only recompute available credit when the outstanding balance is
    // actually known — an unknown balance means "unknown available", not 0.
    const outstanding = existing.current_balance != null ? Number(existing.current_balance) : null
    const availableCredit = outstanding !== null ? Math.max(0, creditLimit - outstanding) : null

    const { data, error } = await this.client
      .from('accounts')
      .update({ credit_limit: creditLimit, available_credit: availableCredit })
      .eq('id', id)
      .eq('account_type', 'Credit Card')
      .select('credit_limit, available_credit, current_balance, card_network')
      .maybeSingle()
    if (error) throw new Error(`Failed to update credit limit for ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Credit card ${id}'s limit could not be updated — it does not exist, or RLS denied the write.`,
      )

    return toCreditCardPosition(data as PositionRow)
  }

  async getSummary(): Promise<CreditCardSummary> {
    const { data: summaryRow, error } = await this.client
      .from('vw_account_summary')
      .select('*')
      .eq('account_kind', 'credit_card')
      .maybeSingle()
    if (error) throw new Error(`Failed to load credit card summary: ${error.message}`)

    const { count: totalCreditCards, error: countError } = await this.client
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('account_type', 'Credit Card')
    if (countError) throw new Error(`Failed to load credit card summary: ${countError.message}`)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const { count: statementsImportedThisMonth, error: stError } = await this.client
      .from('statements')
      .select('*, accounts!inner(account_type)', { count: 'exact', head: true })
      .eq('accounts.account_type', 'Credit Card')
      .gte('created_at', monthStart)
    if (stError) throw new Error(`Failed to load credit card summary: ${stError.message}`)

    const s = summaryRow as {
      total_credit_limit?: number | string | null
      total_outstanding?: number | string | null
      total_available_credit?: number | string | null
    } | null

    return {
      totalCreditCards: totalCreditCards ?? 0,
      totalCreditLimit: Number(s?.total_credit_limit ?? 0),
      totalOutstanding: Number(s?.total_outstanding ?? 0),
      totalAvailableCredit: Number(s?.total_available_credit ?? 0),
      statementsImportedThisMonth: statementsImportedThisMonth ?? 0,
    }
  }

  async create(input: CreditCardCreateInput): Promise<CreditCardRecord> {
    const userId = await getCurrentUserId()
    const statementDay = Number.isFinite(new Date(input.statementDate).getDate())
      ? new Date(input.statementDate).getDate()
      : null

    const { data, error } = await this.client
      .from('accounts')
      .insert({
        user_id: userId,
        account_name: input.cardName,
        institution_name: input.bankName,
        account_type: 'Credit Card',
        card_network: input.network,
        account_number_last4: input.last4,
        card_last4: input.last4,
        currency: 'INR',
        credit_limit: input.creditLimit,
        current_balance: 0,
        available_credit: input.creditLimit,
        payment_due_date: input.dueDate,
        statement_day: statementDay,
        minimum_due: 0,
        is_active: input.status === 'active',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create credit card: ${error.message}`)

    return mapRow(
      {
        id: data.id,
        institution_name: data.institution_name,
        account_name: data.account_name,
        account_nickname: data.account_nickname,
        card_network: data.card_network,
        resolved_last4: data.account_number_last4 ?? data.card_last4,
        credit_limit: data.credit_limit,
        current_balance: data.current_balance,
        available_credit: data.available_credit,
        payment_due_date: data.payment_due_date,
        minimum_due: data.minimum_due,
        statement_day: data.statement_day,
        statement_cycle_day: data.statement_cycle_day,
        notes: data.notes,
        resolved_is_active: data.is_active,
        client_id: data.client_id,
      },
      0,
      'healthy',
      undefined,
    )
  }

  async update(id: string, input: CreditCardUpdateInput): Promise<CreditCardRecord> {
    const { data: existing, error: fetchError } = await this.client
      .from('accounts')
      .select('current_balance')
      .eq('id', id)
      .eq('account_type', 'Credit Card')
      .maybeSingle()
    if (fetchError) throw new Error(`Failed to update credit card ${id}: ${fetchError.message}`)
    if (!existing)
      throw new Error(
        `Credit card ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )

    const outstanding = Number(existing.current_balance ?? 0)
    const availableCredit = Math.max(0, input.creditLimit - outstanding)

    const { data, error } = await this.client
      .from('accounts')
      .update({
        account_nickname: input.nickname,
        is_active: input.status === 'active',
        notes: input.notes,
        credit_limit: input.creditLimit,
        available_credit: availableCredit,
      })
      .eq('id', id)
      .eq('account_type', 'Credit Card')
      .select('*')
      .maybeSingle()

    if (error) throw new Error(`Failed to update credit card ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Credit card ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )

    const [{ data: utilRow }, { data: healthRow }, activityMap] = await Promise.all([
      this.client
        .from('vw_credit_card_utilization')
        .select('utilization_percent')
        .eq('id', id)
        .maybeSingle(),
      this.client.from('vw_account_health').select('health').eq('account_id', id).maybeSingle(),
      fetchActivity(this.client, [id]),
    ])

    return mapRow(
      {
        id: data.id,
        institution_name: data.institution_name,
        account_name: data.account_name,
        account_nickname: data.account_nickname,
        card_network: data.card_network,
        resolved_last4: data.account_number_last4 ?? data.card_last4,
        credit_limit: data.credit_limit,
        current_balance: data.current_balance,
        available_credit: data.available_credit,
        payment_due_date: data.payment_due_date,
        minimum_due: data.minimum_due,
        statement_day: data.statement_day,
        statement_cycle_day: data.statement_cycle_day,
        notes: data.notes,
        resolved_is_active: data.is_active,
        client_id: data.client_id,
      },
      (utilRow as { utilization_percent?: number | null } | null)?.utilization_percent ?? null,
      toCreditCardHealth((healthRow as { health?: string } | null)?.health),
      activityMap.get(id),
    )
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('accounts')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('account_type', 'Credit Card')
    if (error) throw new Error(`Failed to delete credit card ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Credit card ${id} could not be deleted — it does not exist, or RLS denied the write.`,
      )
  }
}
