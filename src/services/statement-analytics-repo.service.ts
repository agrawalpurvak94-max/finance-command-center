import type { StatementAnalyticsRepository } from '@/repositories/statement-analytics.repository'
import { SupabaseStatementAnalyticsRepository } from '@/repositories/supabase-statement-analytics.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const statementAnalyticsRepository: StatementAnalyticsRepository =
  new SupabaseStatementAnalyticsRepository(supabase)
