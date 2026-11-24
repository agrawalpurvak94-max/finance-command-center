import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiKeyStatus } from '@/domain/Credential'
import type { ApiKeyRepository } from '@/repositories/api-key.repository'

type ApiKeyStatusDbRow = { name: string; updated_at: string }

/**
 * `public.api_keys` access. RLS only permits SELECT on `name, updated_at`
 * (never `value`) and INSERT/UPDATE of `value`, so reads select those two
 * columns explicitly and the upsert does not request the row back.
 */
export class SupabaseApiKeyRepository implements ApiKeyRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listStatuses(): Promise<ApiKeyStatus[]> {
    const { data, error } = await this.client.from('api_keys').select('name, updated_at')
    if (error) throw new Error(`Failed to load API key status: ${error.message}`)
    return ((data ?? []) as ApiKeyStatusDbRow[]).map((row) => ({
      name: row.name,
      updatedAt: row.updated_at,
    }))
  }

  async saveKey(name: string, value: string): Promise<void> {
    const { error } = await this.client
      .from('api_keys')
      .upsert({ name, value, updated_at: new Date().toISOString() }, { onConflict: 'name' })
    if (error) throw new Error(`Failed to save API key "${name}": ${error.message}`)
  }
}
