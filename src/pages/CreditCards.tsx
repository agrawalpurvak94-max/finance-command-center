import { useCallback, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Search, CreditCard as CreditCardIcon } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { ActiveFilterBanner } from '@/components/ActiveFilterBanner'
import { CreditCardsHeader } from '@/components/credit-cards/CreditCardsHeader'
import { CreditCardSummaryWidget } from '@/components/credit-cards/CreditCardSummaryWidget'
import { CreditCardTile } from '@/components/credit-cards/CreditCardTile'
import { CreditCardFormDialog } from '@/components/credit-cards/CreditCardFormDialog'
import { CreditCardDrawer } from '@/components/credit-cards/CreditCardDrawer'
import {
  useCreditCardsList,
  useCreditCardsSummary,
  useCreateCreditCard,
} from '@/hooks/useCreditCards'
import { useTransactionClients } from '@/hooks/useTransactions'
import type { CreditCardRecord } from '@/domain/CreditCard'

const PAGE_SIZE = 100

// Drill-down entry point Clients (Module 7) "View Credit Cards" navigates
// here with — same shared mechanism Accounts.tsx established.
const CLIENT_ID_PARAM = 'clientId'

function readClientDrillDown(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(CLIENT_ID_PARAM) ?? undefined
}

function CreditCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function CreditCards() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Captured once on mount so clearing it doesn't reappear if the user then
  // edits filters by hand — same pattern as Accounts.tsx's drill-down.
  const [clientDrillDownId, setClientDrillDownId] = useState<string | undefined>(() =>
    readClientDrillDown(searchParams),
  )

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewingCard, setReviewingCard] = useState<CreditCardRecord | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // See Merchants.tsx (Module 6) / Accounts.tsx (Module 8) for why a
  // captured id — not a DOM ref — is used to restore focus, and why the
  // scroll position is saved/restored explicitly.
  const reviewTriggerCardId = useRef<string | null>(null)
  const scrollPositionRef = useRef<number | null>(null)

  const clientsQuery = useTransactionClients()

  const summaryQuery = useCreditCardsSummary()
  const listQuery = useCreditCardsList({
    page: 1,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    sort: { id: 'bankName', desc: false },
    filters: clientDrillDownId ? { clientId: clientDrillDownId } : undefined,
  })

  const createCard = useCreateCreditCard()

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

  const handleOpenCard = useCallback((card: CreditCardRecord) => {
    reviewTriggerCardId.current = card.id
    scrollPositionRef.current = window.scrollY
    setReviewingCard(card)
    setReviewOpen(true)
  }, [])

  const handleViewTransactions = useCallback(
    (card: CreditCardRecord) => {
      navigate(`/transactions?creditCardId=${encodeURIComponent(card.id)}`)
    },
    [navigate],
  )

  const handleViewStatements = useCallback(
    (card: CreditCardRecord) => {
      navigate(`/statements?accountId=${encodeURIComponent(card.id)}`)
    },
    [navigate],
  )

  const hasActiveSearch = !!search

  return (
    <PageContainer className="flex flex-col gap-md">
      <CreditCardsHeader onAddCreditCard={() => setFormOpen(true)} />

      {clientDrillDownId && (
        <ActiveFilterBanner
          label={`Filtered by client: ${clientDrillDownLabel}`}
          onClear={handleClearClientDrillDown}
        />
      )}

      <CreditCardSummaryWidget query={summaryQuery} />

      <div className="relative max-w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bank name, card name, last 4 digits…"
          className="pl-9"
          aria-label="Search credit cards"
        />
      </div>

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing <span className="font-bold text-foreground">{listQuery.data?.total ?? 0}</span> of{' '}
          {listQuery.data?.total ?? 0} credit cards
        </span>
      </div>

      <QueryBoundary
        query={listQuery}
        skeleton={<CreditCardGridSkeleton />}
        isEmpty={(data) => data.rows.length === 0}
        empty={
          <EmptyState
            icon={CreditCardIcon}
            title={hasActiveSearch ? 'No credit cards match your search' : 'No credit cards yet'}
            description={
              hasActiveSearch
                ? 'Try clearing the search to see more results.'
                : 'Add a credit card to start tracking limits, utilization, and due dates here.'
            }
            action={{ label: 'Clear search', href: '/credit-cards' }}
          />
        }
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((card) => (
              <CreditCardTile
                key={card.id}
                card={card}
                isSelected={reviewOpen ? reviewingCard?.id === card.id : false}
                onOpen={handleOpenCard}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <CreditCardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        isPending={createCard.isPending}
        onSubmit={(input) => {
          createCard.mutate(input, {
            onSuccess: () => {
              setFormOpen(false)
              setToastMessage(`${input.cardName} added.`)
            },
          })
        }}
      />

      <CreditCardDrawer
        card={reviewingCard}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onClosed={() => {
          const restoreY = scrollPositionRef.current
          if (restoreY !== null) window.scrollTo(0, restoreY)

          const id = reviewTriggerCardId.current
          if (!id) return
          setTimeout(() => {
            document
              .querySelector<HTMLElement>(`[data-credit-card-tile-trigger="${CSS.escape(id)}"]`)
              ?.focus({ preventScroll: true })
            if (restoreY !== null) window.scrollTo(0, restoreY)
          }, 0)
        }}
        onViewAllTransactions={handleViewTransactions}
        onViewAllStatements={handleViewStatements}
        onSaved={setToastMessage}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </PageContainer>
  )
}

export default CreditCards
