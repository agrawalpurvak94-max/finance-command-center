import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { KeyRound, Landmark, CreditCard as CreditCardIcon, Plus, Search } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { CredentialSummaryCards } from '@/components/credentials/CredentialSummaryCards'
import { CredentialTable } from '@/components/credentials/CredentialTable'
import { CredentialDetailPanel } from '@/components/credentials/CredentialDetailPanel'
import { ApiKeysCard } from '@/components/credentials/ApiKeysCard'
import { AddCreditCardModal } from '@/components/credentials/AddCreditCardModal'
import { AddBankAccountModal } from '@/components/credentials/AddBankAccountModal'
import { useCredentialsList } from '@/hooks/useCredentials'
import type { AccountCredentialKind, AccountCredentialRecord } from '@/domain/Credential'

const ADD_PARAM = 'add'
type StatusFilter = 'all' | 'configured' | 'action-required'

function matchesRecord(
  record: AccountCredentialRecord,
  term: string,
  statusFilter: StatusFilter,
): boolean {
  if (statusFilter === 'configured' && !record.statementPassword) return false
  if (statusFilter === 'action-required' && record.statementPassword) return false
  if (!term) return true
  return (
    record.institutionName.toLowerCase().includes(term) ||
    (record.cardProduct?.toLowerCase().includes(term) ?? false) ||
    record.last4.includes(term)
  )
}

function SplitSkeleton() {
  return (
    <div className="flex flex-col gap-lg xl:flex-row">
      <div className="flex flex-1 flex-col gap-sm">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full shrink-0 xl:w-105" />
    </div>
  )
}

/**
 * Credentials — standalone first-class module (no longer nested under
 * Settings, which is out of the product roadmap entirely). Visual language
 * follows `Stitch Designs/.../Credential/` (bespoke summary cards, dot+pill
 * status, docked detail panel) rather than the app's generic
 * KPICard/EntityReviewDrawer patterns — an explicit, scoped product decision
 * for this module only.
 *
 * Account Intelligence's "+ Add Credit Card"/"+ Add Bank Account" buttons
 * deep-link here via `?add=credit-card|bank-account` (captured once via lazy
 * useState initializers — same convention as `?clientId=` in
 * `CreditCards.tsx`, including leaving the param in the URL rather than
 * auto-clearing it).
 */
