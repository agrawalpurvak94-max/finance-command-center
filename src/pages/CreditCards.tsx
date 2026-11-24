import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Search, FileStack, Plus } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { ActiveFilterBanner } from '@/components/ActiveFilterBanner'
import { InsightsPanel } from '@/components/analytics/InsightsPanel'
import { AccountStatementsSummaryWidget } from '@/components/account-statements/AccountStatementsSummaryWidget'
import { CreditCardPaymentSummaryWidget } from '@/components/account-statements/CreditCardPaymentSummary'
import { AccountStatementTileCard } from '@/components/account-statements/AccountStatementTileCard'
import { AmbientGlow } from '@/components/ui/ambient-glow'
import { useAccountStatementTiles, useAccountStatementsSummary } from '@/hooks/useAccountStatements'
import { useBankAccountsSummary } from '@/hooks/useAccounts'
import { useCreditCardsSummary } from '@/hooks/useCreditCards'
import { accountStatementsService } from '@/services/account-statements.service'
import { useTransactionClients } from '@/hooks/useTransactions'
import type { AccountStatementTile, AccountStatementType } from '@/domain/AccountStatements'

const CLIENT_ID_PARAM = 'clientId'

const TYPE_FILTERS: readonly { label: string; value: AccountStatementType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Credit Cards', value: 'Credit Card' },
  { label: 'Savings', value: 'Savings' },
  { label: 'Current', value: 'Current' },
  { label: 'Overdraft', value: 'Overdraft' },
]

function TileGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

/** Insights never carry an `actionFilter` on this page (no cross-filter target exists here), so they always render as static, non-clickable cards — this handler never fires. */
function handleInsightClick() {}

/**
 * Account Statements — unified statement-analysis view (formerly separate
 * Credit Cards / Financial Accounts pages, Module 12B follow-up). Kept the
 * `CreditCards.tsx` file/route (`/credit-cards`) rather than introducing a
 * new one — internal identifier only, all visible text says "Account
 * Statements". `/accounts` now redirects here (see App.tsx).
 *
 * NOT real-time — see `account-statements.service.ts`'s header comment for
 * the statement-vs-transactions data source rule this page follows.
 *
 * Information hierarchy (Account Intelligence UX redesign): Insights →
 * Portfolio Snapshot → Credit Card Payments → filters/search → account list.
 * The first three sections are always computed from the FULL client-scoped
 * tile list (never the type-filter/search-narrowed one) so they stay
 * meaningful portfolio-wide intelligence regardless of which accounts the
 * list below happens to be showing; only Portfolio Snapshot itself adapts
 * its metric set when the "Credit Cards" chip is active (see
 * `isCreditCardFocused`).
 */
