import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeyStatuses, useSaveApiKey } from '@/hooks/useCredentials'
import { API_KEY_SLOTS, type ApiKeySlot, type ApiKeyStatus } from '@/domain/Credential'
import { formatRelativeDate } from '@/utils/credentials'

interface ApiKeysCardProps {
  onSaved: (message: string, description?: string) => void
}

/**
 * Write-only API key management. A stored key is never read or displayed —
 * each row only shows whether the slot is set (and when it was last updated).
 */
export function ApiKeysCard({ onSaved }: ApiKeysCardProps) {
  const statusesQuery = useApiKeyStatuses()

  return (
    <section
      aria-labelledby="api-keys-heading"
      className="flex flex-col gap-md rounded-lg border border-border bg-card p-lg shadow-sm"
    >
      <div className="flex flex-col gap-xs">
        <div className="flex items-center gap-xs">
          <KeyRound className="size-4.5 text-primary" aria-hidden="true" />
          <h2 id="api-keys-heading" className="text-headline-sm text-foreground">
            API Keys
          </h2>
        </div>
        <div className="flex items-start gap-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-body-sm text-muted-foreground">
            Keys are stored in Supabase and used by the n8n workflows automatically. Saved keys are
            never shown again.
          </p>
        </div>
      </div>

      {statusesQuery.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <>
          {statusesQuery.isError && (
            <p role="alert" className="text-[11px] text-destructive">
              Key status could not be loaded.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void statusesQuery.refetch()}
              >
                Retry
              </button>
            </p>
          )}
          <div className="flex flex-col gap-md">
            {API_KEY_SLOTS.map((slot) => (
              <ApiKeyRow
                key={slot.name}
                slot={slot}
                status={statusesQuery.data?.find((s) => s.name === slot.name)}
                onSaved={onSaved}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

interface ApiKeyRowProps {
  slot: ApiKeySlot
  status: ApiKeyStatus | undefined
  onSaved: (message: string, description?: string) => void
}

function ApiKeyRow({ slot, status, onSaved }: ApiKeyRowProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const saveKey = useSaveApiKey()
  const inputId = `api-key-${slot.name}`

  function handleSave() {
    const trimmed = value.trim()
    if (!trimmed) return
    setError(null)
    saveKey.mutate(
      { name: slot.name, value: trimmed },
      {
        onSuccess: () => {
          setValue('')
          onSaved('API key saved', `${slot.label} stored in Supabase`)
        },
        onError: () => {
          // Never surface the raw error, and never echo the key.
          setError('API key could not be saved. Please try again.')
        },
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-sm"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <div className="flex items-center justify-between gap-sm">
        <Label htmlFor={inputId} className="text-label-caps uppercase text-muted-foreground">
          {slot.label}
        </Label>
        <span className="text-table-mono text-primary" data-testid={`${inputId}-status`}>
          {status ? `Set · updated ${formatRelativeDate(status.updatedAt)}` : 'Not set'}
        </span>
      </div>
      <div className="flex flex-col gap-sm sm:flex-row">
        <Input
          id={inputId}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          placeholder={status ? 'Enter a new key to replace it' : 'Paste key'}
          aria-invalid={!!error}
          className="flex-1"
        />
        <Button type="submit" disabled={saveKey.isPending || !value.trim()}>
          {saveKey.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
