# MODULE12B_PHASE2_SCHEMA_VERIFICATION.md

Execution and verification of the approved `statements` idempotency migration (Module 12B, Decision 1, Option B). This is the **only** database change made — no other table, no RLS policy, no view, and no n8n workflow was touched.

---

## What was executed

```sql
BEGIN;

ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS source_message_id text;

COMMENT ON COLUMN public.statements.source_message_id IS
  'Gmail message id of the statement email that created this row. Nullable — manually-created statements (future Statements-module UI) have no Gmail origin. Authoritative statement-level idempotency key for Workflow D: looked up as (user_id, source_message_id) before creating a new row, per Module 12B Decision 1.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_statements_user_source_message
  ON public.statements (user_id, source_message_id);

COMMIT;
```

Exactly as approved in `MODULE12B_PHASE2_WORKFLOW_D_NODE_PLAN.md` — no other statement was run against the database.

## Pre-execution checks

- **Conflict check**: `statements` had 0 rows at the time of execution (confirmed directly), so no existing row could possibly violate the new unique constraint. The column didn't exist yet either, so there was nothing to check for pre-existing duplicate values.
- **Additive/reversible confirmed**: `ADD COLUMN IF NOT EXISTS` (nullable, no default requiring a rewrite) and `CREATE UNIQUE INDEX IF NOT EXISTS` are both non-destructive; nothing existing was altered or dropped. Reversal, if ever needed: `DROP INDEX IF EXISTS uq_statements_user_source_message; ALTER TABLE public.statements DROP COLUMN IF EXISTS source_message_id;`.
- One script bug on my first attempt (a pre-check query referenced the new column before it existed) caused a clean, automatic rollback with no partial state — confirmed via the pre-check re-run before the corrected script executed. No malformed or partial migration was ever committed.

## Post-execution verification (all independent, all passed)

| Check                                        | Result                                                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Column exists, correct shape                 | ✅ `source_message_id`, `text`, nullable, comment attached exactly as specified                                                                                       |
| Unique index exists                          | ✅ `uq_statements_user_source_message` on `(user_id, source_message_id)`, `USING btree`                                                                               |
| Index is actually unique (not just named so) | ✅ `pg_index.indisunique = true`, confirmed directly against `pg_index`, not inferred from the index name                                                             |
| `statements` row count                       | ✅ 0 (unchanged)                                                                                                                                                      |
| All other row counts unchanged               | ✅ `transactions=0, statement_transactions=0, merchant_memory=0, categories=24, accounts=7, clients=3, application_settings=9` — identical to the post-reset baseline |
| RLS policies intact                          | ✅ All 15 policies present, unchanged (same table/policy-name/command triples as before)                                                                              |
| Views intact                                 | ✅ All 26 checked views execute successfully, zero failures                                                                                                           |
| Full `statements` column list                | ✅ All 24 pre-existing columns unchanged; `source_message_id` added cleanly as the 25th, nothing else disturbed                                                       |

## Functional proof the constraint actually works

Rather than trust the index definition alone, I tested it directly: inside a transaction that was rolled back before it ever committed, I attempted to insert two `statements` rows with the same `(user_id, source_message_id)` pair. The second insert was correctly rejected:

```
duplicate key value violates unique constraint "uq_statements_user_source_message"
```

The transaction was then rolled back and `statements`'s row count re-checked directly afterward — confirmed still 0, no test data left behind.

---

## Summary

Migration executed exactly as approved, committed successfully. Independently verified: the column exists with the correct type/nullability/comment, the unique index exists and is genuinely unique (proven functionally, not just by definition), `statements` remains at 0 rows, every other table's row count is unchanged from the post-reset baseline, all 15 RLS policies are intact, and all 26 views execute without error. No n8n workflow was modified. No other table was touched.

**Stopping here, per instruction.** Waiting for your approval before any n8n changes begin.
