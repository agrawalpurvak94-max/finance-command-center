# CATEGORY_VOCABULARY_RECONCILIATION.md

Read-only investigation into why 25 of 79 `merchant_memory` rows still have `default_category_id IS NULL` after `DATABASE_SEED.sql` (see `POST_SEED_VERIFICATION.md` Warnings). **No Supabase, n8n, or repository changes were made to produce this report.** All findings below come from live read-only SQL queries (via the same direct-Postgres scratchpad client used for Phase 0 / preflight) and read-only inspection of the two n8n workflow JSON exports and the frontend domain model.

---

## 1. Current canonical categories (live, 21 rows)

| Category        | Description                                              | Origin                                       |
| --------------- | -------------------------------------------------------- | -------------------------------------------- |
| Food            | —                                                        | Original 9                                   |
| Shopping        | —                                                        | Original 9                                   |
| Fuel            | —                                                        | Original 9                                   |
| Entertainment   | —                                                        | Original 9                                   |
| Medical         | —                                                        | Original 9                                   |
| Utilities       | —                                                        | Original 9                                   |
| Office Supplies | —                                                        | Original 9                                   |
| Other           | —                                                        | Original 9                                   |
| Uncategorized   | AI could not confidently assign a category.              | Original 9                                   |
| Business        | Business-related spend not otherwise categorized.        | Seeded — Workflow C Parser 19-value enum gap |
| Education       | Tuition, courses, books, educational fees.               | Seeded — Workflow C Parser enum gap          |
| Fees & Charges  | Bank fees, late fees, service charges.                   | Seeded — Workflow C Parser enum gap          |
| Groceries       | Everyday grocery and household staples.                  | Seeded — Workflow C Parser enum gap          |
| Insurance       | Insurance premiums (health, life, vehicle, etc.).        | Seeded — Workflow C Parser enum gap          |
| Investment      | Investment purchases (stocks, mutual funds, etc.).       | Seeded — Workflow C Parser enum gap          |
| Personal Care   | Grooming, wellness, personal-care spend.                 | Seeded — Workflow C Parser enum gap          |
| Rent            | Rent and housing lease payments.                         | Seeded — Workflow C Parser enum gap          |
| Subscriptions   | Recurring software/media/service subscriptions.          | Seeded — Workflow C Parser enum gap          |
| Transfer        | Internal transfers between own accounts.                 | Seeded — Workflow C Parser enum gap          |
| Transport       | Cabs, ride-hailing, public transit — distinct from Fuel. | Seeded — Workflow C Parser enum gap          |
| Travel          | —                                                        | Seeded — Workflow C Parser enum gap          |

**Root fact:** `DATABASE_SEED.sql`'s 12-category gap-fill was built entirely from Workflow C Parser's `AI Categorize` node's 19-value enum. It never accounted for Workflow D's independent enum — because at the time that seed was written, Workflow D's enum had not yet been fully extracted (see §2.2 and the correction note in §6).

---

## 2. Every category vocabulary in the system, traced to its origin

Four independent categorization mechanisms exist across the two n8n workflows — not two, as earlier documentation (`N8N_DATABASE_MAPPING.md`) assumed.

### 2.1 Workflow C Parser — "Merchanet Rules" (keyword fast path, no AI)

`n8n-nodes-base.code` node. Pure keyword matching, no LLM call:

```js
const rules = {
  MYNTRA: 'Shopping',
  AMAZON: 'Shopping',
  FLIPKART: 'Shopping',
  SWIGGY: 'Food',
  ZOMATO: 'Food',
  UBER: 'Travel',
  OLA: 'Travel',
  AIRTEL: 'Utilities',
  JIO: 'Utilities',
  HPCL: 'Fuel',
  IOCL: 'Fuel',
  BPCL: 'Fuel',
}
```

Output vocabulary: `Shopping, Food, Travel, Utilities, Fuel` — all 5 already exist in the categories table. **No drift risk from this node.** Notably, it maps **SWIGGY → Food** and **UBER → Travel**, not "Food Delivery" / "Taxi".

### 2.2 Workflow C Parser — "Claude Haiku categorize" (fast-path fallback, dynamic)

`n8n-nodes-base.httpRequest`, fed by an upstream "Load categories" node that queries the live `categories` table at runtime. This path has **no fixed/hardcoded vocabulary** — it self-adapts to whatever rows exist in `categories`. Its prompt examples reinforce the same convention as §2.1: `SWIGGY = SWIGGY, Food`, `UBER = UBER, Transport`. **This is the only one of the four mechanisms that is architecturally drift-proof by design** — it cannot introduce a category the table doesn't already contain.

### 2.3 Workflow C Parser — "AI Categorize" (Gemini `gemini-2.5-flash`, full path)

