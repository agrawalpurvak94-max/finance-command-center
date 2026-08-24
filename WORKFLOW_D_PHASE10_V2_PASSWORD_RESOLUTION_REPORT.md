# WORKFLOW D — Phase 10 v2: Final Password Resolution Architecture

Deliverable: [`23rd Aug Workflow D - Phase 10 - Bank Account Statement Support - Password Resolution v2.json`](23rd%20Aug%20Workflow%20D%20-%20Phase%2010%20-%20Bank%20Account%20Statement%20Support%20-%20Password%20Resolution%20v2.json) — 81 nodes, built from `Workflow D - Phase 10 - Bank Account Statement Support.json` (v1, 79 nodes). No real password value or the discovered Supabase secret appears anywhere in this report.

## Password registry design

Replaced the v1 `bank → {credit_card|bank_account}` map with `STATEMENT_CREDENTIALS`, a flat array keyed conceptually by `(bank_name, statement_type, last4)`, inside `Extract Password for Bank`. **Passwords are hardcoded literals in this node only**, per your explicit instruction this round (reversing v1's environment-variable design) — never logged, never placed in an error/status message, never sent to Gemini/Supabase/Sheets. Only the parser HTTP call consumes a resolved password value.

## All configured bank/card/account mappings found

Cross-checked against every dated Workflow D export in the repo (Production → Phase2 → … → Phase9; the registry only ever grew, 2 banks → 4 banks, so Phase9 is confirmed the most complete prior source) plus this conversation's explicit statements. **6 entries populated:**

| Bank       | Type         | Last4 | Password                  | Status                                                                                                                                                 |
| ---------- | ------------ | ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HDFC Bank  | credit_card  | 7125  | _(hardcoded)_             | Confirmed — Phase9 + reconfirmed this turn                                                                                                             |
| HDFC Bank  | bank_account | 6362  | _(hardcoded)_             | New, given this turn                                                                                                                                   |
| ICICI Bank | credit_card  | 7023  | _(hardcoded)_             | Confirmed — Phase9                                                                                                                                     |
| ICICI Bank | bank_account | 2332  | **`null` — UNCONFIGURED** | Identity known (last4 from the Phase 17 test fixture), password not found anywhere in the repo despite a full search of every prior export — see below |
| YES Bank   | credit_card  | 7736  | _(hardcoded)_             | Confirmed — Phase9                                                                                                                                     |
| AU Bank    | credit_card  | 2723  | _(hardcoded)_             | Confirmed — Phase9 + reconfirmed this turn                                                                                                             |

**Unresolved mappings**: your instruction said ICICI bank-account "should already have a confirmed password mapping in the repository" — it does not. I checked Production.json and every Phase2–Phase9 export directly; the registry only ever contained 2, then 4 credit-card entries, never a bank-account entry for ICICI or any bank. I left `password: null` with an explicit UNCONFIGURED comment rather than guess.

**The other ~10 credit cards and ~3 bank accounts** you referenced (16 total CC / 5 total bank accounts) are not stubbed at all — not even as placeholders — because I have zero identifying information for them (no bank name, no last4, nothing to key an entry on). Inventing placeholder bank names would be fabrication, which you explicitly prohibited ("DO NOT INVENT PASSWORDS"/mappings). The registry is a flat array — adding each real one later is a single independent object, nothing else in the workflow changes.

## Password resolution flow

```
Extract Email Metadata (bank detection, unchanged)
  → Detect Statement Credential Type (extended: + preparse_last4/_type/_source)
  → Extract Password for Bank (registry lookup)
      ├─ resolved single credential  → Prepare Parser Request → Route Password Resolution → [FALSE] → CC Parser API (unchanged)
      └─ 2+ usable candidates, no confirmed pre-parse match
                                     → Prepare Parser Request → Route Password Resolution → [TRUE]  → Resolve Candidate Password
                                                                                                          → Classify Parser Response (success)
                                                                                                          → Classify Connection Failure (all candidates exhausted / thrown error)
```

### Exact metadata resolution behavior

`Detect Statement Credential Type` now also extracts a `preparse_last4` from subject/attachment-filename/sender using context-gated regex (`ending 7125`, `card xxxx7125`, `a/c 6362`, `account no. ...6362`, etc.) — never a bare 4-digit number. In `Extract Password for Bank`:

- Positive type hint + registry has 0 candidates for that bank+type → `MISSING_CREDENTIAL`.
- Positive type hint + `preparse_last4` matches exactly one candidate → resolve it directly (`exact_metadata`), **unless** that candidate's password is the UNCONFIGURED placeholder, in which case `MISSING_CREDENTIAL` naming exactly which bank/type/last4 needs a password.
- Exactly one usable candidate for that bank+type regardless of last4 → resolve it directly (`single_candidate`) — this is not a guess, there's nothing to disambiguate.
- Ambiguous/missing hint → only proceeds if the bank has candidates in exactly one statement_type overall; 0 types → `MISSING_CREDENTIAL`; 2+ types → `PASSWORD_UNRESOLVED` (refuses to try passwords from a type it can't confirm against an unknown document).

### Candidate resolution behavior

Only reached when 2+ usable candidates remain for the confirmed bank+type with no confirmed pre-parse last4 match — **today this branch is structurally present but never exercised by real data**, since every currently-known bank+type pair has exactly 0 or 1 usable candidate. `Resolve Candidate Password` (new Code node) tries each candidate's password against the exact same `cc-parser-api` endpoint (`this.helpers.httpRequest`, multipart form matching `CC Parser API`'s own body shape), stopping at the first response that is both HTTP 200 **and** identity-verified (see below). Only candidates already configured for the confirmed bank+type are ever tried — never another bank, never the other statement type. Exhausting all candidates throws `PASSWORD_UNRESOLVED` naming each attempt's outcome (never the password), which n8n's `onError: continueErrorOutput` routes to the existing `Classify Connection Failure` → error path — no new error-handling mechanism invented.

**Flagged risk**: this node's use of `this.helpers.httpRequest` for a multipart binary POST from inside a Code node is a real, documented n8n pattern, but I have no live n8n instance to confirm the exact option names (`returnFullResponse`, `ignoreHttpStatusErrors`) against your instance's n8n version. **Test this one node manually before relying on it** — everything else in this delivery is either unchanged from the already-more-thoroughly-checked v1, or a small, mechanically verified edit.

### Parser identity verification

`Evaluate Parse Quality` now reads credential info from whichever node actually resolved it this run (`Resolve Candidate Password` if that branch ran, else `Extract Password for Bank`, via the same try/catch cross-node-reference idiom this workflow already uses in `Set Statement Context`), and checks two things before allowing `native`/`fallback` to stand:

1. Parser's `data.statement_type` matches the assumed credential type → else `statement_type_mismatch`.
2. Parser's `data.card_last4`/`data.account_last4` (whichever applies) matches the resolved credential's last4, when the parser returns one → else `credential_identity_mismatch`.

Either failure forces `routing_decision: 'error'` — this is the same gate `Structured Transactions`/downstream Supabase writes sit behind, so **a wrong-but-decryptable password cannot produce a created statement, an inserted transaction, or an assigned account_id.** `Structured Transactions` was also updated to prefer the parser's own direct `data.card_last4`/`data.account_last4` (the new parser contract) ahead of the old card-number-slicing fallback.

## Bank-account test status (structural, not yet run — no live instance)

- **HDFC bank_account, 6362**: registry entry present with the password you gave this turn; `exact_metadata` resolution path is reachable and mechanically sound (verified via diff + `node --check`). Not run against your real PDF fixture.
- **ICICI bank_account, 2332**: **blocked** — no password exists anywhere for me to configure; will throw `MISSING_CREDENTIAL` by design until you supply it.

## Credit-card regression status

Structurally preserved: HDFC 7125, ICICI 7023, YES 7736, and AU 2723 all remain single-candidate resolutions (`single_candidate`/`exact_metadata`), reaching the unchanged `CC Parser API` node exactly as before. 73 of v1's 79 nodes are byte-identical; only `Extract Password for Bank`, `Detect Statement Credential Type`, `Evaluate Parse Quality`, and `Structured Transactions` changed in logic (plus the two unrelated security-fix nodes below).

## Supabase regression status

No Supabase-writing node's _logic_ was touched (`Create Statement`, `Update Statement Row`, `Create a row`, account resolution — all untouched). **One unplanned but explicitly-requested finding**: `Save Merchant Memory` and `Load Merchant Memory` (both `httpRequest` nodes calling `merchant_memory`/`upsert_merchant_memory` REST endpoints directly) had a **Supabase service_role JWT hardcoded as a literal HTTP header value** — a real, live secret exposure (service_role bypasses RLS entirely). Fixed minimally, reusing the exact `httpHeaderAuth` credential (`"Header Auth account"`) already properly used elsewhere in this same workflow (`Merchant Lookup RPC`): removed the literal `apikey`/`Authorization` header values from both nodes and bound `Load Merchant Memory` (which previously had no credential at all — its literal headers were its _only_ auth mechanism) to that same credential. **This key must be rotated in Supabase** — it was present in plaintext in every prior dated export in this repo (Phase9 and earlier), not just introduced now; I did not print it anywhere in this document, but it is technically still resident in those older, untouched files.

## Deduplication behaviour

Unchanged — the statement-level idempotency subsystem (`Check Existing Statement`/`IF Statement Exists`/`Resume Existing Statement`) was not touched.

## Confirmation: Workflow C was not modified

No Workflow C file was opened, read, or edited this session. `git status` confirms all Workflow C files remain in their original untracked state with no modifications.

## Confirmation: no password logged/stored downstream

Passwords exist only inside `Extract Password for Bank`'s `STATEMENT_CREDENTIALS` array and, transiently, in `credential_candidates[].password` (consumed only by `Resolve Candidate Password`'s HTTP call and never returned in its output item — its return object carries `credential_type`/`resolved_last4`/`resolved_last4_type`/`credential_match_method`, never `password`). No downstream node (`Structured Transactions`, `Build Final Transaction Row`, `Create Statement`, `Create a row`) ever receives a `password` field. Error messages throughout reference only `"ending XXXX"` (last4) and named categories (`MISSING_CREDENTIAL`, `PASSWORD_UNRESOLVED`, etc.), never a password value.

