import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Search, FileStack, Plus } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { ActiveFilterBanner } from '@/components/ActiveFilterBanner'
import { AccountStatementsSummaryWidget } from '@/components/account-statements/AccountStatementsSummaryWidget'
import { AccountStatementTileCard } from '@/components/account-statements/AccountStatementTileCard'
import { CreditCardFormDialog } from '@/components/credit-cards/CreditCardFormDialog'
import { BankAccountFormDialog } from '@/components/accounts/BankAccountFormDialog'
import { useAccountStatementTiles, useAccountStatementsSummary } from '@/hooks/useAccountStatements'
import { useCreateCreditCard } from '@/hooks/useCreditCards'
import { useCreateBankAccount } from '@/hooks/useAccounts'
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

/**
 * Account Statements — unified statement-analysis view (formerly separate
 * Credit Cards / Financial Accounts pages, Module 12B follow-up). Kept the
 * `CreditCards.tsx` file/route (`/credit-cards`) rather than introducing a
 * new one — internal identifier only, all visible text says "Account
 * Statements". `/accounts` now redirects here (see App.tsx).
 *
 * NOT real-time — see `account-statements.service.ts`'s header comment for
 * the statement-vs-transactions data source rule this page follows.
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
  const [creditCardFormOpen, setCreditCardFormOpen] = useState(false)
  const [bankAccountFormOpen, setBankAccountFormOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const clientsQuery = useTransactionClients()
  const summaryQuery = useAccountStatementsSummary()
  const tilesQuery = useAccountStatementTiles(clientDrillDownId)

  const createCard = useCreateCreditCard()
  const createAccount = useCreateBankAccount()

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

  const filteredTiles = useMemo(() => {
    const all = tilesQuery.data ?? []
    const term = search.trim().toLowerCase()
    return all.filter((tile) => {
      if (typeFilter !== 'all' && tile.accountType !== typeFilter) return false
      if (!term) return true
      return (
        tile.name.toLowerCase().includes(term) ||
        tile.institutionName.toLowerCase().includes(term) ||
        tile.maskedNumber.toLowerCase().includes(term) ||
        (tile.accountHolder?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [tilesQuery.data, search, typeFilter])

  const handleOpenTile = (tile: AccountStatementTile) => {
    navigate(`/statements?accountId=${encodeURIComponent(tile.id)}`)
  }

  const hasActiveSearch = !!search || typeFilter !== 'all'

  return (
    <PageContainer className="flex flex-col gap-md">
      <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline-lg text-foreground">Account Intelligence</h1>
          <p className="text-body-sm text-muted-foreground">
            A unified view of your accounts, cards and financial activity.
          </p>
        </div>
        <div className="flex gap-sm">
          <Button size="sm" variant="outline" onClick={() => setBankAccountFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Bank Account
          </Button>
          <Button size="sm" onClick={() => setCreditCardFormOpen(true)}>
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

      <AccountStatementsSummaryWidget query={summaryQuery} />

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
            placeholder="Search bank name, account name, holder, last 4 digits…"
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
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing <span className="font-bold text-foreground">{filteredTiles.length}</span> of{' '}
          {tilesQuery.data?.length ?? 0} accounts
        </span>
      </div>

      <QueryBoundary
        query={tilesQuery}
        skeleton={<TileGridSkeleton />}
        isEmpty={() => filteredTiles.length === 0}
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
            {filteredTiles.map((tile, index) => (
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

      <CreditCardFormDialog
        open={creditCardFormOpen}
        onOpenChange={setCreditCardFormOpen}
        isPending={createCard.isPending}
        onSubmit={(input) => {
          createCard.mutate(input, {
            onSuccess: () => {
              setCreditCardFormOpen(false)
              setToastMessage(`${input.cardName} added.`)
            },
          })
        }}
      />

      <BankAccountFormDialog
        open={bankAccountFormOpen}
        onOpenChange={setBankAccountFormOpen}
        isPending={createAccount.isPending}
        onSubmit={(input) => {
          createAccount.mutate(input, {
            onSuccess: () => {
              setBankAccountFormOpen(false)
              setToastMessage(`${input.accountName} linked.`)
            },
          })
        }}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </PageContainer>
  )
}

export default CreditCards
