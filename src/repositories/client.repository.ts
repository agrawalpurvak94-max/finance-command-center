import type {
  ClientCreateInput,
  ClientListParams,
  ClientListResult,
  ClientRecord,
  ClientSummary,
  ClientUpdateInput,
} from '@/domain/Client'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseClientRepository (reading vw_clients / a client-summary view per
 * CLAUDE.md, writing through the future `clients` table) and the
 * hooks/components in this module require zero changes.
 */
export interface ClientRepository {
  list(params: ClientListParams): Promise<ClientListResult>
  getSummary(): Promise<ClientSummary>
  create(input: ClientCreateInput): Promise<ClientRecord>
  update(id: string, input: ClientUpdateInput): Promise<ClientRecord>
  delete(id: string): Promise<void>
}
