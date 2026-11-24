import { Pencil, ShieldPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { PasswordCell } from '@/components/credentials/PasswordCell'
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge'
import { Button } from '@/components/ui/button'
import { credentialsToCsv, downloadCsv } from '@/utils/csv'
import type { AccountCredentialKind, AccountCredentialRecord } from '@/domain/Credential'

interface CredentialTableProps {
  kind: AccountCredentialKind
  records: readonly AccountCredentialRecord[]
  totalCount: number
  selectedId: string | null
  onSelect: (record: AccountCredentialRecord) => void
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const SECTION_COPY: Record<
  AccountCredentialKind,
  { title: string; subtitle: string; noun: string }
> = {
  credit_card: {
    title: 'Credit Card Credentials',
    subtitle:
      'Statement credentials are stored with each account and used automatically during batch parsing.',
    noun: 'Cards',
  },
  bank: {
    title: 'Bank Account Credentials',
    subtitle:
      'Statement credentials are stored with each account and used automatically during batch parsing.',
    noun: 'Accounts',
  },
}

/**
 * Row structure matches the Stitch Credentials reference (Bank Entity, Card
 * Product/Account Type, Last 4, Statement Password, Status, Last Updated,
 * Action), with the whole row clickable to select it in the docked detail
 * panel — not just the Action button, per Stitch's `onclick` on every `<tr>`.
 *
 * Deliberately single-line for Card Product — Stitch shows a second
 * descriptor line ("Corporate Tier", "SME Account", ...) that isn't backed
 * by any real column (`accounts` only has `card_product`), so it's not
 * reproduced here rather than inventing data.
 */
export function CredentialTable({
  kind,
  records,
  totalCount,
  selectedId,
  onSelect,
}: CredentialTableProps) {
  const copy = SECTION_COPY[kind]

  function handleExport() {
    downloadCsv(`credentials-${kind}.csv`, credentialsToCsv(records))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-lg py-md">
        <h2 className="text-headline-sm text-foreground">{copy.title}</h2>
        <p className="text-body-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/10 text-label-caps uppercase text-muted-foreground">
              <th className="p-md">Bank Entity</th>
              <th className="p-md">{kind === 'credit_card' ? 'Card Product' : 'Account Type'}</th>
              <th className="p-md">Last 4</th>
              <th className="p-md">Statement Password</th>
              <th className="p-md">Status</th>
              <th className="p-md text-right">Last Updated</th>
              <th className="p-md text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="p-lg text-center text-body-sm text-muted-foreground">
                  No credentials match your search.
                </td>
              </tr>
            )}
            {records.map((record) => {
              const identity = getInstitutionIdentity(record.institutionName)
              const configured = !!record.statementPassword
              const isSelected = record.id === selectedId
              return (
                <tr
                  key={record.id}
                  onClick={() => onSelect(record)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent/40',
                    !configured && 'bg-amber-500/5',
                    isSelected && 'bg-accent/60 hover:bg-accent/60',
                  )}
                >
                  <td className="p-md align-middle">
                    <div className="flex items-center gap-sm">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded text-[11px] font-semibold',
                          identity.chipClassName,
                        )}
                      >
                        {identity.initials}
                      </span>
                      <span className="text-body-sm font-semibold text-foreground">
                        {record.institutionName}
                      </span>
                    </div>
                  </td>
                  <td className="p-md align-middle text-body-sm text-foreground">
                    {kind === 'credit_card' ? (record.cardProduct ?? '—') : record.accountTypeLabel}
                  </td>
                  <td className="p-md align-middle text-table-mono tabular-nums text-muted-foreground">
                    •••• {record.last4}
                  </td>
                  <td className="p-md align-middle">
                    {configured ? (
                      <PasswordCell
                        value={record.statementPassword}
                        labelSuffix={`for ${record.institutionName} •••• ${record.last4}`}
                      />
                    ) : (
                      <span className="text-table-mono text-amber-400 italic">Not Configured</span>
                    )}
                  </td>
                  <td className="p-md align-middle">
                    <CredentialStatusBadge configured={configured} />
                  </td>
                  <td className="p-md text-table-mono text-muted-foreground text-right align-middle">
                    {configured ? formatDate(record.updatedAt) : 'Never'}
                  </td>
                  <td className="p-md text-right align-middle">
                    {configured ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(record)
                        }}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(record)
                        }}
                      >
                        <ShieldPlus className="size-3.5" aria-hidden="true" />
                        Add Credential
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/10 px-lg py-sm text-table-mono text-muted-foreground">
        <span>
          Showing {records.length} of {totalCount} {copy.noun}
        </span>
        <button type="button" onClick={handleExport} className="hover:text-foreground">
          Export CSV
        </button>
      </div>
    </div>
  )
}