export function Credentials() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<AccountCredentialKind>(() =>
    searchParams.get(ADD_PARAM) === 'bank-account' ? 'bank' : 'credit_card',
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addCreditCardOpen, setAddCreditCardOpen] = useState(
    () => searchParams.get(ADD_PARAM) === 'credit-card',
  )
  const [addBankAccountOpen, setAddBankAccountOpen] = useState(
    () => searchParams.get(ADD_PARAM) === 'bank-account',
  )
  const [toast, setToast] = useState<{ message: string; description?: string } | null>(null)

  const credentialsQuery = useCredentialsList()
  const allRecords = useMemo(() => credentialsQuery.data ?? [], [credentialsQuery.data])

  const creditCardRecords = useMemo(
    () => allRecords.filter((r) => r.kind === 'credit_card'),
    [allRecords],
  )
  const bankAccountRecords = useMemo(
    () => allRecords.filter((r) => r.kind === 'bank'),
    [allRecords],
  )
  const activeKindRecords = activeTab === 'credit_card' ? creditCardRecords : bankAccountRecords

  const total = activeKindRecords.length
  const configuredCount = activeKindRecords.filter((r) => !!r.statementPassword).length
  const missingCount = total - configuredCount

  const term = search.trim().toLowerCase()
  const filteredRecords = useMemo(
    () => activeKindRecords.filter((r) => matchesRecord(r, term, statusFilter)),
    [activeKindRecords, term, statusFilter],
  )

  // Always shows something when data exists — falls back to the first
  // filtered row of the active tab, same as the Stitch reference always
  // having a row preselected. Recomputed each render, not stored, so a tab
  // switch or filter change never leaves a stale selection from the other
  // list showing.
  const selectedRecord =
    filteredRecords.find((r) => r.id === selectedId) ?? filteredRecords[0] ?? null

  function handleResolve() {
    const missing = allRecords.find((r) => !r.statementPassword)
    if (!missing) return
    setActiveTab(missing.kind)
    setSelectedId(missing.id)
  }

  return (
    <PageContainer className="flex flex-col gap-md">
      <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline-lg text-foreground">Credentials</h1>
          <p className="text-body-sm text-muted-foreground">
            Manage the credentials used to securely unlock and process automated statements across
            all financial accounts.
          </p>
        </div>
        <div className="flex gap-sm">
          <Button size="sm" variant="outline" onClick={() => setAddBankAccountOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Bank Account
          </Button>
          <Button size="sm" onClick={() => setAddCreditCardOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Credit Card
          </Button>
        </div>
      </div>

      <CredentialSummaryCards records={allRecords} onResolve={handleResolve} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab((v as AccountCredentialKind) ?? 'credit_card')
          setSelectedId(null)
        }}
      >
        <TabsList>
          <TabsTab value="credit_card">
            <CreditCardIcon className="size-4" aria-hidden="true" />
            Credit Cards
          </TabsTab>
          <TabsTab value="bank">
            <Landmark className="size-4" aria-hidden="true" />
            Bank Accounts
          </TabsTab>
        </TabsList>

        <div className="mt-md flex flex-col gap-sm rounded-lg border border-border bg-card p-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-96 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bank, card product or digits…"
              className="pl-9"
              aria-label="Search credentials"
            />
          </div>
          <div className="flex flex-wrap gap-xs">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              onClick={() => setStatusFilter('all')}
            >
              All ({total})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'configured' ? 'secondary' : 'ghost'}
              onClick={() => setStatusFilter('configured')}
            >
              Configured ({configuredCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'action-required' ? 'secondary' : 'ghost'}
              className={statusFilter !== 'action-required' ? 'text-amber-400' : ''}
              onClick={() => setStatusFilter('action-required')}
            >
              Action Required ({missingCount})
            </Button>
          </div>
        </div>

        <TabsPanel value="credit_card" className="mt-md">
          <QueryBoundary
            query={credentialsQuery}
            skeleton={<SplitSkeleton />}
            isEmpty={() => creditCardRecords.length === 0}
            empty={
              <EmptyState
                icon={KeyRound}
                title="No credit cards configured"
                description="Add a credit card to enable automated statement processing."
              />
            }
          >
            {() => (
              <div className="flex flex-col gap-lg xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <CredentialTable
                    kind="credit_card"
                    records={filteredRecords}
                    totalCount={total}
                    selectedId={selectedRecord?.id ?? null}
                    onSelect={(record) => setSelectedId(record.id)}
                  />
                </div>
                <CredentialDetailPanel
                  record={selectedRecord}
                  onSaved={(message, description) => setToast({ message, description })}
                />
              </div>
            )}
          </QueryBoundary>
        </TabsPanel>

        <TabsPanel value="bank" className="mt-md">
          <QueryBoundary
            query={credentialsQuery}
            skeleton={<SplitSkeleton />}
            isEmpty={() => bankAccountRecords.length === 0}
            empty={
              <EmptyState
                icon={KeyRound}
                title="No bank accounts configured"
                description="Add a bank account to start tracking its credentials."
              />
            }
          >
            {() => (
              <div className="flex flex-col gap-lg xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <CredentialTable
                    kind="bank"
                    records={filteredRecords}
                    totalCount={total}
                    selectedId={selectedRecord?.id ?? null}
                    onSelect={(record) => setSelectedId(record.id)}
                  />
                </div>
                <CredentialDetailPanel
                  record={selectedRecord}
                  onSaved={(message, description) => setToast({ message, description })}
                />
              </div>
            )}
          </QueryBoundary>
        </TabsPanel>
      </Tabs>

      <ApiKeysCard onSaved={(message, description) => setToast({ message, description })} />

      <AddCreditCardModal
        open={addCreditCardOpen}
        onOpenChange={setAddCreditCardOpen}
        existingCredentials={allRecords}
        onCreated={(message, description) => setToast({ message, description })}
      />

      <AddBankAccountModal
        open={addBankAccountOpen}
        onOpenChange={setAddBankAccountOpen}
        existingCredentials={allRecords}
        onCreated={(message, description) => setToast({ message, description })}
      />

      {toast && (
        <Toast
          message={toast.message}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      )}
    </PageContainer>
  )
}

export default Credentials