export function CreditCards() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Captured once on mount so clearing it doesn't reappear if the user then
  // edits filters by hand — same pattern as the old Accounts.tsx/CreditCards.tsx.
  const [clientDrillDownId, setClientDrillDownId] = useState<string | undefined>(
    () => searchParams.get(CLIENT_ID_PARAM) ?? undefined,
  )
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AccountStatementType | 'all'>('all')

  const clientsQuery = useTransactionClients()
  const summaryQuery = useAccountStatementsSummary()
  const bankSummaryQuery = useBankAccountsSummary()
  const creditCardSummaryQuery = useCreditCardsSummary()
  const tilesQuery = useAccountStatementTiles(clientDrillDownId)

  function handleClearClientDrillDown() {
    if (!clientDrillDownId) return
    setClientDrillDownId(undefined)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(CLIENT_ID_PARAM)
        return next
      },
      { replace: true },
    )
  }

  const clientDrillDownLabel = clientDrillDownId
    ? (clientsQuery.data?.find((c) => c.id === clientDrillDownId)?.name ?? clientDrillDownId)
    : null

  // Portfolio-wide intelligence — Insights, the payment position, and the
  // "has any credit cards" check all read the FULL tile list, independent of
  // the type filter/search below, so switching to e.g. "Savings" doesn't
  // make "what do I owe" disappear.
  const creditCardPaymentSummary = useMemo(
    () => accountStatementsService.getCreditCardPaymentSummary(tilesQuery.data ?? []),
    [tilesQuery.data],
  )
  const upcomingCardPayments = useMemo(
    () => accountStatementsService.getUpcomingCardPayments(tilesQuery.data ?? []),
    [tilesQuery.data],
  )
  const insights = useMemo(
    () => accountStatementsService.getAccountIntelligenceInsights(tilesQuery.data ?? []),
    [tilesQuery.data],
  )
  const hasCreditCards = useMemo(
    () => (tilesQuery.data ?? []).some((tile) => tile.kind === 'credit_card'),
    [tilesQuery.data],
  )

  // The type filter + search only ever narrow what the account list/grid
  // below shows — they never affect the intelligence sections above.
  const visibleTiles = useMemo(() => {
    const all = tilesQuery.data ?? []
    const scoped =
      typeFilter === 'all' ? all : all.filter((tile) => tile.accountType === typeFilter)
    const term = search.trim().toLowerCase()
    if (!term) return scoped
    return scoped.filter(
      (tile) =>
        tile.name.toLowerCase().includes(term) ||
        tile.institutionName.toLowerCase().includes(term) ||
        (tile.cardProduct?.toLowerCase().includes(term) ?? false) ||
        tile.maskedNumber.toLowerCase().includes(term) ||
        (tile.accountHolder?.toLowerCase().includes(term) ?? false),
    )
  }, [tilesQuery.data, search, typeFilter])

  // Shared by both the tile grid and the Upcoming Payments rows — the same
  // destination either way, never a second navigation target.
  const handleOpenAccountId = (id: string) => {
    navigate(`/statements?accountId=${encodeURIComponent(id)}`)
  }
  const handleOpenTile = (tile: AccountStatementTile) => handleOpenAccountId(tile.id)

  const hasActiveSearch = !!search || typeFilter !== 'all'

  return (
    <PageContainer className="relative flex flex-col gap-md">
      <AmbientGlow className="top-0 left-1/4" />
      <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline-lg text-foreground">Account Intelligence</h1>
          <p className="text-body-sm text-muted-foreground">
            A unified view of your accounts, cards and financial activity.
          </p>
        </div>
        <div className="flex gap-sm">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/credentials?add=bank-account')}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Bank Account
          </Button>
          <Button
            size="sm"
            className="btn-shimmer"
            onClick={() => navigate('/credentials?add=credit-card')}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Credit Card
          </Button>
        </div>
      </div>

      {clientDrillDownId && (
        <ActiveFilterBanner
          label={`Filtered by client: ${clientDrillDownLabel}`}
          onClear={handleClearClientDrillDown}
        />
      )}

      <div className="flex flex-col gap-sm">
        <p className="text-label-caps uppercase text-muted-foreground">Insights</p>
        {tilesQuery.isLoading ? (
          <InsightsSkeleton />
        ) : (
          <InsightsPanel insights={insights} onInsightClick={handleInsightClick} />
        )}
      </div>

      <AccountStatementsSummaryWidget
        query={summaryQuery}
        bankSummaryQuery={bankSummaryQuery}
        creditCardSummaryQuery={creditCardSummaryQuery}
        paymentSummary={creditCardPaymentSummary}
        isCreditCardFocused={typeFilter === 'Credit Card'}
      />

      <CreditCardPaymentSummaryWidget
        summary={creditCardPaymentSummary}
        payments={upcomingCardPayments}
        hasCreditCards={hasCreditCards}
        onOpenPayment={handleOpenAccountId}
      />

      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-96 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bank name, product, holder, last 4 digits…"
            className="pl-9"
            aria-label="Search accounts"
          />
        </div>
        <div className="flex flex-wrap gap-xs">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={typeFilter === f.value ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing <span className="font-bold text-foreground">{visibleTiles.length}</span> of{' '}
          {tilesQuery.data?.length ?? 0} accounts
        </span>
      </div>

      <QueryBoundary
        query={tilesQuery}
        skeleton={<TileGridSkeleton />}
        isEmpty={() => visibleTiles.length === 0}
        empty={
          <EmptyState
            icon={FileStack}
            title={hasActiveSearch ? 'No accounts match your filters' : 'No accounts yet'}
            description={
              hasActiveSearch
                ? 'Try clearing the search or filter to see more results.'
                : 'Add a credit card or bank account to start seeing statement analysis here.'
            }
          />
        }
      >
        {() => (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTiles.map((tile, index) => (
              <AccountStatementTileCard
                key={tile.id}
                tile={tile}
                onOpen={handleOpenTile}
                index={index}
              />
            ))}
          </div>
        )}
      </QueryBoundary>
    </PageContainer>
  )
}

export default CreditCards
