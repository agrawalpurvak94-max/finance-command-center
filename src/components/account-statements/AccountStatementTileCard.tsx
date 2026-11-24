import { Landmark, CreditCard as CreditCardIcon, FileX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SpotlightOverlay } from '@/components/ui/spotlight-overlay'
import { useSpotlight } from '@/hooks/useSpotlight'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { AccountStatementTile } from '@/domain/AccountStatements'

function formatDateLong(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmountOrDash(value: number | null): string {
  return value === null ? '—' : formatINR(value)
}

interface AccountStatementTileCardProps {
  tile: AccountStatementTile
  onOpen: (tile: AccountStatementTile) => void
  /** Position within the current grid, for the entrance stagger. Capped
   * below so a 20+ tile grid doesn't produce a long, sluggish-feeling
   * settle time — everything past the cap animates in together. */
  index?: number
}

const MAX_STAGGER_INDEX = 8
const STAGGER_STEP_SECONDS = 0.05

/**
 * Statement-analysis tile — deliberately shows ONLY statement-derived
 * fields (never live/current transaction activity, per Account Statements'
 * "not real-time" purpose). Distinguishes "no statement yet" from "statement
 * exists with a genuine ₹0" — never collapses the two into the same display.
 *
 * Institution identity (avatar color/initials, accent bar, header wash) is
 * fully data-driven via `getInstitutionIdentity` — this component never
 * branches on a specific bank name.
 */
export function AccountStatementTileCard({
  tile,
  onOpen,
  index = 0,
}: AccountStatementTileCardProps) {
  const Icon = tile.kind === 'credit_card' ? CreditCardIcon : Landmark
  const identity = getInstitutionIdentity(tile.institutionName)
  const shouldReduceMotion = useReducedMotion()
  const spotlight = useSpotlight()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: 'easeOut',
        delay: Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_SECONDS,
      }}
      className="h-full"
    >
      <button
        type="button"
        data-account-statement-tile-trigger={tile.id}
        onClick={() => onOpen(tile)}
        onMouseMove={spotlight.onMouseMove}
        onMouseEnter={spotlight.onMouseEnter}
        onMouseLeave={spotlight.onMouseLeave}
        aria-label={`View statements for ${tile.name}`}
        style={{ ['--glow-ring-color' as string]: identity.glowColor }}
        className={cn(
          'group glow-ring-hover relative flex h-full w-full flex-col gap-md overflow-hidden rounded-xl border border-border bg-card p-md text-left shadow-sm ring-0 transition-all duration-200',
          'hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg hover:ring-1',
          'active:translate-y-0 active:scale-[0.99] active:duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          identity.ringClassName,
        )}
      >
        <span
          aria-hidden="true"
          className={cn('absolute inset-x-0 top-0 h-0.75', identity.barClassName)}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-br opacity-60',
            identity.gradientClassName,
          )}
        />
        <SpotlightOverlay
          background={spotlight.background}
          opacity={spotlight.opacity}
          color={identity.glowColor}
        />

        <div className="relative flex items-start justify-between gap-sm">
          <div className="flex min-w-0 flex-1 items-center gap-sm">
            <Avatar className="shrink-0 transition-[transform,filter] duration-200 group-hover:scale-105 group-hover:brightness-110">
              <AvatarFallback className={cn('font-semibold', identity.chipClassName)}>
                {identity.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {/* Same treatment as Financial Pulse's AccountCard: text-body-sm/
                  font-bold (bumped up from text-[10px] — matches Financial
                  Pulse's own size fix) and colored with this tile's own
                  institution accent (identity.textClassName) instead of a
                  fixed text-primary, so the holder name always matches the
                  tile's own accent bar/avatar. */}
              <p
                className={cn(
                  'truncate text-body-sm font-bold uppercase tracking-wide',
                  identity.textClassName,
                )}
              >
                {tile.accountHolder || 'Holder not assigned'}
              </p>
              {tile.kind === 'credit_card' ? (
                <>
                  <p className="truncate text-body-sm text-muted-foreground">
                    {tile.institutionName}
                  </p>
                  <p className="truncate text-body-md font-semibold text-foreground">
                    {tile.cardProduct ?? 'Product not configured'} Credit Card
                  </p>
                </>
              ) : (
                <>
                  <p className="truncate text-body-md font-semibold text-foreground">{tile.name}</p>
                  <p className="truncate text-body-sm text-muted-foreground">
                    {tile.institutionName}
                  </p>
                </>
              )}
            </div>
          </div>
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="relative flex min-w-0 items-center gap-xs text-body-sm">
          <span className="shrink-0 rounded bg-muted-foreground/10 px-1.5 py-0.5 text-label-caps font-semibold uppercase tracking-wide text-muted-foreground">
            {tile.accountType}
          </span>
          <span className="shrink-0 font-mono text-xs tracking-wider text-muted-foreground">
            •••• {tile.maskedNumber.slice(-4)}
          </span>
        </div>

        {!tile.hasStatement ? (
          <div className="relative flex flex-1 items-center justify-center gap-sm rounded-lg border border-dashed border-border bg-muted/30 p-md text-body-sm text-muted-foreground">
            <FileX className="size-4 shrink-0" aria-hidden="true" />
            Statement not available
          </div>
        ) : (
          <>
            <div className="relative min-w-0">
              <p className="text-label-caps uppercase text-muted-foreground">Statement Period</p>
              <p className="truncate text-body-md font-semibold text-foreground">
                {tile.statementPeriodLabel || '—'}
              </p>
            </div>

            <div className="relative grid grid-cols-2 gap-sm rounded-lg bg-muted/40 p-sm text-table-mono">
              <div className="min-w-0">
                <p className="text-muted-foreground">
                  {tile.kind === 'credit_card' ? 'Statement Spend' : 'Total Debits'}
                </p>
                <p className="truncate font-semibold tabular-nums text-foreground">
                  {formatAmountOrDash(tile.totalDebits)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">
                  {tile.kind === 'credit_card' ? 'Statement Credits' : 'Total Credits'}
                </p>
                <p className="truncate font-semibold tabular-nums text-foreground">
                  {formatAmountOrDash(tile.totalCredits)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Statement Date</p>
                <p className="truncate font-semibold text-foreground">
                  {formatDateLong(tile.statementDate)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Due Date</p>
                <p className="truncate font-semibold text-foreground">
                  {tile.dueDate ? formatDateLong(tile.dueDate) : '—'}
                </p>
              </div>
            </div>

            {tile.kind === 'credit_card' && (
              <div className="relative grid grid-cols-2 gap-sm rounded-lg bg-primary/5 p-sm text-table-mono">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Total Amount Due</p>
                  <p className="truncate font-semibold tabular-nums text-foreground">
                    {formatAmountOrDash(tile.statementTotalAmountDue)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Minimum Due</p>
                  <p className="truncate font-semibold tabular-nums text-foreground">
                    {formatAmountOrDash(tile.minimumDue)}
                  </p>
                </div>
              </div>
            )}

            <div className="relative mt-auto flex items-center justify-between gap-sm border-t border-border pt-sm text-body-sm text-muted-foreground">
              <span>{tile.transactionsExtracted} statement transactions</span>
              {tile.closingBalance !== null && (
                <span className="tabular-nums">Closing: {formatINR(tile.closingBalance)}</span>
              )}
            </div>
          </>
        )}
      </button>
    </motion.div>
  )
}
