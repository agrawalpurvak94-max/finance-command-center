import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Landmark } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { AccountsHeader } from '@/components/accounts/AccountsHeader'
import { AccountSummaryWidget } from '@/components/accounts/AccountSummaryWidget'
import { BankAccountCard } from '@/components/accounts/BankAccountCard'
import { BankAccountFormDialog } from '@/components/accounts/BankAccountFormDialog'
import { BankAccountDrawer } from '@/components/accounts/BankAccountDrawer'
import {
  useBankAccountsList,
  useBankAccountsSummary,
  useCreateBankAccount,
  useSyncAllBankAccounts,
} from '@/hooks/useAccounts'
import type { BankAccountRecord } from '@/domain/Account'

const PAGE_SIZE = 100

function BankAccountGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function Accounts() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewingAccount, setReviewingAccount] = useState<BankAccountRecord | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // See Merchants.tsx (Module 6) for why a captured id — not a DOM ref — is
  // used to restore focus, and why the scroll position is saved/restored
  // explicitly: Base UI's Sheet scroll-lock clamps window.scrollY on open
  // and never un-clamps on its own.
  const reviewTriggerAccountId = useRef<string | null>(null)
  const scrollPositionRef = useRef<number | null>(null)

  const summaryQuery = useBankAccountsSummary()
  const listQuery = useBankAccountsList({
    page: 1,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    sort: { id: 'bankName', desc: false },
  })

  const createAccount = useCreateBankAccount()
  const syncAll = useSyncAllBankAccounts()

  const handleOpenAccount = useCallback((account: BankAccountRecord) => {
    reviewTriggerAccountId.current = account.id
    scrollPositionRef.current = window.scrollY
    setReviewingAccount(account)
    setReviewOpen(true)
  }, [])

  const handleViewTransactions = useCallback(
    (account: BankAccountRecord) => {
      navigate(`/transactions?bankAccountId=${encodeURIComponent(account.id)}`)
    },
    [navigate],
  )

  const handleViewStatements = useCallback(
    (account: BankAccountRecord) => {
      navigate(`/statements?accountId=${encodeURIComponent(account.id)}`)
    },
    [navigate],
  )

  function handleSyncAll() {
    syncAll.mutate(undefined, {
      onSuccess: () => setToastMessage('All accounts synced.'),
    })
  }

  const hasActiveSearch = !!search

  return (
    <PageContainer className="flex flex-col gap-md">
      <AccountsHeader
        onLinkAccount={() => setFormOpen(true)}
        onSyncAll={handleSyncAll}
        isSyncing={syncAll.isPending}
      />

      <AccountSummaryWidget query={summaryQuery} />

      <div className="relative max-w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bank name, account name, nickname…"
          className="pl-9"
          aria-label="Search bank accounts"
        />
      </div>

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing <span className="font-bold text-foreground">{listQuery.data?.total ?? 0}</span> of{' '}
          {listQuery.data?.total ?? 0} bank accounts
        </span>
      </div>

      <QueryBoundary
        query={listQuery}
        skeleton={<BankAccountGridSkeleton />}
        isEmpty={(data) => data.rows.length === 0}
        empty={
          <EmptyState
            icon={Landmark}
            title={hasActiveSearch ? 'No bank accounts match your search' : 'No bank accounts yet'}
            description={
              hasActiveSearch
                ? 'Try clearing the search to see more results.'
                : 'Link a bank account to start seeing balances and activity here.'
            }
            action={{ label: 'Clear search', href: '/accounts' }}
          />
        }
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                isSelected={reviewOpen ? reviewingAccount?.id === account.id : false}
                onOpen={handleOpenAccount}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <BankAccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        isPending={createAccount.isPending}
        onSubmit={(input) => {
          createAccount.mutate(input, {
            onSuccess: () => {
              setFormOpen(false)
              setToastMessage(`${input.accountName} linked.`)
            },
          })
        }}
      />

      <BankAccountDrawer
        account={reviewingAccount}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onClosed={() => {
          const restoreY = scrollPositionRef.current
          if (restoreY !== null) window.scrollTo(0, restoreY)

          const id = reviewTriggerAccountId.current
          if (!id) return
          setTimeout(() => {
            document
              .querySelector<HTMLElement>(`[data-bank-account-card-trigger="${CSS.escape(id)}"]`)
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

export default Accounts
