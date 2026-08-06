import type { ClientRepository } from '@/repositories/client.repository'
import { MockClientRepository } from '@/repositories/mock-client.repository'

// Swap point for real backend integration — construct a
// SupabaseClientRepository here instead when that's scheduled (Module 12A).
// No other file in this module needs to change.
export const clientRepository: ClientRepository = new MockClientRepository()