## Remaining manual setup required

1. Import the v2 JSON into your n8n instance and verify the import succeeds (not verified here — no live instance).
2. **Manually test `Resolve Candidate Password`** against a real multi-candidate case before trusting it in production — flagged above as the one genuinely unverified mechanism.
3. Supply the real ICICI bank-account (2332) password once you have it — one line in `STATEMENT_CREDENTIALS`.
4. Supply bank/type/last4/password for the remaining ~10 credit cards / ~3 bank accounts as you're ready — each is one new array entry.
5. **Rotate the Supabase service_role key** that was found hardcoded in `Load Merchant Memory`/`Save Merchant Memory` in every prior export — this fix only stops the _new_ file from carrying it forward in a live-auth position; the key itself is unchanged in Supabase until you rotate it.

## Validation performed

Full JSON parse ✓ · node-by-node diff against v1 confirms exactly 2 nodes added, 0 removed, 6 modified (matching this report), 73 byte-identical ✓ · no orphan/dangling connections, unique node ids/names ✓ · `node --check` real JS syntax validation on all 5 touched/new Code nodes ✓ · secret scan confirms the 5 hardcoded passwords appear only where intended and the Supabase JWT fragment has zero occurrences in the new file ✓. **Not verified**: actual n8n import success, and the `this.helpers.httpRequest` multipart pattern inside `Resolve Candidate Password` — both require your live instance.

**FINAL STATUS: PASS WITH WARNINGS** — structurally complete and internally consistent by every check available without a live n8n/Supabase connection; not a bare PASS because real n8n import, the candidate-password HTTP mechanism, and the ICICI bank-account password remain genuinely unverified/unresolved.