`n8n-nodes-base.httpRequest`, hard-constrained via Gemini `responseSchema.properties.category.enum` (verified directly from the raw node JSON, not from memory):

```
Food, Groceries, Shopping, Travel, Transport, Fuel, Entertainment, Utilities,
Medical, Education, Insurance, Rent, Subscriptions, Personal Care, Business,
Fees & Charges, Transfer, Investment, Uncategorized
```

19 values. This enum is **exactly** the seed's source list — every value already exists in `categories`. Model cannot return a value outside this list (schema-enforced). **No drift risk from this node**, and none possible going forward as long as this enum and the `categories` table are kept in sync manually.

### 2.4 Workflow D — "AI Categorize1" (Gemini `gemini-3.5-flash-lite`, statement processing)

`n8n-nodes-base.httpRequest`. **This is the actual source of the 25 unresolved `merchant_memory` rows.** Re-extracted directly from the raw node body this session (not from the earlier, incorrect summary in `N8N_DATABASE_MAPPING.md`):

```
Groceries, Dining, Food Delivery, Fuel, Travel, Airlines, Hotels, Taxi, Shopping,
Electronics, Healthcare, Medical, Insurance, Utilities, Internet, Mobile,
Entertainment, Subscriptions, Education, Government, Investment, Bank Charges,
Cash Withdrawal, Transfer, Income, EMI, Rent, Business Expense, Office Supplies,
Software, Taxes, Other
```

32 values, presented as **prompt text** ("Choose ONLY one of these categories: ..."), **not** a Gemini `responseSchema` enum. Unlike §2.3, the model is not structurally prevented from returning a value outside this list either — the constraint is instructional only.

**Correction to prior documentation:** an earlier pass of `N8N_DATABASE_MAPPING.md` stated Workflow D "uses the same hardcoded 19-value category enum as Workflow C Parser." That was based on reading only the first ~500 characters of this node's prompt and is **incorrect** — Workflow D's list is a distinct, larger, differently-named 32-value list. This report is the correction; `N8N_DATABASE_MAPPING.md` itself is not edited here (out of scope for this read-only task — flagged in §7 as a Module 12B documentation fix).

### 2.5 Frontend domain model

`src/domain/Category.ts` — checked directly. `CategoryRecord` carries no hardcoded category names; `CATEGORY_COLORS` is a 7-value list of **UI color tokens** (`primary`, `tertiary`, `emerald`, `blue`, `amber`, `rose`, `violet`), unrelated to category naming. The frontend is fully data-driven from whatever rows exist in `categories`. **No frontend vocabulary conflict exists.**

### 2.6 Enum overlap: Workflow C Parser (§2.3, 19 values) vs. Workflow D (§2.4, 32 values)

- **Common to both (13):** Groceries, Fuel, Travel, Shopping, Medical, Insurance, Utilities, Entertainment, Subscriptions, Education, Investment, Transfer, Rent
- **Unique to Workflow C Parser (6):** Food, Transport, Personal Care, Business, Fees & Charges, Uncategorized
- **Unique to Workflow D (18):** Dining, Food Delivery, Airlines, Hotels, Taxi, Electronics, Healthcare, Internet, Mobile, Government, Bank Charges, Cash Withdrawal, Income, EMI, Business Expense, Office Supplies*, Software, Taxes, Other*

  *`Office Supplies` and `Other` already exist as original categories (§1), just not because of Workflow C Parser's enum.

This 13/6/18 split is the structural cause of the drift: the seed only closed the gap for Workflow C Parser's 19, leaving Workflow D's 18 Workflow-D-only values (of which 8 have actually appeared in live merchant data) unresolved.

---

## 3. Live-data cross-tabulation

`transactions` (14 rows, populated by Workflow C Parser) uses only values already in `categories`: `Business(2), Food(1), Fuel(3), Investment(1), Shopping(5), Uncategorized(2)`.

`statement_transactions` (33,826 rows, populated by Workflow D) is dominated by categories **not** in the seed's 21-value list:

| Category          | Rows  | In `categories`? |
| ----------------- | ----- | ---------------- |
| Shopping          | 7,883 | ✅               |
| Medical           | 5,246 | ✅               |
| **Software**      | 5,246 | ❌               |
| Fuel              | 5,246 | ✅               |
| **Dining**        | 2,629 | ❌               |
| **Food Delivery** | 2,628 | ❌               |
| Food              | 2,623 | ✅               |
| **EMI**           | 2,623 | ❌               |
| **Bank Charges**  | 2,623 | ❌               |
| Groceries         | 50    | ✅               |
| Travel            | 7     | ✅               |
| **Taxi**          | 6     | ❌               |
| Utilities         | 6     | ✅               |
| Entertainment     | 3     | ✅               |
| **Airlines**      | 2     | ❌               |
| Other             | 1     | ✅               |

