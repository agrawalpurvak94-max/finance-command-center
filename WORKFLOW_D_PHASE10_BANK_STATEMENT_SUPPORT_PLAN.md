# WORKFLOW D — PHASE 10: Bank Statement Support + Password Resolution Fix

Planning only, matching the established pattern in `MODULE12B_PHASE1_WORKFLOW_D_PLAN.md` / `MODULE12B_PHASE2_WORKFLOW_D_NODE_PLAN.md`: **no n8n JSON file was modified to produce this document.** You implement these changes manually in the self-hosted n8n editor and export a new `Phase10.json` when done, same as every prior round.

Source of truth for discovery: `22nd Aug - Workflow D - CC Parser + Gemini Fallback - Statements Processing - Phase9.json` (78 nodes — the latest, most advanced export; already contains statement idempotency, resumable execution, and the Phase 8 strict card/account-matching fix). `Workflow D CC_Parser_Gemini Fallback_Expense_Processing_Production.json` (56 nodes, older) and `n8n workflows/Workflow D Bank Statement Processing -Experimentation.json` (46 nodes, PDF.co-based — a different, superseded parsing approach) were both inspected but are **not** the baseline; Phase9 is.

No live n8n or Supabase MCP server was available in this session. I did not end up needing Supabase MCP: the real `statements` and `statement_transactions` column names below were read directly from the live `Create Statement`, `Create a row`, and `Update Statement Row` nodes' `fieldsUi` — more authoritative than a doc snapshot. If you want live-DB constraint/index verification (NOT NULL, uniqueness on `statements.source_message_id`, etc.), that still needs either Supabase MCP or a query you run — flagged as an open item in §S.

**No real passwords appear anywhere in this document.** The existing `Extract Password for Bank` node has four bank passwords hardcoded as plaintext JS literals — I read them to confirm the bug but they are not reproduced here, and the fix replaces every one of them with an n8n environment-variable reference.

---

## A. Existing Workflow D architecture discovered

```
Gmail - Watch Banking Label / Schedule Trigger → Get many messages
  → Extract Email Metadata            (bank detection: sender/subject/snippet regex registry, weighted, sender-authoritative)
  → Extract Password for Bank         (bank → password + card_last4/account_type/card_type, THE BUG IS HERE)
  → Prepare Parser Request            (canonical bank name → parser's own bank slug, e.g. "HDFC Bank" → "hdfc")
  → CC Parser API                     (POST multipart: file, password, bank, email_subject, sender_email, attachment_filename)
  → Classify Parser Response          (HTTP-layer only: 200 passthrough of {parse_status, extraction_method, parse_quality, bank, data, raw_text}; 4xx/5xx → routing_decision:'error')
  → Classify Connection Failure       (connection-level failures only, via onError continueErrorOutput)
  → Evaluate Parse Quality            (single decision point: native | fallback | error)
  → Route Native / Fallback / Error   (switch on routing_decision)
      native   → Structured Transactions      (already has full Credit Card / Savings / Current branching — see below)
      fallback → Gemini Statement Normalization → Parse Gemini JSON → Validate AI Output → AI Validation Gate → Canonical AI Transactions (CC-shape only, no bank-account logic)
      error    → (existing error/review path, not modified in this plan)
  → Attach Metadata                   (merges statement-level metadata onto each transaction item; has its own smaller version of the same bug — see §B)
  → [statement lifecycle: Check Existing Statement → IF Statement Exists → Create Statement | Resume Existing Statement → Set Statement Context] — idempotency, already generic, not bank/CC-specific
  → Category Hint Check / Apply Category Hint / AI Categorize1 / Normalize AI Category Output / Validate Canonical Category → Build Final Transaction Row → Validate Final Transaction → Create a row (statement_transactions insert)
  → Get Statement Transactions (resume-safe re-read) → Resolve Account: Get Accounts → Aggregate Statement Totals → Account Needs Creation? → Create Account If Missing → Merge Account Resolution → Finalize Statement Update → Update Statement Row → Remove Input Label / Add Processed Label
```

Answers to the Phase 1 discovery questions:

