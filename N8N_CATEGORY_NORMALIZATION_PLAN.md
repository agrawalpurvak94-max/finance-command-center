# N8N_CATEGORY_NORMALIZATION_PLAN.md

Read-only analysis of Workflow C Parser and Workflow D's categorization nodes, produced to document what Module 12B needs to change so the category-vocabulary drift resolved in `DATABASE_CATEGORY_NORMALIZATION.sql` cannot recur. **No n8n workflow JSON was modified to produce this document.**

---

## 1. Every categorization node, and its vocabulary source

| Workflow | Node                      | Mechanism                                                         | Vocabulary                                                                                                                                                                                                                                                                                                                                                       | Hardcoded?                                                    |
| -------- | ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| C Parser | `Merchanet Rules`         | JS keyword match (`n8n-nodes-base.code`)                          | 5 values: `Shopping, Food, Travel, Utilities, Fuel`                                                                                                                                                                                                                                                                                                              | **Yes** — literal JS object                                   |
| C Parser | `Claude Haiku categorize` | Anthropic Claude, free-text prompt (no schema)                    | _None embedded_ — prompt only gives worked examples (`SWIGGY→Food`, `UBER→Transport`); model is not constrained to a list at all                                                                                                                                                                                                                                 | No fixed list, but also **not schema-enforced** — see §4      |
| C Parser | `AI Categorize`           | Gemini `gemini-2.5-flash`, `responseSchema.enum`                  | 19 values (`Food, Groceries, Shopping, Travel, Transport, Fuel, Entertainment, Utilities, Medical, Education, Insurance, Rent, Subscriptions, Personal Care, Business, Fees & Charges, Transfer, Investment, Uncategorized`)                                                                                                                                     | **Yes** — hard JSON-schema enum                               |
| D        | `AI Categorize`           | Gemini, `responseSchema.enum`                                     | **Identical 19-value list**, byte-for-byte the same enum as C Parser's node above — confirmed by direct extraction                                                                                                                                                                                                                                               | **Yes** — hard JSON-schema enum                               |
| D        | `AI Categorize1`          | Gemini `gemini-3.5-flash-lite`, prompt text (no `responseSchema`) | 32 values (`Groceries, Dining, Food Delivery, Fuel, Travel, Airlines, Hotels, Taxi, Shopping, Electronics, Healthcare, Medical, Insurance, Utilities, Internet, Mobile, Entertainment, Subscriptions, Education, Government, Investment, Bank Charges, Cash Withdrawal, Transfer, Income, EMI, Rent, Business Expense, Office Supplies, Software, Taxes, Other`) | **Yes** — but only as prompt instruction, not schema-enforced |

## 2. Which nodes use dynamic categories

**Only one path is fully dynamic:** C Parser's `Load categories` (an HTTP GET against `.../rest/v1/categories?select=name&or=(user_id.is.null,user_id.eq.<owner>)`, using a live Supabase service-role key embedded in the node — already a known, flagged credential, unrelated to this task) feeds `Claude Haiku categorize`'s prompt with whatever category names currently exist in the table. This is the only mechanism in either workflow that **cannot** drift from the database, because it has no vocabulary of its own — it reads the database's vocabulary at runtime.

Every other node in §1 embeds its own static list, independently maintained, which is exactly how the two 19-value lists and the one 32-value list ended up diverging from each other and from `categories` in the first place.

## 3. A previously-undocumented structural detail found this pass

Workflow D does not have one Gemini categorizer — it has **two**, used for different purposes:

- `IF Merchant Known` gates on `merchant_found` (a boolean from an upstream merchant-memory cache lookup). If the merchant is already known, no AI call happens at all — the cached category is reused.
- If the merchant is **not** known, Workflow D's `AI Categorize` (19-value schema-enforced enum, identical to C Parser's) runs once, specifically to classify it "for permanent storage" in `merchant_memory` (per its own prompt text).
- Separately, `AI Categorize1` (32-value soft-prompt) appears to run per transaction line during statement line-item enrichment (fed by `Merchant Lookup RPC` → `Enrich Transaction`), independent of the merchant-known gate.

This means Workflow D's 33k+ `statement_transactions` rows are dominated by `AI Categorize1`'s 32-value output, while new merchant-memory entries written by Workflow D can also come from the 19-value `AI Categorize` node — **two different vocabularies can currently write into the same downstream tables from the same workflow**, depending on which branch a given transaction takes. Module 12B needs to resolve this ambiguity explicitly (see §6), not just patch `AI Categorize1`'s enum in isolation.

## 4. Gaps that allowed today's drift