The 8 unmatched values (bold) are exactly the 8 distinct `merchant_memory.category` values behind the 25 unresolved rows, and together they account for **21,124 of 33,826** `statement_transactions` rows (~62%) — this is not a fringe edge case, it is the majority categorization vocabulary for the app's largest data source.

**Observation, not a conclusion:** three values show _exactly_ identical counts (`Medical = Software = Fuel = 5,246`) and three more cluster within 6 rows of each other (`Dining = 2,629`, `Food Delivery = 2,628`, `EMI = Bank Charges = 2,623`). This pattern is unusual for organically-arriving bank-statement data and may indicate synthetic/test statement data mixed into `statement_transactions`, rather than genuine transaction diversity. This is flagged for Purvak's awareness only — it does not change any mapping recommendation below, since the category _names_ themselves are legitimate regardless of whether the underlying rows are real or test data.

**Date check:** the 25 unresolved `merchant_memory` rows were created 2026-07-29 → 2026-08-18, essentially the same window as the 54 resolved rows (2026-07-19 → 2026-08-18). **They are not legacy/obsolete data** — they are current, ongoing output of Workflow D running normally.

---

## 4. The 25 unresolved rows, mapped

| `merchant_memory.category` | Rows | Merchants (normalized)                                                                           | Confidence source |
| -------------------------- | ---- | ------------------------------------------------------------------------------------------------ | ----------------- |
| Airlines                   | 4    | ALASKA A(×2), QATAR AIR(×2)                                                                      | 100               |
| Bank Charges               | 1    | DCC transaction fee                                                                              | 90                |
| Dining                     | 7    | Domino's, Ghirardelli, Saravanaa Bhavan, Boardwalk Food Carts, Cream Dino, Wetzel's Pretzels(×2) | 95–100            |
| EMI                        | 1    | Credit-card EMI payment reference                                                                | 90                |
| Food Delivery              | 2    | Swiggy, Zomato                                                                                   | 100               |
| Income                     | 1    | PYMNT RCV BBPS (incoming payment)                                                                | 90                |
| Software                   | 2    | Anthropic Claude subscription, a VPS/hosting charge                                              | 75–100            |
| Taxi                       | 7    | Lyft(×3), Uber India, Uber, TaxiF Internet(×2)                                                   | 95–100            |

---

## 5. Proposed mapping matrix

| Value             | Proposed action                                              | Confidence  | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taxi**          | Map to existing **Transport**                                | High — safe | `Transport`'s live description is literally "Cabs, ride-hailing, public transit — distinct from Fuel." Exact conceptual match; Workflow C Parser's own Claude Haiku prompt already uses `UBER → Transport` as its worked example (§2.2).                                                                                                                                                                                                          |
| **Airlines**      | Map to existing **Travel**                                   | High — safe | Airlines spend is a strict subset of travel spend; no existing category is more specific. No ambiguity in the observed merchants (Alaska Airlines, Qatar Airways).                                                                                                                                                                                                                                                                                |
| **Bank Charges**  | Map to existing **Fees & Charges**                           | High — safe | Near-exact synonym; `Fees & Charges`'s live description ("Bank fees, late fees, service charges") describes this value directly.                                                                                                                                                                                                                                                                                                                  |
| **Dining**        | Map to existing **Food** — **needs approval**                | Medium      | Conceptually close, but `Food`'s scope was never explicitly redefined after `Groceries` was split out as its own category during seeding. Auto-merging risks silently narrowing/widening `Food`'s meaning without Purvak confirming that's intended.                                                                                                                                                                                              |
| **Software**      | Map to existing **Subscriptions** — **needs approval**       | Medium      | Both observed instances (Anthropic Claude sub, VPS hosting) are recurring, so `Subscriptions` fits today's data — but "Software" as a concept also covers one-time purchases that aren't subscriptions, so this mapping isn't safe to generalize without confirmation.                                                                                                                                                                            |
| **Food Delivery** | **Candidate new canonical category**                         | —           | Distinct real spending pattern (Swiggy/Zomato) from both `Food` (dining out) and `Groceries` (raw ingredients); 2,628 live rows is too significant to silently fold into an existing category.                                                                                                                                                                                                                                                    |
| **EMI**           | **Candidate new canonical category**                         | —           | Represents loan/credit repayment — a fundamentally different kind of spend not covered by any of the 21 existing categories (closest analog, `Rent`, is not a fit).                                                                                                                                                                                                                                                                               |
| **Income**        | **Candidate new canonical category** (or a schema-level fix) | —           | Represents money **in**, not spend **out** — categorically different in kind from every other value in the list. This is arguably the same underlying gap flagged during the Decision-1 discussion (no clean debit/credit signal on `transactions`); `Income` as a "category" may really be a symptom of that missing signal rather than a spending category in the normal sense. Flagging for Purvak's judgment rather than assuming either fix. |

