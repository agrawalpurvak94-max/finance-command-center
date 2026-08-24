import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CalendarRange,
  Tag,
  Store,
  Users,
  ArrowLeftRight,
  Briefcase,
  FileStack,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { QueryBoundary } from '@/components/QueryBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/transactions/FilterChip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatementsTabBar } from '@/components/statements/StatementsTabBar'
import { AnalyticsKpiGrid } from '@/components/analytics/AnalyticsKpiGrid'
import { SpendTrendChart } from '@/components/analytics/SpendTrendChart'
import { CategorySpendChart } from '@/components/analytics/CategorySpendChart'
import { MerchantSpendChart } from '@/components/analytics/MerchantSpendChart'
import { ClientSpendChart } from '@/components/analytics/ClientSpendChart'
import { BizPersonalSpendChart } from '@/components/analytics/BizPersonalSpendChart'
import { useStatementAnalytics } from '@/hooks/useStatementAnalytics'
import { useStatementSelectorOptions } from '@/hooks/useStatementExplorer'
import {
  useTransactionCategories,
  useTransactionClients,
  useTransactionMerchants,
} from '@/hooks/useTransactions'
import type { AnalyticsFilters, AnalyticsGranularity } from '@/domain/Analytics'
import type { StatementAnalyticsFilters } from '@/domain/StatementAnalytics'

const emptyFilters: StatementAnalyticsFilters = {}

const DRILL_DOWN_KEYS = [
  'dateFrom',
  'dateTo',
  'clientId',
  'type',
  'ownerType',
] as const satisfies readonly (keyof AnalyticsFilters)[]

/**
 * Statement Analytics (Statements module, Tab 3) — sourced exclusively from
 * `public.statement_transactions` via `statement-analytics.service.ts`.
 * Reuses Module 10's dataset-agnostic chart components (`AnalyticsKpiGrid`,
 * `CategorySpendChart`, etc. — see that service's header comment for why
 * that's safe) with entirely separate local state; nothing here reads
 * `public.transactions`, and nothing in the real-time Analytics page
 * imports from this file. Drill-downs navigate to `/statements/explorer`
 * (Statement Explorer's cross-statement mode), never `/transactions` — a
 * number computed from statements must never send the user to the
 * unrelated real-time ledger.
 */
