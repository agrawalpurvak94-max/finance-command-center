import type {
  StatementAccountIdentity,
  StatementTransactionRow,
} from '@/domain/StatementTransaction'
import type { OwnerType } from '@/domain/Transaction'

/**
 * Swap point for the Statement Explorer's data access. A single statement's
 * transaction count is small (tens, not thousands — confirmed live: 22 rows
 * total across every statement in this database today), so `listByStatement`
 * intentionally returns the full set for one statement in one request;
 * search/filter/sort/pagination happen client-side in the page. This is not
 * the same as the global Transactions module (50,000+ rows, server-paginated)
 * — a different data shape justifies a different strategy here.
 */
export interface StatementTransactionRepository {
  listByStatement(statementId: string): Promise<StatementTransactionRow[]>
  /** Raw, un-coalesced account identity for one account — see `StatementAccountIdentity`'s doc comment. */
  getAccountIdentity(accountId: string): Promise<StatementAccountIdentity | null>
  /**
   * User-driven recategorization from the Statement Explorer table. Also
   * sets `category_source` to `'manual'` — a real, honest state change (this
   * row was no longer just AI-assigned), not a fabricated value. Per this
   * app's "user decisions become ground truth" rule, a manual edit is never
   * silently overwritten by anything else.
   */
  updateCategory(id: string, category: string): Promise<void>
  /** Assigns (or clears, with `null`) a client on one statement-transaction row. Requires DATABASE_MIGRATIONS.sql Phase 15. */
  updateClient(id: string, clientId: string | null): Promise<void>
  /** Sets the Business/Personal toggle on one statement-transaction row. Requires DATABASE_MIGRATIONS.sql Phase 16. */
  updateOwnerType(id: string, ownerType: OwnerType): Promise<void>
}