1. **Bank name detected**: `Extract Email Metadata`, via a weighted sender/subject/snippet regex registry (`BANK_REGISTRY`, 12 banks). Sender match is authoritative (weight 100, early-exit). Outputs raw registry key (e.g. `"HDFC"`), not yet canonicalized.
2. **Account/card type detected pre-parser**: **nowhere.** `Extract Email Metadata` only detects the bank, never the document type. This is exactly Phase 6's "bootstrap problem" — confirmed, not assumed.
3. **Password extracted**: `Extract Password for Bank`, a Code node, immediately after bank-name canonicalization.
4. **Password selected from configuration**: a flat object `bankData[canonicalBankName]` → one password, full stop. No second axis.
5. **Before or after document-type detection**: there is no document-type detection before this node at all (see #2) — so today's password selection isn't even "wrong branch," it's "no branch."
6. **Information available at password-selection time**: `bank_name` (raw + canonical), `message_id`, `subject`, `sender_email`, `timestamp`, and (unused at this point) the binary PDF attachment including its filename. Enough to build a pre-parser hint (Phase 4/6), confirmed by direct inspection.
7. **Parser call**: `CC Parser API`, `POST http://cc-parser-api:8000/parse`, multipart form: `file`, `password` (from `Extract Password for Bank`), `bank` (parser slug from `Prepare Parser Request`), `email_subject`, `sender_email`, `attachment_filename`. `fullResponse:true, neverError:true` so both 200 and 4xx/5xx land on the main output.
8. **How parser response identifies credit_card vs bank_account**: `Classify Parser Response` already passes `body.data` through untouched, so once the upgraded parser starts returning `data.statement_type`, it reaches downstream nodes automatically — **no change needed in `Classify Parser Response` itself.**
9. **Nodes that assume everything is a Credit Card**:
   - `Extract Password for Bank` — hardcodes `account_type: 'Credit Card'` for every one of the 4 configured banks.
   - `Attach Metadata` — `card_type: txn.card_type ?? 'Credit'`, `account_type: txn.account_type ?? 'Credit Card'` (a narrower, secondary instance of the same defaulting bug — only bites if upstream ever produces a falsy type, but it's a live landmine).
   - `Build Statement Row` / `Build Statement Metadata` (both dead — see §S) hardcode `'Card Type': 'Credit'`. Not touched (dead code, per the "no unrelated cleanup" rule).
   - `Structured Transactions`, notably, **already does not** make this assumption — it already has complete `isSavings`/`isCurrent`/credit-card branching logic (see §C). It's just structurally blocked by the upstream override.
10. **Nodes that write to Supabase**: `Create Statement`, `Update Statement Row`, `Create a row` (statement_transactions), `Resolve Account: Get Accounts`, `Create Account If Missing`, `Merchant Lookup RPC`, `Save Merchant Memory`, `Check Existing Statement`, `Load Canonical Categories`, `Get Statement Transactions`.
11. **Account matching**: `Aggregate Statement Totals` → `Account Needs Creation?` → `Create Account If Missing` → `Merge Account Resolution` → `Finalize Statement Update`.
12. **statement_transactions creation**: `Create a row`, one insert per transaction item.
13. **Deduplication**: statement-level idempotency via `Check Existing Statement`/`IF Statement Exists`/`Check Statement Processing Status`/`Resume Existing Statement` (keyed on `statements.source_message_id`, unique per user+message). Per-transaction dedup is not a separate mechanism — it's inherited from the statement-level gate (a statement is either fresh-processed once or resumed, never double-run). This is shared, generic infrastructure — not bank/CC-specific, and out of this plan's scope to modify.

## B. Root cause of the current password-selection bug

`Extract Password for Bank`'s `bankData` object is keyed **only** by canonical bank name. Each of the 4 configured banks maps to exactly one password and, critically, a **hardcoded literal `account_type: 'Credit Card'`** — regardless of what kind of statement actually arrived. There is no second axis for document/account type anywhere in the credential configuration.

This does two kinds of damage:

1. **Wrong password.** A bank-account PDF from HDFC would be sent to the parser with HDFC's _credit-card_ password, since that's the only password `bankData['HDFC Bank']` has. Decryption fails before the parser can even attempt to classify the document (confirms Phase 6's "bootstrap problem" is real, not hypothetical).
2. **Wrong type, even downstream of a successful parse.** `Structured Transactions` (the native-path normalizer) already contains fully-built `isSavings`/`isCurrent`/credit-card branching logic — this is _not_ something Phase 10 needs to invent. But its priority order reads `passwordMeta.account_type` (from `Extract Password for Bank`) **before** the parser's own `data.account_type`. Since `passwordMeta.account_type` is unconditionally the literal string `'Credit Card'` today, `Structured Transactions` can never reach its own Savings/Current branches — they're dead code by construction, not by design.

A secondary, narrower copy of the same bug lives in `Attach Metadata`: `account_type: txn.account_type ?? 'Credit Card'`. Today this rarely fires (Structured Transactions already sets a value), but it's a silent-wrong-default waiting to bite the moment an edge case produces a falsy `account_type` — exactly the "Savings/Current defaults to Credit Card" failure mode this whole phase exists to prevent. Fixed alongside the main bug (§F item 4).

**Good news that shrinks this plan's scope considerably**: account resolution (`Aggregate Statement Totals`) is _already_ generic and correct — it already strictly separates `card_last4` vs `account_last4` based on `account_type`, already never coalesces them (the exact "Phase 7.1 fix" / "Phase 8 fix" your file naming refers to), and already supports arbitrary `account_type` values, not just `'Credit Card'`. **No changes needed there.** Once the password-resolution bug is fixed, correct `account_type` values flow through to code that already handles them correctly.

## C. Exact password-resolution logic before the parser call (new)

New node **`Detect Statement Credential Type`** (Code node), inserted between `Extract Email Metadata` and `Extract Password for Bank`. Non-authoritative — its only job is picking which password to try; the parser's own `data.statement_type` is authoritative once available (§D), and gets cross-checked against this hint post-parse (§F item 5).

```js
// Non-authoritative pre-parser signal used ONLY to select which PDF
// password to try. We cannot ask the parser without first decrypting the
// PDF, and decrypting requires picking a password before we can be
// certain of the document type -- this is the Phase 6 bootstrap problem.
// The parser's own data.statement_type (post-parse) remains authoritative
// and is cross-checked against this hint in "Evaluate Parse Quality".
const subject = String($json.subject || '').toLowerCase()
const senderEmail = String($json.sender_email || '').toLowerCase()
const filename = String(
  ($binary && $binary.attachment_0 && $binary.attachment_0.fileName) || '',
).toLowerCase()
const haystack = [subject, senderEmail, filename].join(' ')

// Card-product names reuse the same vocabulary "Extract Email Metadata"'s
// BANK_REGISTRY already trusts as credit-card signals (regalia, diners
// club, millennia, infinia, rubyx, etc.) plus generic phrasing. Review and
// extend against real subject lines during Phase 7 testing -- flagged
// explicitly, same as this codebase's existing "UNVERIFIED" convention.
const CREDIT_CARD_SIGNALS = [
  'credit card',
  'card statement',
  'card ending',
  'cc statement',
  'diners club',
  'regalia',
  'millennia',
  'infinia',
  'rubyx',
  'saphiro',
  'amazon pay icici',
  'burgundy',
  'magnus',
  'zenith',
  'vetta',
  'altura',
  'simplyclick',
  'simplysave',
  'platinum travel',
  'smartearn',
  'membership rewards',
]
const BANK_ACCOUNT_SIGNALS = [
  'savings account',
  'savings a/c',
  'current account',
  'current a/c',
  'bank statement',
  'account statement',
  'overdraft',
  'od account',
  'a/c statement',
]

const hasCreditSignal = CREDIT_CARD_SIGNALS.some((s) => haystack.includes(s))
const hasBankSignal = BANK_ACCOUNT_SIGNALS.some((s) => haystack.includes(s))

let credential_type_hint
if (hasCreditSignal && !hasBankSignal) {
  credential_type_hint = 'credit_card'
} else if (hasBankSignal && !hasCreditSignal) {
  credential_type_hint = 'bank_account'
} else {
  // Neither matched, or both matched (genuinely ambiguous text). Whether
  // this is survivable depends on how many credentials this bank actually
  // has configured -- decided next, in "Extract Password for Bank".
  credential_type_hint = 'ambiguous'
}

return {
  json: { ...$json, credential_type_hint },
  binary: $binary,
}
```

**Connection change**: `Extract Email Metadata → Extract Password for Bank` becomes `Extract Email Metadata → Detect Statement Credential Type → Extract Password for Bank`. That is the only wiring change this item makes.

## D. Exact credential configuration structure

`Extract Password for Bank`, full rewrite. Bank-name canonicalization (`BANK_NAME_MAP`) is **unchanged** — only the config/resolution section below it changes.

```js
const rawBankName = String($json.bank_name || '').trim()
if (!rawBankName) {
  throw new Error('Bank name is required')
}

// ============================================================
// BANK NAME NORMALIZATION -- UNCHANGED
// ============================================================
const BANK_NAME_MAP = {
  HDFC: 'HDFC Bank',
  'HDFC Bank': 'HDFC Bank',
  ICICI: 'ICICI Bank',
  'ICICI Bank': 'ICICI Bank',
  YES_Bank: 'YES Bank',
  'YES Bank': 'YES Bank',
  AU_Small_Finance: 'AU Bank',
  'AU Bank': 'AU Bank',
}
const canonicalBankName = BANK_NAME_MAP[rawBankName]
if (!canonicalBankName) {
  throw new Error(
    `Unsupported/unmapped bank name: "${rawBankName}". ` +
      `Supported values: ${Object.keys(BANK_NAME_MAP).join(', ')}`,
  )
}

// ============================================================
// CREDENTIAL CONFIGURATION -- bank + document/account type.
// Passwords are NEVER literals -- every one is read from an n8n
// environment variable, one per (bank, type) pair. Set these in the
// n8n instance's environment configuration before relying on them;
// a bank/type pair with no env var set fails loudly (see resolution
// logic below), never silently.
//
// To add a new bank or a new document type for an existing bank: add
// one entry here and set its env var. Nothing else in this workflow
// needs to change -- this is the single authoritative credential store.
// ============================================================
const CREDENTIAL_CONFIG = {
  'HDFC Bank': {
    credit_card: {
      password: $env.HDFC_CREDIT_CARD_PDF_PASSWORD,
      card_last4: '7125',
      account_last4: null,
      account_type: 'Credit Card',
      card_type: 'Credit',
      business_personal: 'Personal',
    },
    bank_account: {
      password: $env.HDFC_BANK_ACCOUNT_PDF_PASSWORD,
      card_last4: null,
      account_last4: $env.HDFC_BANK_ACCOUNT_LAST4 || null,
      // account_type intentionally left null -- the parser's own
      // data.account_type (Savings/Current/OD) is authoritative for
      // bank-account statements once the parse succeeds. See "Structured
      // Transactions" (§F item 3).
      account_type: null,
      card_type: null,
      business_personal: 'Personal',
    },
  },
  'ICICI Bank': {
    credit_card: {
      password: $env.ICICI_CREDIT_CARD_PDF_PASSWORD,
      card_last4: '7023',
      account_last4: null,
      account_type: 'Credit Card',
      card_type: 'Credit',
      business_personal: 'Personal',
    },
    bank_account: {
      password: $env.ICICI_BANK_ACCOUNT_PDF_PASSWORD,
      card_last4: null,
      account_last4: $env.ICICI_BANK_ACCOUNT_LAST4 || null,
      account_type: null,
      card_type: null,
      business_personal: 'Personal',
    },
  },
  'YES Bank': {
    credit_card: {
      password: $env.YES_BANK_CREDIT_CARD_PDF_PASSWORD,
      card_last4: '7736',
      account_last4: null,
      account_type: 'Credit Card',
      card_type: 'Credit',
      business_personal: 'Personal',
    },
    // No bank_account credential configured yet -- single-credential bank.
    // A bank_account statement from YES Bank today correctly fails with
    // MISSING_CREDENTIAL (not a silent wrong-password guess) until you
    // add one. See resolution rule 2 below.
  },
  'AU Bank': {
    credit_card: {
      password: $env.AU_BANK_CREDIT_CARD_PDF_PASSWORD,
      card_last4: '2723',
      account_last4: null,
      account_type: 'Credit Card',
      card_type: 'Credit',
      business_personal: 'Business',
    },
  },
}

// ============================================================
// CREDENTIAL TYPE RESOLUTION
//
// Rule 1: a strong, positive pre-parser hint ('credit_card' or
//         'bank_account') is honored IF that credential is configured
//         for this bank. If the hint is positive but nothing is
//         configured for it, that is a MISSING_CREDENTIAL failure --
//         never silently fall through to whatever else happens to be
//         configured.
// Rule 2: an 'ambiguous'/missing hint is honored ONLY when the bank has
//         exactly ONE credential type configured -- there is nothing to
//         disambiguate, so no guess is actually being made.
// Rule 3: anything else -- ambiguous hint AND multiple credentials
//         configured -- is PASSWORD_UNRESOLVED. Never defaults to
//         credit_card. Never picks "the first matching bank credential".
// ============================================================
const bankCredentials = CREDENTIAL_CONFIG[canonicalBankName]
if (!bankCredentials) {
  throw new Error(`No credential configuration found for canonical bank: "${canonicalBankName}".`)
}

const configuredTypes = Object.keys(bankCredentials)
const hint = $json.credential_type_hint // 'credit_card' | 'bank_account' | 'ambiguous'

let resolvedType
if (hint === 'credit_card' || hint === 'bank_account') {
  if (bankCredentials[hint]) {
    resolvedType = hint
  } else {
    throw new Error(
      `MISSING_CREDENTIAL: pre-parser signal indicates a "${hint}" statement for ` +
        `${canonicalBankName}, but no ${hint} credential is configured for this bank yet. ` +
        `Configure CREDENTIAL_CONFIG['${canonicalBankName}'].${hint} (and its env var) before ` +
        `this statement can be processed. Refusing to guess.`,
    )
  }
} else if (configuredTypes.length === 1) {
  resolvedType = configuredTypes[0]
} else {
  throw new Error(
    `PASSWORD_UNRESOLVED: cannot determine document type for bank "${canonicalBankName}" ` +
      `(hint="${hint || 'none'}"). Multiple credentials are configured ` +
      `(${configuredTypes.join(', ')}) and the pre-parser signal was not strong enough to pick ` +
      `one. Manual review required -- refusing to guess.`,
  )
}

const data = bankCredentials[resolvedType]
if (!data.password) {
  throw new Error(
    `MISSING_CREDENTIAL: no password configured for ${canonicalBankName} / ${resolvedType}. ` +
      `Set the corresponding environment variable in the n8n instance.`,
  )
}

// ============================================================
// RETURN NORMALIZED OUTPUT
// Same shape as before, PLUS credential_type (new) which downstream
// nodes use as the pre-parse type assumption for cross-validation.
// account_type/card_type NO LONGER default to a hardcoded value here --
// for bank_account they're intentionally null; "Structured Transactions"
// resolves the real value from the parser's own response.
// ============================================================
return {
  json: {
    bank_name: canonicalBankName,
    parser_bank_name: rawBankName,
    credential_type: resolvedType,
    password: data.password,
    card_last4: data.card_last4 ?? $json.card_last4 ?? null,
    account_last4: data.account_last4 ?? $json.account_last4 ?? null,
    account_type: data.account_type ?? null,
    card_type: data.card_type ?? null,
    business_personal: data.business_personal ?? $json.business_personal ?? null,
    message_id: $json.message_id ?? null,
    subject: $json.subject ?? null,
    sender_email: $json.sender_email ?? null,
    timestamp: $json.timestamp ?? null,
  },
  binary: $binary,
}
```

You'll need to set these environment variables on the n8n instance (Settings → Environment, self-hosted): `HDFC_CREDIT_CARD_PDF_PASSWORD`, `HDFC_BANK_ACCOUNT_PDF_PASSWORD`, `ICICI_CREDIT_CARD_PDF_PASSWORD`, `ICICI_BANK_ACCOUNT_PDF_PASSWORD`, `YES_BANK_CREDIT_CARD_PDF_PASSWORD`, `AU_BANK_CREDIT_CARD_PDF_PASSWORD`, and optionally `HDFC_BANK_ACCOUNT_LAST4` / `ICICI_BANK_ACCOUNT_LAST4` if you want the account last-4 pre-populated rather than parser-derived. This also happens to satisfy the standing MODULE12B_PHASE2 §12 recommendation (credentials as env vars, not literals) that hadn't been applied yet — folded in here since it's directly required by this task's "never hardcode passwords" constraint.

## E/F. Exact nodes modified / added, and why

| #   | Node                               | New / Modified | What changes                                                                                                             |
| --- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | `Detect Statement Credential Type` | **New**        | Pre-parser type hint — §C                                                                                                |
| 2   | `Extract Password for Bank`        | **Modified**   | Full credential-resolution rewrite — §D                                                                                  |
| 3   | `Structured Transactions`          | **Modified**   | Type-determination block only (below) — parser `statement_type` becomes authoritative                                    |
| 4   | `Attach Metadata`                  | **Modified**   | Remove the two hardcoded `'Credit'`/`'Credit Card'` defaults                                                             |
| 5   | `Evaluate Parse Quality`           | **Modified**   | Cross-validate pre-parse hint vs. parser's `statement_type`; block bank-account statements from the Gemini fallback path |

**Everything else is unchanged** — `Prepare Parser Request`, `CC Parser API`, `Classify Parser Response`, `Classify Connection Failure`, `Route Native / Fallback / Error`, `Gemini Statement Normalization`/`Parse Gemini JSON`/`Validate AI Output`/`AI Validation Gate`, `Canonical AI Transactions`, all account-resolution nodes (`Resolve Account: Get Accounts`, `Account Needs Creation?`, `Create Account If Missing`, `Merge Account Resolution`, `Aggregate Statement Totals`, `Finalize Statement Update`), the entire statement-lifecycle/idempotency subsystem, `Create a row`, `Build Final Transaction Row`, categorization, merchant lookup, dedup, and Gmail label transitions.

### Item 3 — `Structured Transactions`: type-determination block only

Everything else in this node (statementMetadata assembly, `buildTransaction`, payments/refunds handling, the final `return`) is untouched. Only the block that currently starts at `const explicitAccountType = ...` through `let accountType; ... }` is replaced:

```js
// ------------------------------------------------------------
// Determine account/card type
//
// Priority (Phase 10 -- parser-authoritative):
// 1. data.statement_type from the parser response -- authoritative once
//    the parser has actually looked at the decrypted document. Values:
//    'credit_card' | 'bank_account'. New field, not previously read here.
// 2. data.account_type from the parser (Savings/Current/OD/...) when
//    statement_type says bank_account -- the parser owns this label,
//    Workflow D never invents a new one.
// 3. passwordMeta.account_type -- the PRE-PARSE credential-type
//    assumption from "Extract Password for Bank". Used only as a
//    defensive fallback if the parser response is missing
//    statement_type entirely (e.g. an older parser version).
// 4. Card-number-presence heuristic -- last-resort fallback, preserved
//    unchanged from the pre-Phase-10 behavior for backward compatibility.
// ------------------------------------------------------------

const parserStatementType = data.statement_type || null

const explicitAccountType =
  (parserStatementType === 'bank_account' ? data.account_type : null) ||
  (parserStatementType === 'credit_card' ? 'Credit Card' : null) ||
  passwordMeta.account_type ||
  data.account_type ||
  null

const hasCardNumber = Boolean(data.card_number)
const hasCardLast4 = Boolean(passwordMeta.card_last4)

const normalizedAccountType = String(explicitAccountType || '')
  .trim()
  .toLowerCase()

const isSavings = normalizedAccountType === 'savings' || normalizedAccountType === 'savings account'
const isCurrent = normalizedAccountType === 'current' || normalizedAccountType === 'current account'
const isOverdraft =
  normalizedAccountType === 'od' ||
  normalizedAccountType === 'overdraft' ||
  normalizedAccountType === 'od account'
const isExplicitCreditCard =
  normalizedAccountType === 'credit card' ||
  normalizedAccountType === 'creditcard' ||
  normalizedAccountType === 'credit_card'

const isCardStatement =
  parserStatementType === 'credit_card' ||
  (parserStatementType !== 'bank_account' &&
    (isExplicitCreditCard ||
      (!isSavings && !isCurrent && !isOverdraft && (hasCardNumber || hasCardLast4))))

let accountType
if (isCardStatement) {
  accountType = 'Credit Card'
} else if (isSavings) {
  accountType = 'Savings'
} else if (isCurrent) {
  accountType = 'Current'
} else if (isOverdraft) {
  accountType = 'OD'
} else {
  accountType = explicitAccountType || null
}
```

Everything downstream of this block (`cardLast4`/`accountLast4` computation, `statementMetadata`, `buildTransaction`) already reads `accountType`/`isCardStatement` exactly as before — **no other line in this node changes.** This is deliberately the smallest possible edit: the branching logic for Savings/Current/card was already correct and already generic; it just needed the right input.

### Item 4 — `Attach Metadata`: remove unsafe defaults

```diff
- card_type:
-   txn.card_type ?? 'Credit',
+ card_type:
+   txn.card_type ?? null,

- account_type:
-   txn.account_type ?? 'Credit Card',
+ account_type:
+   txn.account_type ?? null,
```

Rationale: `txn.account_type`/`txn.card_type` should always already be correctly populated by `Structured Transactions` after item 3's fix. If they're ever still falsy here, that's a genuine gap that should surface as `null` (and get caught by `Validate Final Transaction` downstream — not modified in this plan, but worth confirming in Phase 3 testing that it actually rejects a null `account_type`) rather than being silently mislabeled as a credit card — which is precisely the failure mode this whole phase exists to close.

### Item 5 — `Evaluate Parse Quality`: cross-validation + fallback guard

Two additions to the existing function, inserted after `pq`/`decision` are computed and before the final `const out = { ...j, routing_decision: decision };` line. The existing native/fallback/error decision logic is otherwise untouched.

```js
// Phase 10a: cross-validate the credential type assumed BEFORE parsing
// (used to pick the password) against the parser's own authoritative
// statement_type, now available since decryption succeeded. A genuine
// mismatch is unlikely (wrong password normally just fails to decrypt
// outright) but must never be silently continued past.
if (decision !== 'error') {
  const assumedType = $('Extract Password for Bank').first().json.credential_type
  const parserType = j.data?.statement_type || null
  if (assumedType && parserType && assumedType !== parserType) {
    decision = 'error'
    j.error_category = 'statement_type_mismatch'
    j.error_message =
      `Pre-parse credential type "${assumedType}" does not match parser ` +
      `statement_type "${parserType}". Manual review required.`
  }
}

// Phase 10b: Gemini fallback ("Canonical AI Transactions") has no
// bank-account normalization logic -- it only knows the credit-card
// transaction shape. Never route a bank-account statement into it. If a
// bank-account statement fails native parsing, it goes to error/manual
// review instead, exactly like any other unsupported-fallback case --
// not silently sent through a normalizer that will produce wrong output.
if (decision === 'fallback') {
  const assumedType = $('Extract Password for Bank').first().json.credential_type
  const parserType = j.data?.statement_type || null
  if (parserType === 'bank_account' || (!parserType && assumedType === 'bank_account')) {
    decision = 'error'
    j.error_category = 'bank_account_fallback_unsupported'
    j.error_message =
      'Bank-account statement failed native parsing; Gemini fallback only ' +
      'supports credit-card statements. Manual review required.'
  }
}
```

## G. Exact connections modified

Exactly one wiring change: `Extract Email Metadata → Extract Password for Bank` becomes `Extract Email Metadata → Detect Statement Credential Type → Extract Password for Bank`. No other connection in the 78-node graph changes — every other edit in this plan is a field/logic change inside an existing node, not a rewiring.

## H. Bank Account parser wiring

No second parser call, no new HTTP node — confirmed unnecessary. `CC Parser API` is called exactly as today; the only thing that changes upstream is which password reaches it (§D) and, post-response, which branch `Evaluate Parse Quality` sends the result down (§F item 5). The parser itself decides `statement_type` from the decrypted content — Workflow D never attempts its own PDF/document classification, per Phase 2's explicit instruction.

## I. Credit Card path preserved

For any bank with only a `credit_card` credential configured today (YES Bank, AU Bank) or where the hint resolves to `credit_card` (HDFC, ICICI), resolution rule 1/2 in §D resolves to the exact same password and exact same `account_type: 'Credit Card'` outcome as before — the only behavioral difference for an existing HDFC/ICICI/YES/AU **credit-card** email is that `credential_type: 'credit_card'` is now also present on the object (additive, not breaking). `Structured Transactions`, `Attach Metadata`, and every downstream node's existing credit-card behavior is unchanged in shape and value for these cases.

## J. Account resolution logic

**No changes.** `Aggregate Statement Totals` already strictly separates `card_last4` (used only when `accountType === 'Credit Card'`) from `account_last4` (used for every other `accountType`), already never coalesces the two, and already supports arbitrary `account_type` values via `normAcct(a.account_type) === normAcct(accountType)`. This satisfies Phase 10/11/18's "never cross-match" requirement as-is — verified by reading the live code, not assumed.

## K. Statement mapping

**No changes needed to `Create Statement`/`Update Statement Row`.** Both already write generically (bank name, message id, totals, period start/end, due date, balances, account_id) regardless of statement type — none of their field mappings are credit-card-specific. One pre-existing, cross-cutting gap unrelated to this bug: `statement_date` and `opening_balance` are set to `null` at creation and never revisited by `Update Statement Row` — true for the credit-card path today too, not something Phase 10 introduces. Flagged in §S as optional, not included in this plan's scope (Phase 20: don't touch unrelated nodes).

## L. statement_transactions mapping

**No changes needed to `Create a row`.** It already maps both `card_last4`/`card_type` and `account_last4`/`account_type` as separate columns, and already reads `status` from `$json.status` correctly (an earlier-round fix, already live). Once item 3 (§F) produces correct values, they flow through unchanged.

## M. Deduplication behaviour

**No changes.** Statement-level idempotency (`Check Existing Statement`/`IF Statement Exists`/`Resume Existing Statement`) is bank/type-agnostic — it keys purely on `(user_id, source_message_id)`. Since a given statement is classified as either `credit_card` or `bank_account` (never both) by item 3's now-authoritative logic, the "CC path and bank path both insert the same transaction" scenario in Phase 15 cannot occur by construction — there is only one path per statement, decided once.

## N. Gemini fallback behaviour

Modified per §F item 5(b): a bank-account statement that fails native parsing now routes to `error` (manual review) instead of into `Canonical AI Transactions`, which has no bank-account transaction shape. Credit-card fallback behavior is completely unchanged — `Canonical AI Transactions` itself was not touched.

## O/P/Q/R — Test results

**Not run.** No live n8n instance is reachable from this session to execute the workflow, and no Supabase MCP/live database connection is available to verify write results. This plan is unexecuted by design (same as MODULE12B_PHASE1/2). Once you've applied these node edits manually in the editor:

- **Phase 7 test matrix** (repeated here as the concrete acceptance checklist):
  1. HDFC Credit Card email → resolves `HDFC Bank`/`credit_card` credential, `account_type: 'Credit Card'`.
  2. HDFC Savings Account email → resolves `HDFC Bank`/`bank_account` credential (once its env var is set); `Structured Transactions` should classify `account_type: 'Savings'` once the parser confirms.
  3. ICICI Credit Card email → same as #1 for ICICI.
  4. ICICI Savings Account email → same as #2 for ICICI.
  5. Same bank, different document type → confirm items 1–4 above resolve to genuinely different password env vars (verify without printing the values).
  6. Unknown bank → unchanged: `BANK_NAME_MAP` lookup still throws `Unsupported/unmapped bank name`, same as live today.
  7. Bank known, type ambiguous, multiple credentials configured (e.g. once HDFC has both) and the subject/sender give no clear signal → `PASSWORD_UNRESOLVED` thrown, not a silent credit-card guess.
  8. Bank known, positive hint, but that credential isn't configured yet (e.g. a bank-account email for YES Bank today) → `MISSING_CREDENTIAL` thrown, not a fallback to the credit-card password.
  9. Existing HDFC CC email, unchanged subject patterns → must resolve identically to production today (§I).
  10. Existing CC parser/workflow behavior (Gemini fallback, dedupe, categorization) → unchanged, per §E's "everything else is unchanged" list.
  11. HDFC Savings integration expectations (11 txns, debit 116569.23, credit 303236.97, closing 469824.20, account ••••6362) and ICICI Savings (3 txns, debit 5055.00, credit 58610.00, closing 55844.00, account ••••2332) — these are the Phase 17 acceptance numbers; verify against real parser output once `HDFC_BANK_ACCOUNT_PDF_PASSWORD`/`ICICI_BANK_ACCOUNT_PDF_PASSWORD` are configured and a real statement is run through. Not hardcoded anywhere in the logic above, per instruction.
  12. CC regression: card_last4 mapping, CC account resolution, statement creation, Gemini fallback, dedupe all re-verified unchanged (§E list).
  13. Cross-match check: a CC statement's `card_last4` and a Savings statement's `account_last4` that happen to share the same 4 digits must never match each other's account row — already guaranteed by `Aggregate Statement Totals`'s existing `identifierField` branch (§J), unchanged.

## S. Unresolved / flagged items

- **Live verification not run** — no n8n/Supabase MCP access this session (§ intro). Everything above is derived from static code reading of the Phase9 export, not execution.
- **`statement_date`/`opening_balance` never populated** (§K) — pre-existing, cross-cutting, not bank-account-specific. Left out of this plan's scope; flag separately if you want it fixed.
- **`CREDIT_CARD_SIGNALS`/`BANK_ACCOUNT_SIGNALS` keyword lists (§C)** are a reasonable first pass built from the bank product names already trusted elsewhere in this workflow, but unverified against real bank-account statement subject lines (HDFC/ICICI Savings emails specifically) — verify and extend during Phase 7 testing, same "UNVERIFIED, confirm against live data" discipline already used throughout this codebase's comments.
- **Dead nodes** (`Build Statement Row`, `Build Statement Metadata`, `Log to ProcessedLog`, `Write ProcessedLog`, and others noted in `MODULE12B_N8N_AUDIT.md`) still hardcode `'Card Type': 'Credit'` — confirmed dead/unreachable in the live graph, left untouched per the no-unrelated-cleanup rule.
- **`Validate Final Transaction`** was not inspected in this pass (out of the critical path for this bug) — worth a quick check during Phase 3 testing that it actually rejects a `null` `account_type`/`card_type` rather than letting one through silently, now that `Attach Metadata`'s defaults are gone (§F item 4).

## T. Explicit confirmation

**Workflow C was not modified.** No Workflow C file (`19th Aug Workflow C Parser...`, `20th Aug Workflow C Parser...`, `21st Aug Workflow C Parser...`, `22nd Aug Workflow C Parser...`, or `n8n workflows/Transactions Workflow C Parser - Experimentation`) was opened, read, or edited at any point in this session. Nothing in this plan touches Workflow C's Gmail trigger, transaction normalization, merchant lookup, categorization, or Supabase writes.
