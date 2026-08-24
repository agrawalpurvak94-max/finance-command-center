import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/layouts/AppShell'
import { Skeleton } from '@/components/ui/skeleton'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const Statements = lazy(() => import('@/pages/Statements'))
const StatementExplorer = lazy(() => import('@/pages/StatementExplorer'))
const StatementAnalytics = lazy(() => import('@/pages/StatementAnalytics'))
const Merchants = lazy(() => import('@/pages/Merchants'))
const Categories = lazy(() => import('@/pages/Categories'))
const Clients = lazy(() => import('@/pages/Clients'))
const CreditCards = lazy(() => import('@/pages/CreditCards'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/**
 * "Financial Accounts" (/accounts) was folded into the unified Account
 * Statements page (/credit-cards) — this keeps any bookmarked/external
 * link working (compatibility redirect) rather than 404ing, while the
 * sidebar item itself is gone (see lib/navigation.ts). Preserves the query
 * string (e.g. ?clientId=…) across the redirect.
 */
function AccountsRedirect() {
  const location = useLocation()
  return <Navigate to={`/credit-cards${location.search}`} replace />
}

const queryClient = new QueryClient()

function RouteFallback() {
  return (
    <div className="flex flex-1 flex-col gap-md p-lg">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="accounts" element={<AccountsRedirect />} />
              <Route path="credit-cards" element={<CreditCards />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="statements" element={<Statements />} />
              <Route path="statements/explorer" element={<StatementExplorer />} />
              <Route path="statements/analytics" element={<StatementAnalytics />} />
              <Route path="statements/:statementId" element={<StatementExplorer />} />
              <Route path="categories" element={<Categories />} />
              <Route path="merchants" element={<Merchants />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
