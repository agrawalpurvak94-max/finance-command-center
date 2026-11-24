import type { ApiKeyStatus } from '@/domain/Credential'

/**
 * Write-only API key storage. Implementations must never read the key value
 * back — `listStatuses` returns names and timestamps only.
 */
export interface ApiKeyRepository {
  listStatuses(): Promise<ApiKeyStatus[]>
  saveKey(name: string, value: string): Promise<void>
}
