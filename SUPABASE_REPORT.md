# SUPABASE_REPORT.md

Bootstrap Phase 8 — Supabase

Generated: 2026-07-30

---

## What was done

- Installed `@supabase/supabase-js@2.111.0` (see PACKAGE_REPORT.md).
- Created `src/lib/supabase.ts`: reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `import.meta.env`, throws a clear error at import time if either is missing, and exports a single `supabase` client instance.
- Created `src/services/` (empty, per CLAUDE.md's service-layer pattern: Component → Hook → Service → Supabase). No service files were added — that starts with Module 1+ business logic, out of scope for bootstrap.
- Created `.env.example` with placeholder-only values (see CONFIG_REPORT.md).

## What was explicitly NOT done

Per both CLAUDE.md and PROJECT_BOOTSTRAP.md's hard rules:

- No tables created or modified.
- No SQL Views created, read, or modified (the Supabase MCP that would let Claude _inspect_ existing `vw_*` views is not yet connected — see below).
- No RPC functions created or modified.
- No migrations created (`supabase/migrations/` exists and is empty).
- No Supabase CLI `link`/`init` run against the real project — only the JS client was wired up.
- Service role key was never requested, never received, never referenced anywhere in this codebase.

## Update — 2026-07-31

**Supabase MCP is now connected** (personal access token provided — see MCP_REPORT.md). This means Claude can now inspect the real project's tables/views/RPCs read-only ahead of Module 1+ work, per CLAUDE.md's "never guess schema" rule. That inspection has not been performed yet in this session — it should happen before any hooks/services are written against `vw_*` views, not as part of bootstrap.

**`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were also provided** by the user. Per PROJECT_BOOTSTRAP.md Phase 7's explicit instruction — "Never create `.env.local`" — **I did not write these into a `.env.local` file myself**, even though I have the values. This is a deliberate, rule-following decision, not an oversight. The user was given the exact two lines to paste into a `.env.local` they create themselves (see BOOTSTRAP_REPORT.md / chat response). Until that file exists locally, `src/lib/supabase.ts` remains uninstantiated at runtime (it isn't imported anywhere yet — see below) and no live connection has been exercised end-to-end.

`src/lib/supabase.ts` compiles and type-checks, but it is still **not imported anywhere** (not in `App.tsx`) — that starts with Module 1+ work, not bootstrap.

## Manual steps remaining

1. Create `.env.local` yourself with the values already shared in chat (deliberately not created on your behalf — see above).
2. Before Module 1+ hooks/services are written, use the now-connected Supabase MCP to list existing views and confirm which of CLAUDE.md Part 3's required `vw_*` views already exist versus need a migration.