None of the 25 rows are obsolete or incorrect — every value traces cleanly to Workflow D's real, currently-running 32-value prompt list (§2.4), and the date range (§3) confirms they are current, not legacy.

---

## 6. Recommended canonical vocabulary going forward

The original gap-fill in `DATABASE_SEED.sql` treated Workflow C Parser's 19-value enum as authoritative and implicitly treated Workflow D as "the odd one out." Given the volume data in §3 (Workflow D's statement pipeline is the dominant real-world data source — 33,826 rows vs. Workflow C Parser's 14), that framing should be inverted: **the canonical vocabulary should be built by merging both enums**, not by picking one as primary. Concretely, for Purvak's approval:

1. Keep all 21 existing categories (§1).
2. Add the 3 "candidate new category" values from §5: `Food Delivery`, `EMI`, `Income`.
3. Apply the 3 "safe" merges from §5 at the `merchant_memory` row level only (`Taxi→Transport`, `Airlines→Travel`, `Bank Charges→Fees & Charges`) — do not add new category rows for these.
4. Resolve the 2 "needs approval" merges (`Dining→Food`, `Software→Subscriptions`) once Purvak confirms intended scope, OR add them as their own categories if the merge is rejected.
5. Reconcile the 6 values unique to Workflow C Parser's enum (§2.6) that have near-synonyms in Workflow D's list (`Fees & Charges`↔`Bank Charges`, `Business`↔`Business Expense`) — decide one canonical name per concept so future Workflow-C-vs-D output doesn't diverge again.

This is a recommendation only — no category rows were added or changed to produce this report.

---

## 7. Module 12B changes required (not implemented here)

Per instruction, no workflow changes were made. For Module 12B, to prevent this drift from recurring:

1. **Change Workflow D's "AI Categorize1" node from a soft prompt-list constraint to a hard `responseSchema.enum` constraint**, matching the pattern already proven in Workflow C Parser's "AI Categorize" node (§2.3). This is the single structural fix that prevents the model from ever returning a category outside the approved set.
2. **Better: point both `AI Categorize` (§2.3) and `AI Categorize1` (§2.4) at the same dynamically-loaded category list**, using the pattern already proven by "Claude Haiku categorize" + "Load categories" (§2.2) — the only one of the four mechanisms that is drift-proof by construction because it queries the live `categories` table instead of embedding a static list in the workflow. This removes the maintenance burden of keeping two (or three) hardcoded enums in sync with the database by hand.
3. Once the canonical vocabulary from §6 is approved and the `categories` table is updated to match, re-run today's `default_category_id` backfill for the 25 affected `merchant_memory` rows (and any newly-arriving Workflow D rows) so the FK resolves fully.
4. Correct the inaccurate claim in `N8N_DATABASE_MAPPING.md` (that Workflow D "uses the same 19-value enum as Workflow C Parser") to reflect the findings in §2.4 of this report.
5. Neither Workflow A, B, C, nor D's _processing logic_ (merchant lookup, extraction, deduplication) needs any change — this is scoped entirely to the categorization vocabulary.

---

## A. Safe to execute automatically

_(Still requires Purvak's go-ahead to actually run — nothing has been executed. Listed here because these are mechanically unambiguous, not because they're pre-approved.)_

- `merchant_memory` row-level updates: `Taxi → Transport` (7 rows), `Airlines → Travel` (4 rows), `Bank Charges → Fees & Charges` (1 row) — 12 of the 25 unresolved rows.

## B. Requires Purvak approval

- Whether `Dining` merges into `Food` or becomes its own category (7 rows).
- Whether `Software` merges into `Subscriptions` or becomes its own category (2 rows).
- Whether `Food Delivery`, `EMI`, and `Income` become new canonical categories, and if so, their names/descriptions/colors/icons (10 rows).
- Whether to rename `Fees & Charges`↔`Bank Charges` and `Business`↔`Business Expense` to a single canonical term each, to stop Workflow C Parser and Workflow D from independently drifting on near-synonyms in the future.
- The §6 recommendation to treat Workflow D's enum as equally authoritative (not secondary) given its data-volume dominance.

## C. Module 12B changes required

- Convert Workflow D's "AI Categorize1" node to a hard `responseSchema.enum` constraint (or, preferably, a dynamic `categories`-table lookup matching the "Load categories" pattern already used elsewhere in Workflow C Parser).
- Re-run the `merchant_memory.default_category_id` backfill after the canonical vocabulary is settled.
- Correct `N8N_DATABASE_MAPPING.md`'s inaccurate description of Workflow D's category enum.

---

**Stopping here, per instruction.** No Supabase, n8n, or repository changes were made. Module 12A not started. Waiting for explicit approval before any next step.
