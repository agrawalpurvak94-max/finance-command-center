import type { ClientRepository } from '@/repositories/client.repository'
import { SupabaseClientRepository } from '@/repositories/supabase-client.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const clientRepository: ClientRepository = new SupabaseClientRepository(supabase)
