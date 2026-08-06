import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Users } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { ClientsHeader } from '@/components/clients/ClientsHeader'
import { ClientFilters } from '@/components/clients/ClientFilters'
import { ClientSummaryWidget } from '@/components/clients/ClientSummaryWidget'
import { ClientTable } from '@/components/clients/ClientTable'
import { ClientTableSkeleton } from '@/components/clients/ClientTableSkeleton'
import { ClientFormDialog } from '@/components/clients/ClientFormDialog'
import { ClientDrawer } from '@/components/clients/ClientDrawer'
import {
  useClientsList,
  useClientsSummary,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from '@/hooks/useClients'
import { useTransactionCategories } from '@/hooks/useTransactions'
import { downloadCsv, clientsToCsv } from '@/utils/csv'
import type { ClientFilters as ClientFiltersType, ClientRecord, ClientSort } from '@/domain/Client'

const emptyFilters: ClientFiltersType = {}

export function Clients() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<ClientSort | undefined>({ id: 'name', desc: false })
  const [draftFilters, setDraftFilters] = useState<ClientFiltersType>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<ClientFiltersType>(emptyFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientRecord | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewingClient, setReviewingClient] = useState<ClientRecord | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // See Merchants.tsx (Module 6) for why a captured id — not a DOM ref — is
  // used to restore focus, and why the scroll position is saved/restored
  // explicitly around the drawer open/close.
  const reviewTriggerClientId = useRef<string | null>(null)
  const scrollPositionRef = useRef<number | null>(null)

  const categoriesQuery = useTransactionCategories()

  const summaryQuery = useClientsSummary()
  const listQuery = useClientsList({
    page,
    pageSize,
    search: search || undefined,
    sort,
    filters: appliedFilters,
  })

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  function handleAddClient() {
    setEditingClient(null)
    setFormOpen(true)
  }

  const handleEditClient = useCallback((client: ClientRecord) => {
    setEditingClient(client)
    setFormOpen(true)
  }, [])

  const handleReviewClient = useCallback((client: ClientRecord) => {
    reviewTriggerClientId.current = client.id
    scrollPositionRef.current = window.scrollY
    setReviewingClient(client)
    setReviewOpen(true)
  }, [])

  const handleViewTransactions = useCallback(
    (client: ClientRecord) => {
      navigate(`/transactions?clientId=${encodeURIComponent(client.id)}`)
    },
    [navigate],
  )

  const handleViewStatements = useCallback(
    (client: ClientRecord) => {
      navigate(`/statements?clientId=${encodeURIComponent(client.id)}`)
    },
    [navigate],
  )

  const handleViewAccounts = useCallback(
    (client: ClientRecord) => {
      navigate(`/accounts?clientId=${encodeURIComponent(client.id)}`)
    },
    [navigate],
  )

  const handleViewCreditCards = useCallback(
    (client: ClientRecord) => {
      navigate(`/credit-cards?clientId=${encodeURIComponent(client.id)}`)
    },
    [navigate],
  )

  const handleDeleteClient = useCallback((client: ClientRecord) => {
    setDeleteTarget(client)
  }, [])

  const handleSortChange = useCallback((next: ClientSort) => {
    setSort(next)
    setPage(1)
  }, [])

  function handleExport() {
    if (!listQuery.data) return
    downloadCsv('clients.csv', clientsToCsv(listQuery.data.rows))
  }

  const hasActiveFiltersOrSearch = !!search || Object.keys(appliedFilters).length > 0

  const deleteWarnings = deleteTarget
    ? [
        deleteTarget.transactionCount > 0 &&
          `${deleteTarget.transactionCount} transaction${deleteTarget.transactionCount === 1 ? '' : 's'}`,
        deleteTarget.linkedAccountsCount > 0 &&
          `${deleteTarget.linkedAccountsCount} account${deleteTarget.linkedAccountsCount === 1 ? '' : 's'}`,
        deleteTarget.linkedCreditCardsCount > 0 &&
          `${deleteTarget.linkedCreditCardsCount} credit card${deleteTarget.linkedCreditCardsCount === 1 ? '' : 's'}`,
        deleteTarget.linkedStatementsCount > 0 &&
          `${deleteTarget.linkedStatementsCount} statement${deleteTarget.linkedStatementsCount === 1 ? '' : 's'}`,
      ].filter((label): label is string => !!label)
    : []

  return (
    <PageContainer className="flex flex-col gap-md">
      <ClientsHeader
        onAddClient={handleAddClient}
        onExport={handleExport}
        isExportDisabled={!listQuery.data || listQuery.data.rows.length === 0}
      />

      <ClientSummaryWidget query={summaryQuery} />

      <div className="relative max-w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search name, company, email, phone…"
          className="pl-9"
          aria-label="Search clients"
        />
      </div>

      <ClientFilters
        draft={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
        }}
        onClear={() => {
          setDraftFilters(emptyFilters)
          setAppliedFilters(emptyFilters)
          setPage(1)
        }}
        categories={categoriesQuery.data ?? []}
      />

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-bold text-foreground">
            {listQuery.data ? (page - 1) * pageSize + 1 : 0}–
            {listQuery.data ? Math.min(page * pageSize, listQuery.data.total) : 0}
          </span>{' '}
          of {listQuery.data?.total ?? 0} clients
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <QueryBoundary
          query={listQuery}
          skeleton={<ClientTableSkeleton rows={pageSize} />}
          isEmpty={(data) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={Users}
              title={
                hasActiveFiltersOrSearch
                  ? search
                    ? 'No clients match your search'
                    : 'No clients match these filters'
                  : 'No clients yet'
              }
              description={
                hasActiveFiltersOrSearch
                  ? 'Try clearing the search or filters to see more results.'
                  : 'Add a client to start tracking their transactions, accounts and statements.'
              }
              action={{ label: 'Clear filters', href: '/clients' }}
            />
          }
        >
          {(data) => (
            <ClientTable
              clients={data.rows}
              sort={sort}
              onSortChange={handleSortChange}
              onReview={handleReviewClient}
              onViewTransactions={handleViewTransactions}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              selectedClientId={reviewOpen ? reviewingClient?.id : null}
            />
          )}
        </QueryBoundary>
      </div>

      {listQuery.data && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={listQuery.data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        isPending={createClient.isPending || updateClient.isPending}
        onSubmit={(input) => {
          if (editingClient) {
            updateClient.mutate(
              { id: editingClient.id, input },
              { onSuccess: () => setFormOpen(false) },
            )
          } else if ('clientType' in input) {
            // ClientFormBody only omits `clientType` in edit mode (the
            // `editingClient` branch above) — when we're here, `client` was
            // null, so this is always the create-mode shape. The `in` check
            // narrows the union for TypeScript accordingly.
            createClient.mutate(input, { onSuccess: () => setFormOpen(false) })
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this client?"
        description={
          deleteTarget
            ? `${deleteTarget.name} — this cannot be undone.${
                deleteWarnings.length > 0
                  ? ` This client is associated with ${deleteWarnings.join(', ')}. Those records will not be deleted, but will lose their client association.`
                  : ''
              }`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteClient.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteClient.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />

      <ClientDrawer
        client={reviewingClient}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onClosed={() => {
          const restoreY = scrollPositionRef.current
          if (restoreY !== null) window.scrollTo(0, restoreY)

          const id = reviewTriggerClientId.current
          if (!id) return
          setTimeout(() => {
            document
              .querySelector<HTMLElement>(`[data-client-row-trigger="${CSS.escape(id)}"]`)
              ?.focus({ preventScroll: true })
            if (restoreY !== null) window.scrollTo(0, restoreY)
          }, 0)
        }}
        onViewAllTransactions={handleViewTransactions}
        onViewAllStatements={handleViewStatements}
        onViewAccounts={handleViewAccounts}
        onViewCreditCards={handleViewCreditCards}
        onSaved={setToastMessage}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </PageContainer>
  )
}

export default Clients
