import type { ApiKeyRepository } from '@/repositories/api-key.repository'
import { SupabaseApiKeyRepository } from '@/repositories/supabase-api-key.repository'
import { supabase } from '@/lib/supabase'

export const apiKeyRepository: ApiKeyRepository = new SupabaseApiKeyRepository(supabase)
