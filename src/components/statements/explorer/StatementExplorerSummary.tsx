import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import { formatINR } from '@/utils/currency'
import type { StatementExplorerDetail } from '@/domain/StatementTransaction'

interface StatementExplorerSummaryProps {
  detail: StatementExplorerDetail
  transactionCount: number
  debitCount: number
  creditCount: number
  topCategory: string | null
  topMerchant: string | null
}

function formatMoney(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatINR(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The Statement Explorer's header panel — matches the Stitch reference's
 * "Selected Statement Header Panel" + "Compact KPI Row". Credit-card-only
 * fields (Credit Limit / Available Credit) are only rendered when the
 * selected statement's account is a credit card; bank statements never show
 * them. Every field that can genuinely be unavailable renders "—", never a
 * fabricated ₹0.
 */
export function StatementExplorerSummary({
  detail,
  transactionCount,
  debitCount,
  creditCount,
  topCategory,
  topMerchant,
}: StatementExplorerSummaryProps) {
  const { statement } = detail
  const isCard = statement.account.kind === 'credit_card'

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 gap-lg rounded-lg border border-border bg-card p-lg md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-label-caps uppercase text-muted-foreground">Total Spend</p>
          <p className="mt-xs text-display-kpi tabular-nums text-foreground">
            {formatMoney(statement.totalDebits)}
          </p>
        </div>
        <div>
          <p className="text-label-caps uppercase text-muted-foreground">
            {isCard ? 'Total Credits' : 'Total Inflow'}
          </p>
          <p className="mt-xs text-display-kpi tabular-nums text-secondary">
            {formatMoney(statement.totalCredits)}
          </p>
        </div>
        {isCard ? (
          <div>
            <p className="text-label-caps uppercase text-muted-foreground">Total Amount Due</p>
            <p className="mt-xs text-display-kpi tabular-nums text-foreground">
              {formatMoney(statement.statementTotalAmountDue)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-label-caps uppercase text-muted-foreground">Due Date</p>
            <p className="mt-xs text-display-kpi tabular-nums text-foreground">
              {formatDate(statement.dueDate)}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-muted-foreground">Transactions</span>
            <span className="text-body-md font-bold text-foreground">{transactionCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-muted-foreground">Status</span>
            <StatementStatusBadge status={statement.status} />
          </div>
          {isCard ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-label-caps uppercase text-muted-foreground">
                  Credit Limit
                </span>
                <span className="text-body-md text-foreground">
                  {formatMoney(detail.creditLimit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label-caps uppercase text-muted-foreground">
                  Available Credit
                </span>
                <span className="text-body-md text-foreground">
                  {formatMoney(detail.availableCredit)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-label-caps uppercase text-muted-foreground">Due Date</span>
              <span className="text-body-md text-foreground">{formatDate(statement.dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm md:grid-cols-5">
        <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-sm">
          <span className="text-label-caps uppercase text-muted-foreground">Transactions</span>
          <span className="text-body-sm font-bold text-foreground">{transactionCount}</span>
        </div>
        <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-sm">
          <span className="text-label-caps uppercase text-muted-foreground">Debits</span>
          <span className="text-body-sm font-bold text-foreground">{debitCount}</span>
        </div>
        <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-sm">
          <span className="text-label-caps uppercase text-muted-foreground">Credits</span>
          <span className="text-body-sm font-bold text-secondary">{creditCount}</span>
        </div>
        <div className="flex items-center justify-between gap-xs rounded border border-border bg-muted/40 p-sm">
          <span className="shrink-0 text-label-caps uppercase text-muted-foreground">
            Top Category
          </span>
          <span className="truncate text-body-sm font-bold text-foreground">
            {topCategory ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-xs rounded border border-border bg-muted/40 p-sm">
          <span className="shrink-0 text-label-caps uppercase text-muted-foreground">
            Top Merchant
          </span>
          <span className="truncate text-body-sm font-bold text-foreground">
            {topMerchant ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
