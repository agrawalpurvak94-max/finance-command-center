import { useState } from 'react'
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUpdateCredential } from '@/hooks/useCredentials'
import type { AccountCredentialRecord } from '@/domain/Credential'

interface CredentialDetailPanelProps {
  record: AccountCredentialRecord | null
  onSaved: (message: string, description?: string) => void
}

/**
 * Docked, always-visible detail panel — the Stitch Credentials reference's
 * "420px docked preview" pattern (`xl:sticky`, sits beside the table on
 * desktop, stacks below it on smaller screens), deliberately NOT the app's
 * usual `EntityReviewDrawer` slide-over. Selecting a table row updates this
 * panel in place; there is no open/close transition or overlay — this is a
 * specialized Credentials-only interaction, per explicit product decision.
 */
export function CredentialDetailPanel({ record, onSaved }: CredentialDetailPanelProps) {
  if (!record) {
    return (
      <div className="flex w-full shrink-0 flex-col items-center justify-center gap-sm rounded-lg border border-dashed border-border bg-card p-xl text-center xl:sticky xl:top-lg xl:w-105">
        <KeyRound className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-body-sm text-muted-foreground">
          Select a credential from the table to view or edit it here.
        </p>
      </div>
    )
  }

  return <PanelBody key={record.id} record={record} onSaved={onSaved} />
}

interface PanelBodyProps {
  record: AccountCredentialRecord
  onSaved: (message: string, description?: string) => void
}

function PanelBody({ record, onSaved }: PanelBodyProps) {
  const [password, setPassword] = useState(record.statementPassword ?? '')
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCredential = useUpdateCredential()
  const identity = getInstitutionIdentity(record.institutionName)
  const isDirty = password !== (record.statementPassword ?? '')

  function handleSave() {
    const trimmed = password.trim()
    if (!trimmed) {
      setError('Enter a statement password.')
      return
    }
    setError(null)
    updateCredential.mutate(
      { id: record.id, kind: record.kind, statementPassword: trimmed },
      {
        onSuccess: () => {
          onSaved(
            'Credential synchronized',
            `Stored to Supabase · ${record.institutionName} •••• ${record.last4}`,
          )
        },
        onError: () => {
          // Never surface the raw Supabase error, and keep whatever the user typed.
          setError('Credential could not be updated. Please try again.')
        },
      },
    )
  }

  return (
    <div className="flex w-full shrink-0 flex-col justify-between gap-md rounded-lg border border-border bg-card p-lg shadow-sm xl:sticky xl:top-lg xl:w-105">
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs">
            <KeyRound className="size-4.5 text-primary" aria-hidden="true" />
            <h3 className="text-headline-sm text-foreground">Statement Credential</h3>
          </div>
          <span className="text-table-mono text-muted-foreground">
            Account ID: {record.id} · Supabase public.accounts
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-md">
          <div className="flex items-center gap-sm">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded text-[11px] font-semibold',
                identity.chipClassName,
              )}
            >
              {identity.initials}
            </span>
            <div className="flex flex-col">
              <span className="text-body-sm font-semibold text-foreground">
                {record.institutionName}
              </span>
              <span className="text-body-sm text-muted-foreground">
                {record.kind === 'credit_card'
                  ? (record.cardProduct ?? 'Credit Card')
                  : record.accountTypeLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-label-caps uppercase text-muted-foreground">
              {record.kind === 'credit_card' ? 'Card Number' : 'Account Number'}
            </p>
            <p className="text-table-mono text-foreground">•••• {record.last4}</p>
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="credential-password"
              className="text-label-caps uppercase text-muted-foreground"
            >
              Statement Decryption Password
            </Label>
            <span className="text-table-mono text-primary">
              {record.kind === 'credit_card' ? 'Required for n8n' : 'Used for statement parsing'}
            </span>
          </div>
          <div className="relative flex items-center">
            <Input
              id="credential-password"
              type={revealed ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              aria-invalid={!!error}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
              aria-label={revealed ? 'Hide password' : 'Reveal password'}
            >
              {revealed ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-[11px] text-destructive">
              {error}
            </p>
          )}

          <p className="text-body-sm text-muted-foreground leading-relaxed">
            This credential is used to decrypt PDF statements delivered by email, so they can be
            parsed automatically.
          </p>

          <div className="flex items-start gap-sm rounded-lg bg-muted/30 p-sm">
            <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-body-sm text-muted-foreground">
              Stored in{' '}
              <code className="text-table-mono text-primary">
                public.accounts.statement_password
              </code>
              . Encrypted at rest.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-sm border-t border-border pt-md">
        <Button
          variant="ghost"
          onClick={() => setPassword(record.statementPassword ?? '')}
          disabled={updateCredential.isPending || !isDirty}
        >
          Discard Changes
        </Button>
        <Button onClick={handleSave} disabled={updateCredential.isPending}>
          {updateCredential.isPending ? 'Saving…' : 'Save Credential'}
        </Button>
      </div>
    </div>
  )
}
