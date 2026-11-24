import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseApiKeyRepository } from '@/repositories/supabase-api-key.repository'
import { formatRelativeDate } from '@/utils/credentials'

function fakeClient(result: { data?: unknown; error?: { message: string } | null }) {
  const select = vi
    .fn()
    .mockResolvedValue({ data: result.data ?? null, error: result.error ?? null })
  const upsert = vi.fn().mockResolvedValue({ error: result.error ?? null })
  const from = vi.fn().mockReturnValue({ select, upsert })
  return { client: { from } as unknown as SupabaseClient, from, select, upsert }
}

describe('SupabaseApiKeyRepository', () => {
  it('selects only name and updated_at, never value', async () => {
    const { client, select } = fakeClient({
      data: [{ name: 'gemini_api_key', updated_at: '2026-11-01T00:00:00Z' }],
    })
    const result = await new SupabaseApiKeyRepository(client).listStatuses()
    expect(select).toHaveBeenCalledWith('name, updated_at')
    expect(result).toEqual([{ name: 'gemini_api_key', updatedAt: '2026-11-01T00:00:00Z' }])
  })

  it('upserts on name without requesting the row back', async () => {
    const { client, from, upsert } = fakeClient({})
    await new SupabaseApiKeyRepository(client).saveKey('gemini_api_key', 'secret-value')
    expect(from).toHaveBeenCalledWith('api_keys')
    const [row, options] = upsert.mock.calls[0]
    expect(row).toMatchObject({ name: 'gemini_api_key', value: 'secret-value' })
    expect(typeof row.updated_at).toBe('string')
    expect(options).toEqual({ onConflict: 'name' })
  })

  it('throws without leaking the key value on error', async () => {
    const { client } = fakeClient({ error: { message: 'permission denied' } })
    await expect(
      new SupabaseApiKeyRepository(client).saveKey('gemini_api_key', 'secret-value'),
    ).rejects.toThrow(/permission denied/)
    await expect(
      new SupabaseApiKeyRepository(client).saveKey('gemini_api_key', 'secret-value'),
    ).rejects.not.toThrow(/secret-value/)
  })
})

describe('formatRelativeDate', () => {
  const now = new Date('2026-11-23T12:00:00Z')
  it('formats today, yesterday and recent days', () => {
    expect(formatRelativeDate('2026-11-23T01:00:00Z', now)).toBe('today')
    expect(formatRelativeDate('2026-11-22T01:00:00Z', now)).toBe('yesterday')
    expect(formatRelativeDate('2026-11-18T12:00:00Z', now)).toBe('5 days ago')
  })
})
