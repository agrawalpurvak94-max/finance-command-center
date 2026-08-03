import type {
  Statement,
  StatementCreateInput,
  StatementListParams,
  StatementListResult,
  StatementSummary,
} from '@/domain/Statement'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseStatementRepository (reading vw_statements / vw_statement_summary
 * per CLAUDE.md, writing through the future `statements` table) and the
 * hooks/components in this module require zero changes.
 *
 * Reference data (accounts, clients) is intentionally NOT duplicated here —
 * see services/statements.service.ts and hooks/useStatements.ts, which reuse
 * the existing Transactions module's account/client accessors since that
 * reference data is shared master data, not owned by either module.
 */
export interface StatementRepository {
  list(params: StatementListParams): Promise<StatementListResult>
  getById(id: string): Promise<Statement | null>
  getSummary(): Promise<StatementSummary>
  create(input: StatementCreateInput): Promise<Statement>
  reprocess(id: string): Promise<Statement>
  delete(id: string): Promise<void>
}
