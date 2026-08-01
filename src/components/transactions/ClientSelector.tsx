import { InlineSelector } from '@/components/transactions/InlineSelector'
import { useTransactionClients } from '@/hooks/useTransactions'
import type { Client } from '@/domain/Client'

interface ClientSelectorProps {
  client: Client | null
  onChange: (clientId: string | null) => void
}

export function ClientSelector({ client, onChange }: ClientSelectorProps) {
  const { data: clients = [] } = useTransactionClients()

  return (
    <InlineSelector
      value={client?.id ?? null}
      options={clients}
      placeholder="No client"
      emptyLabel="No client"
      onChange={onChange}
      aria-label="Client"
    />
  )
}