1. No single source of truth: 3 independently-maintained hardcoded vocabularies (C Parser's 19, D's 19, D's 32) plus one 5-value rules table, none of which reference `categories` except by developer memory when they were written.
2. Only one of the two Gemini nodes with a wider vocabulary (`AI Categorize1`) lacks `responseSchema` — nothing stops Gemini from returning a category outside even its own 32-value list.
3. `Claude Haiku categorize`, despite reading live categories, also lacks a `responseSchema.enum` — nothing stops the model from returning free text outside the list it was shown either. Dynamic sourcing alone isn't a hard guarantee without schema enforcement.
4. No validation step exists anywhere in either workflow between "AI returns a category string" and "row is written to Supabase" — an unrecognized value passes straight through into `merchant_memory.category` or `statement_transactions.category`, which is exactly how the 25→then-more unresolved rows accumulated.

## 5. Recommendation: single source of truth

```
Supabase categories
      ↓
  categorization logic  (Merchanet Rules / Claude Haiku / Gemini — any path)
      ↓
  canonical category (validated against categories.name)
      ↓
  transaction / statement_transaction
      ↓
  analytics / frontend
```

Concretely, for Module 12B (not implemented in this pass):

1. **Give every AI categorization node a hard `responseSchema.enum`**, not just C Parser's `AI Categorize`. This closes the gap in `AI Categorize1` (§1) and would also strengthen `Claude Haiku categorize` if Claude's API is given an equivalent structured-output constraint.
2. **Source every enum dynamically from `categories`**, mirroring `Load categories` (§2), instead of embedding a static list per node. n8n can build a `responseSchema.enum` array at runtime from a prior HTTP node's output via an expression, so this does not require hardcoding a list anywhere, in any of the four AI nodes.
3. **Resolve the two-Gemini-node ambiguity in Workflow D (§3)** — decide whether `AI Categorize` (new-merchant path) and `AI Categorize1` (per-transaction path) should be unified into one categorization call reused by both branches, or kept separate but both pinned to the same dynamic enum. Recommend the former (one shared categorization sub-flow) to eliminate the possibility of the two branches disagreeing again.
4. **Add an explicit validation/guard step before every Supabase write** (a new code node, or extending the existing `Normalize AI Category Output` nodes) that checks the returned category string against the live `categories.name` set and substitutes `Uncategorized` if it doesn't match — so a future model hallucination or prompt drift cannot silently insert an unresolvable category again, even if schema enforcement itself is ever loosened.
5. Once 1–4 are in place, `merchant_memory.default_category_id` should resolve for 100% of future rows without needing another manual reconciliation pass.

## 6. Explicit answers to the questions posed

- **Which n8n nodes currently contain hard-coded category lists?** `Merchanet Rules` (5 values), C Parser's `AI Categorize` (19), Workflow D's `AI Categorize` (19, identical), Workflow D's `AI Categorize1` (32). Four nodes total.
- **Which nodes use dynamic categories?** Only `Load categories` → `Claude Haiku categorize` (C Parser). One path.
- **Which nodes need to be changed in Module 12B?** All four hardcoded nodes in §1, per the recommendation in §5 — converted to dynamic, schema-enforced sourcing from `categories`. `Claude Haiku categorize` should also gain schema enforcement even though it's already dynamic.
- **Should Gemini receive the current canonical category list dynamically?** Yes — recommended for both Gemini nodes in both workflows, via the same REST-read-then-inject pattern already proven by `Load categories`.
- **How to prevent future values like "Dining" or "Taxi" from reappearing?** The combination of (a) dynamic sourcing so the enum can never diverge from `categories`, (b) hard schema enforcement so the model cannot bypass the enum, and (c) a pre-insert validation guard as a final backstop (§5.4) — any one of the three would help; all three together make recurrence structurally very unlikely.
- **Should category validation happen before database insertion?** Yes — recommended as §5.4, as a backstop independent of whether the AI-layer fixes (schema enforcement, dynamic sourcing) are fully in place, since it protects against future vocabulary drift regardless of which categorization node introduces it.

## 7. Explicitly not done in this pass

- No workflow JSON was edited.
- No node's `responseSchema`, prompt text, or hardcoded list was changed.
- No decision was made on Module 12B's exact implementation (single shared categorization sub-flow vs. keeping branches separate) — flagged as an open design choice for Purvak when Module 12B begins.

---

**Stopping here, per instruction.** No n8n, Supabase, frontend, or repository changes beyond the approved `DATABASE_CATEGORY_NORMALIZATION.sql` execution (see `CATEGORY_VOCABULARY_RECONCILIATION_RESULT.md`). Module 12A not started. Nothing committed. Waiting for explicit approval before the next step.