export function StatementAnalytics() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<StatementAnalyticsFilters>(emptyFilters)
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('month')

  const statementOptionsQuery = useStatementSelectorOptions()
  const categoriesQuery = useTransactionCategories()
  const merchantsQuery = useTransactionMerchants()
  const clientsQuery = useTransactionClients()

  const analytics = useStatementAnalytics(filters, granularity)

  const handlers = {
    hoveredDimension: null,
    onHover: () => {},
    onCrossFilter: (dimension: Partial<AnalyticsFilters>) => {
      setFilters((prev) => ({ ...prev, ...dimension }))
    },
    onDrillDown: (extra: Partial<AnalyticsFilters>) => {
      const merged: StatementAnalyticsFilters = { ...filters, ...extra }
      const params = new URLSearchParams()
      const category = categoriesQuery.data?.find((c) => c.id === merged.categoryId)
      if (category) params.set('category', category.name)
      const merchant = merchantsQuery.data?.find((m) => m.id === merged.merchantId)
      if (merchant) params.set('merchant', merchant.name)
      for (const key of DRILL_DOWN_KEYS) {
        const value = merged[key]
        if (value !== undefined) params.set(key, String(value))
      }
      navigate(`/statements/explorer?${params.toString()}`)
    },
  }

  const hasActiveFilters =
    !!filters.statementId ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.categoryId ||
    !!filters.merchantId ||
    !!filters.clientId ||
    !!filters.type ||
    !!filters.ownerType

  return (
    <PageContainer className="flex flex-col gap-lg">
      <div>
        <h1 className="text-headline-lg text-foreground">Statement Analytics</h1>
        <p className="text-body-sm text-muted-foreground">
          Spending trends and breakdowns computed from your imported statements — never real-time
          transactions.
        </p>
      </div>

      <StatementsTabBar active="analytics" explorerHref="/statements/explorer" />

      <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
        <FilterChip icon={FileStack} label="Statement" isActive={!!filters.statementId}>
          <Select
            value={filters.statementId ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, statementId: v && v !== '__all__' ? v : undefined }))
            }
          >
            <SelectTrigger aria-label="Statement filter" className="w-full">
              <SelectValue placeholder="All statements">
                {(current: string) =>
                  current === '__all__'
                    ? 'All statements'
                    : (statementOptionsQuery.data?.find((s) => s.id === current)?.label ?? current)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statements</SelectItem>
              {(statementOptionsQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterChip>

        <FilterChip
          icon={CalendarRange}
          label="Date Range"
          isActive={!!(filters.dateFrom || filters.dateTo)}
        >
          <div className="flex flex-col gap-sm">
            <div>
              <Label htmlFor="stmt-analytics-date-from">From</Label>
              <Input
                id="stmt-analytics-date-from"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))
                }
              />
            </div>
            <div>
              <Label htmlFor="stmt-analytics-date-to">To</Label>
              <Input
                id="stmt-analytics-date-to"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }))
                }
              />
            </div>
          </div>
        </FilterChip>

        <FilterChip icon={Tag} label="Category" isActive={!!filters.categoryId}>
          <Select
            value={filters.categoryId ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, categoryId: v && v !== '__all__' ? v : undefined }))
            }
          >
            <SelectTrigger aria-label="Category filter" className="w-full">
              <SelectValue placeholder="All categories">
                {(current: string) =>
                  current === '__all__'
                    ? 'All categories'
                    : (categoriesQuery.data?.find((c) => c.id === current)?.name ?? current)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {(categoriesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterChip>

        <FilterChip icon={Store} label="Merchant" isActive={!!filters.merchantId}>
          <Select
            value={filters.merchantId ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, merchantId: v && v !== '__all__' ? v : undefined }))
            }
          >
            <SelectTrigger aria-label="Merchant filter" className="w-full">
              <SelectValue placeholder="All merchants">
                {(current: string) =>
                  current === '__all__'
                    ? 'All merchants'
                    : (merchantsQuery.data?.find((m) => m.id === current)?.name ?? current)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All merchants</SelectItem>
              {(merchantsQuery.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterChip>

        <FilterChip icon={Users} label="Client" isActive={!!filters.clientId}>
          <Select
            value={filters.clientId ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, clientId: v && v !== '__all__' ? v : undefined }))
            }
          >
            <SelectTrigger aria-label="Client filter" className="w-full">
              <SelectValue placeholder="All clients">
                {(current: string) =>
                  current === '__all__'
                    ? 'All clients'
                    : (clientsQuery.data?.find((c) => c.id === current)?.name ?? current)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All clients</SelectItem>
              {(clientsQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterChip>

        <FilterChip icon={ArrowLeftRight} label="Debit/Credit" isActive={!!filters.type}>
          <Select
            value={filters.type ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                type: v && v !== '__all__' ? (v as 'debit' | 'credit') : undefined,
              }))
            }
          >
            <SelectTrigger aria-label="Debit or credit filter" className="w-full">
              <SelectValue placeholder="Debit or credit">
                {(current: string) =>
                  current === '__all__' ? 'All' : current === 'debit' ? 'Debit' : 'Credit'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </FilterChip>

        <FilterChip icon={Briefcase} label="Biz/Pers" isActive={!!filters.ownerType}>
          <Select
            value={filters.ownerType ?? '__all__'}
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                ownerType: v && v !== '__all__' ? (v as 'business' | 'personal') : undefined,
              }))
            }
          >
            <SelectTrigger aria-label="Business or personal filter" className="w-full">
              <SelectValue placeholder="Business or personal">
                {(current: string) =>
                  current === '__all__' ? 'All' : current === 'business' ? 'Business' : 'Personal'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </FilterChip>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters)}>
            Clear Filters
          </Button>
        )}
      </div>

      <QueryBoundary query={analytics.summary} skeleton={<Skeleton className="h-40 rounded-xl" />}>
        {(summary) => <AnalyticsKpiGrid summary={summary} {...handlers} />}
      </QueryBoundary>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QueryBoundary
            query={analytics.spendTrend}
            skeleton={<Skeleton className="h-96 rounded-xl" />}
          >
            {(data) => (
              <SpendTrendChart
                data={data}
                granularity={granularity}
                onGranularityChange={setGranularity}
                viewLabel="View in Statement Explorer"
                {...handlers}
              />
            )}
          </QueryBoundary>
        </div>
        <QueryBoundary
          query={analytics.categorySpend}
          skeleton={<Skeleton className="h-96 rounded-xl" />}
        >
          {(data) => (
            <CategorySpendChart data={data} viewLabel="View in Statement Explorer" {...handlers} />
          )}
        </QueryBoundary>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <QueryBoundary
          query={analytics.merchantSpend}
          skeleton={<Skeleton className="h-80 rounded-xl" />}
        >
          {(data) => (
            <MerchantSpendChart data={data} viewLabel="View in Statement Explorer" {...handlers} />
          )}
        </QueryBoundary>
        <QueryBoundary
          query={analytics.clientSpend}
          skeleton={<Skeleton className="h-80 rounded-xl" />}
        >
          {(data) => (
            <ClientSpendChart data={data} viewLabel="View in Statement Explorer" {...handlers} />
          )}
        </QueryBoundary>
      </div>

      <QueryBoundary
        query={analytics.ownerTypeSpend}
        skeleton={<Skeleton className="h-80 rounded-xl" />}
      >
        {(data) => (
          <BizPersonalSpendChart data={data} viewLabel="View in Statement Explorer" {...handlers} />
        )}
      </QueryBoundary>
    </PageContainer>
  )
}

export default StatementAnalytics
