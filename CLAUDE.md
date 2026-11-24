\# CLAUDE.md

\# Finance Command Center  
\#\# Claude Code Implementation Playbook

Version: 1.0

Status: Production Engineering Guide

Authoritative Specification

\---

\# PURPOSE

This document is the permanent engineering guide for Claude Code.

It defines:

\- Project architecture  
\- Coding standards  
\- Design standards  
\- Backend architecture  
\- Frontend architecture  
\- Database architecture  
\- Development workflow  
\- Module implementation contracts  
\- Rules that must never be violated

Whenever there is ambiguity, this document takes precedence over assumptions.

If requirements conflict with implementation, stop and ask for clarification.

Never redesign approved architecture.

\---

\# PROJECT PHASE: FEATURE DEVELOPMENT MODE

Status as of 2026-08-03: ARCHITECTURE FROZEN.

The architecture, shared components, domain layer, and project foundation are now considered complete.

\- Application Shell — done  
\- Dashboard — UI done, data layer live (Supabase repositories; the earlier "still mock" note was stale — corrected 2026-11-23)  
\- Domain layer (\`src/domain/\*\`) — done, shared, do not fork  
\- Repository/service/hook layering — done, do not redesign  
\- Shared components (\`PageContainer\`, \`QueryBoundary\`, \`EmptyState\`, \`ConfirmDialog\`, \`Pagination\`, \`FloatingActionButton\`, shadcn/ui primitives) — done, reuse only

The project has transitioned from architecture-first to feature delivery.

\---

\#\# Verified status as of 2026-11-22 (project recovery audit)

This section reconciles the module table below with what is actually in the repository and the live Supabase project, confirmed by direct inspection (not assumption). Where this section and the rest of Part 1 disagree, this section is correct — update the rest of the document to match it as each module is next touched, per "Update CLAUDE.md only after the new architecture is verified."

\- Modules 5–9 (Categories, Merchants, Clients, Accounts, Credit Cards) are substantially built already, ahead of where the original module table assumed. \`src/pages/CreditCards.tsx\`, \`src/pages/StatementExplorer.tsx\`, and their supporting repositories/hooks/services exist and are wired to Supabase. \`src/pages/Accounts.tsx\` and its components are present but orphaned (not reachable from navigation) — confirm before building Module 8 whether to wire it in or delete it.
\- Module 11 (Settings) was replaced with a different, approved feature: \`src/pages/Settings.tsx\` was deliberately removed in favor of a new Credentials module (\`src/pages/Credentials.tsx\`, \`src/domain/Credential.ts\`, \`src/hooks/useCredentials.ts\`, \`src/components/credentials/\`) — see \`src/lib/navigation.ts\` comment dated 2026-09-17 ("roadmap correction"). Credentials stores/edits bank and credit-card statement passwords, currently as **plaintext visible to the browser** — this is an open security gap, see "DATABASE SECURITY" and the Credentials note under "n8n INTEGRATION" below. Do not remove the Credentials feature; secure it instead.
\- Module 12A (Supabase Integration) is **substantially already done**, not upcoming: 9 of 10 \`*.service.ts\` files resolve to a \`Supabase\*Repository\`, not a mock. **Correction 2026-11-23:** the dashboard also reads live repositories (verified in the browser against live data) — there is no remaining mock service; Module 12A is done.
\- Live Supabase schema (project \`fincommand\`, id \`cnxfrlirhycbqnwfxvpm\`) confirmed via direct inspection: **11 tables**, **27 views** (all 27 are \`SECURITY DEFINER\` — confirmed by the Postgres linter; whether each one independently re-filters by \`auth.uid()\` has NOT yet been verified per-view and remains an open security item), **4 RPC functions**: \`lookup_merchant\`, \`upsert_merchant_memory\`, \`fn_resolve_merchant_default_category\`, \`set_updated_at\`. These are the real RPC names — ignore the illustrative \`rpc_*\` names in the "RPC FUNCTIONS" section below, which describe the intended pattern, not actual function names.
\- **Critical, unresolved security findings** (do not treat as fixed by this audit): (1) \`application_settings\`, \`audit_logs\`, \`notifications\` have RLS disabled — fully exposed to the anon key; (2) a live Supabase service-role JWT was found hardcoded in plaintext in an n8n workflow node (a decoy workflow called "Workflow C - Production Ready", not one of the canonical C/D/E) — rotate this key and never assume redacting a file is sufficient; (3) Credentials module exposes statement passwords in plaintext to the browser. See \`docs/security/SECURITY_REMEDIATION_REPORT.md\` once written.
\- n8n workflow naming: the three real backend automations are **Workflow C, D, E** (see the corrected "n8n INTEGRATION" section below), not "Workflow A/B/C" as originally described in "EXISTING BACKEND (CRITICAL)". That section is kept below for historical reference to the original architecture intent, but the concrete current workflow identities, canonical versions, and status live in \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\`.
\- CC Parser is a separate FastAPI microservice (\`cc-parser-api\`, Dockerized, port 8000) already handling **both** credit-card and bank-account statement parsing — Statements support for both account types already exists there, it is not new work. Its repo also holds \`Card Registry - Prakash Singh.xlsx\`, which is the source of record for bank/card statement passwords (do not invent credentials — resolve Workflow D/E's missing password configurations from this file, with the user's involvement, not by fabrication).

\---

\#\# Verified status as of 2026-11-23 (D worker 500-fix, node cleanup, workflow archive reorg, deployment prep)

This section updates "Verified status as of 2026-11-22" above — where they disagree, this is correct.

\- \*\*New table, not previously documented here:\*\* \`public.api\_keys\` (migration \`add\_api\_keys\_table\`, 2026-11-23) — write-only third-party API key storage (currently holds \`gemini\_api\_key\`). RLS enabled. Authenticated users can set a key but never read its value back; n8n reads it with the service-role key via the \`Load API Keys\` node. Live schema is now \*\*12 tables\*\*, not 11 — see the corrected list in "EXISTING DATABASE" below.
\- \*\*New RPC, not previously documented here:\*\* \`start\_statement\` (migration \`add\_start\_statement\_function\`, 2026-11-23), used by Workflow D's worker to begin a statement-processing run. Live RPC count is now \*\*5\*\*, not 4 — see "RPC FUNCTIONS" below.
\- \*\*Workflow D "already processed" duplicate path returned HTTP 500 — fixed.\*\* Root cause: the \`Ingest Webhook\` node used \`responseMode: lastNode\`, so whichever node happened to execute last on a given run determined the HTTP response; on the duplicate-statement short-circuit path, that was not a node producing a clean JSON body. Fix: switched to \`responseMode: responseNode\` and added an explicit \`Respond OK\` (\`respondToWebhook\`) node wired from every true terminal node. Verified live: the previously-500ing duplicate message now returns \`HTTP 200 {"status":"ok"}\`.
\- \*\*Dead node branch deleted from D worker.\*\* While tracing the 500 fix, found \`Code in JavaScript1 → Merge Statement + PDF → Split Out\` was an unreachable/dead-end branch (3 nodes) left over from an earlier refactor. Confirmed harmless (not on the real save path) and deleted. D worker is now \*\*54 nodes\*\* (was 56 as of 2026-11-22, briefly 57 mid-fix, now 54 after the 500-fix net node and the 3-node deletion). C worker unchanged at 29 nodes.
\- \*\*\`workflows/active/\` reorganized.\*\* Fresh, timestamped, redacted exports of the current live C (29 nodes) and D (54 nodes) workers were saved as \`Workflow {C,D} - Worker (live 2026-11-23\_2218).json\`. The 3 canonical frozen files and the superseded same-day worker exports were moved to \`workflows/archive/\`. \`workflows/active/\` now holds exactly 4 files: the C and D pollers (unchanged) plus the 2 newly-timestamped workers — this is the current deployable set. \`workflows/canonical/\` is untouched, still the frozen rollback copies.
\- \*\*Cloud VM / hosting split decided and documented, not yet executed.\*\* Plan: n8n + \`cc-parser-api\` move to a small self-hosted VM (Docker Compose, see the \`n8n-self-hosting\` skill); frontend moves to Netlify's free tier (static Vite SPA, no server code — confirmed sufficient, needs a \`netlify.toml\` with an SPA redirect rule plus \`VITE\_SUPABASE\_URL\`/\`VITE\_SUPABASE\_ANON\_KEY\` set in the Netlify dashboard, since \`.env.local\` is gitignored); Supabase database moves to a new Supabase account/login (new org), full runbook drafted covering schema replay, \`pg\_dump\`/\`pg\_restore\` data migration, frontend/n8n re-pointing, and rollback. VM sizing floor identified: \*\*2 vCPU / 4GB RAM / 50GB SSD\*\*, lowest-cost well-established option researched was Hetzner CX22/CX23 (~€4.50-5/mo, no India datacenter); cheaper India-hosted alternatives (WebeyeSoft, Webyne, URLStart, ~₹400-750/mo) were flagged for independent reliability/SLA verification before use, given this runs unattended financial-data infrastructure. See \`docs/workflows/CLOUD\_VM\_DEPLOYMENT\_CHECKLIST.md\` for the VM/n8n/CC-parser side; the Supabase migration runbook has not yet been saved to a file (exists only in chat as of this writing) pending the user providing the new Supabase account's credentials.

\---

\#\# New Development Philosophy

From this point onward

\- Prioritize delivering business functionality.  
\- Reuse existing architecture.  
\- Reuse existing components.  
\- Reuse existing domain models.  
\- Avoid repository-wide refactoring.  
\- Avoid introducing new architectural patterns unless absolutely necessary.  
\- Limit changes to the current module and shared reusable components only when required.

The architecture is considered frozen.

\---

\#\# Feature Development Rules

Architecture is frozen. For every future module

1\. Reuse existing components whenever possible.

2\. Reuse existing domain models.

3\. Reuse existing repositories.

4\. Reuse existing hooks.

5\. Do not duplicate business logic.

6\. Do not move folders — no folder restructuring.

7\. Do not rename modules.

8\. No project-wide refactoring unless explicitly requested — do not perform project-wide cleanup.

9\. Do not introduce new abstractions unless reused by multiple modules.

10\. One module at a time — build production-ready code only.

11\. Complete quality checks (build, typecheck, lint, tests, Playwright) before every commit.

12\. Wait for explicit approval before starting the next module.

\---

\#\# Authoritative Module Sequence

This table is the single source of truth for module order and commit scope. If any other section of this document (including the numbered "MODULE" contract headers in Parts 4–5) appears to disagree with this table, this table wins.

Completed

\| Module \| Name \| Status \|  
\| --- \| --- \| --- \|  
\| 1 \| Application Shell \| ✅ Done \|  
\| 2 \| Dashboard \| ✅ Done \|  
\| 3 \| Transactions \| ✅ Done \|  
\| 4 \| Statements \| ✅ Done \|

Upcoming — build in this order, one at a time, stopping for explicit approval between each

\| Module \| Name \| Purpose \|  
\| --- \| --- \| --- \|  
\| 5 \| Categories \| Master data for transaction categorization. \|  
\| 6 \| Merchants \| Merchant management and merchant-category mapping. \|  
\| 7 \| Clients \| Client master data and client assignment. \|  
\| 8 \| Accounts \| Bank account management. (Page exists but is currently orphaned from navigation — confirm before extending.) \|  
\| 9 \| Credit Cards \| Credit card management. (Substantially built — see "Verified status as of 2026-11-22".) \|  
\| 10 \| Analytics \| Historical insights and reporting. \|  
\| 11 \| Settings \| Superseded by Credentials module (plaintext password exposure is an open security gap — see "Verified status as of 2026-11-22"). \|  
\| 12A \| Supabase Integration \| Replace mock repositories with live Supabase repositories, Authentication, and Storage. No UI redesign. Done — all services (including the dashboard) use live Supabase repositories (verified 2026-11-23). \|  
\| 12B \| n8n Integration \| Connect and verify n8n Workflows C, D, E (see \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\` for canonical versions) against the live Supabase schema built in 12A. No UI redesign, no workflow changes beyond the approved node-count optimization and security remediation tracked in that register. \|

Deferred — not part of the current module sequence (Modules 1–11, plus 12A/12B) (see the "DEFERRED MODULES" note at the end of Part 5 for why, and what re-approval requires)

\- AI Review Center  
\- Global Search

\---

\#\# Module Development Process

Every future module follows exactly this process.

Step 1 — Review

\- PRODUCT\_DECISIONS.md  
\- CLAUDE.md  
\- COMPONENT\_LIBRARY.md  
\- DOMAIN\_ARCHITECTURE\_REPORT.md

Step 2 — Review the corresponding Stitch design.

Step 3 — Identify reusable components. Reuse before creating new components.

Step 4 — Implement only the current module.

Step 5 — Run Build, Typecheck, ESLint, Prettier, Unit Tests, Playwright.

Step 6 — Fix every issue.

Step 7 — Generate MODULEX\_REPORT.md.

Step 8 — Commit.

Step 9 — Push.

Step 10 — Stop. Wait for explicit approval before beginning the next module.

Steps 5, 8, and 9 above are governed in full mechanical detail by the "MODULE COMPLETION GIT PROTOCOL" in Part 6 — that section is the how-to; this list is the overall sequence. Do not duplicate its detail here.

\---

\# PROJECT OVERVIEW

Project Name

Finance Command Center

\---

\#\# Vision

Build a premium personal financial intelligence platform that automatically captures financial activity from Gmail and bank statements, categorizes transactions using AI, stores them in Supabase, and provides a world-class web dashboard for reconciliation, analytics, reporting, and financial insights.

The application is NOT a SaaS platform.

There is only one client.

The system is built specifically around one financial ecosystem.

Future multi-user support is optional.

\---

\#\# Primary Goals

Provide one place to manage

\- Credit Cards  
\- Savings Accounts  
\- Current Accounts  
\- OD Accounts  
\- Statements  
\- Merchant Intelligence  
\- AI Categorisation  
\- Financial Analytics

\---

The system should reduce manual bookkeeping by automating:

\- transaction extraction  
\- statement parsing  
\- merchant normalization  
\- categorization  
\- reconciliation

\---

\# PROJECT PHILOSOPHY

The application should feel like

Stripe Dashboard

\+

Linear

\+

Notion

\+

Modern Banking

NOT

Traditional ERP

NOT

Accounting Software

NOT

Bootstrap Admin Panel

\---

The interface should feel

Minimal

Premium

Fast

Clean

Professional

Calm

High Information Density

\---

Animations should be subtle.

Whitespace should be generous.

Every screen should have a clear hierarchy.

\---

\# EXISTING BACKEND (CRITICAL)

This project already has a working backend.

Claude MUST understand that this backend already exists.

The objective is NOT to redesign it.

The objective is to build a frontend around it.

\---

Current Architecture

\`\`\`  
Gmail

↓

n8n

↓

AI Extraction

↓

Merchant Memory

↓

AI Categorisation

↓

Supabase

↓

Finance Dashboard  
\`\`\`

\---

\*\*Historical note:\*\* the three workflows were originally planned as "Workflow A/B/C" below. The real, currently-live automation is Workflows \*\*C, D, E\*\* — see the corrected "n8n INTEGRATION" section in Part 3 and \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\` for the authoritative current description, canonical versions, and live n8n IDs. The diagrams immediately below are kept for historical context on the original architecture intent only — do not use them as the current source of truth for what each workflow does.

\---

Workflow A (historical name — see note above)

Transaction Email Processing

\`\`\`  
Gmail

↓

Normalize Email

↓

Merchant Lookup

↓

AI Categorisation

↓

Deduplication

↓

Supabase

↓

Processed Label  
\`\`\`

\---

Workflow B (historical name — see note above)

Statement Processing

\`\`\`  
Statement Email

↓

Save PDF

↓

Google Drive

↓

PDF Parser

↓

AI Extraction

↓

Normalize

↓

Supabase

↓

Statement Linked  
\`\`\`

\---

Workflow C (historical name — see note above)

Merchant Learning

\`\`\`  
Transaction Saved

↓

Merchant Lookup

↓

Known Merchant?

↓

YES

↓

Reuse Category

↓

NO

↓

AI Classification

↓

Merchant Memory Updated  
\`\`\`

\---

These workflows already work.

Do not redesign them beyond the approved node-count optimization and security remediation tracked in \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\`.

\---

\# WHAT CLAUDE MUST NEVER CHANGE

Unless explicitly instructed.

Never redesign

\- Gmail Processing  
\- n8n Architecture  
\- Statement Parser  
\- Merchant Learning  
\- AI Categorisation Flow  
\- Existing Supabase Tables  
\- Existing Labels  
\- Existing Database Relationships

Never replace working systems.

Always extend.

\---

\# DEVELOPMENT PRINCIPLES

Every implementation should follow

Single Responsibility Principle

Composition over inheritance

Reusable Components

Separation of Concerns

Type Safety

Accessibility

Performance

Maintainability

\---

Never duplicate logic.

Never duplicate components.

Never duplicate SQL.

\---

\# TECHNOLOGY STACK

Frontend

React 19

TypeScript

Vite

Tailwind CSS

shadcn/ui

TanStack Query

TanStack Table

React Hook Form

Zod

Recharts

Framer Motion

Lucide Icons

React Router

\---

Backend

Supabase

PostgreSQL

SQL Views

RPC

Edge Functions

Supabase Auth

Storage

\---

Automation

n8n

Gemini

Claude

OpenAI

Google Drive

Gmail

\---

Development

GitHub

VS Code

Claude Code

Docker

Google Stitch

\---

\# TECHNOLOGIES NOT ALLOWED

Do NOT introduce these without approval.

Redux

Bootstrap

Material UI

Ant Design

jQuery

Moment.js

Styled Components

CSS Modules

Axios

MobX

Class Components

JavaScript (new files)

Use TypeScript.

\---

\# PROJECT STRUCTURE

\`\`\`  
finance-command-center/

src/

    app/

    pages/

    layouts/

    components/

    hooks/

    services/

    stores/

    lib/

    types/

    utils/

    styles/

supabase/

    migrations/

    functions/

    views/

    rpc/

tests/

docs/

public/  
\`\`\`

\---

Folder Responsibilities

app/

Application entry

Routing

Providers

\---

pages/

Only page composition.

No business logic.

\---

components/

Reusable UI.

\---

hooks/

Business logic.

Fetching.

State.

\---

services/

Supabase communication.

Never query Supabase directly inside components.

\---

stores/

Global UI state only.

Never server state.

\---

utils/

Pure helper functions.

\---

types/

All interfaces.

No duplicated types.

\---

supabase/

SQL

Views

RPC

Functions

Migrations

\---

\# APPLICATION ARCHITECTURE

\`\`\`  
React Pages

↓

Components

↓

Hooks

↓

Services

↓

Supabase Client

↓

SQL Views

↓

Tables  
\`\`\`

Never skip layers.

\---

\# STATE MANAGEMENT

Server State

TanStack Query

\---

Global UI State

Zustand

\---

Local State

React

\---

Never duplicate server state in Zustand.

\---

\# ROUTING

Routes

/

Dashboard

/transactions

/transactions/:id

/statements

/statements/:id

/categories

/merchants

/merchants/:id

/clients

/accounts

/accounts/:id

/credit-cards

/analytics

/credentials (replaces the originally-planned /settings — \`src/pages/Settings.tsx\` was removed 2026-09-17 in favor of this; see "Verified status as of 2026-11-22")

\---

Route order above follows the Authoritative Module Sequence. \`/ai-review\` and a dedicated global-search route are intentionally omitted — see "DEFERRED MODULES" at the end of Part 5.

\---

Every route should lazy load.

\---

\# SESSION CONTINUITY RULE

Every coding session begins by

1 Reading CLAUDE.md

2 Understanding current module

3 Reviewing previous implementation

4 Identifying incomplete work

Only then start coding.

Never assume.

Always verify.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 2  
\#  
\# CODING STANDARDS  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# TYPESCRIPT

Always use

Strict Mode

Interfaces

Explicit types

Readonly where appropriate

Enums sparingly

Generics when useful

Avoid

any

unknown unless necessary

Type assertions unless unavoidable

\---

\# REACT

Always

Functional Components

Hooks

Composition

Named exports

Reusable Components

Memoization where useful

Lazy loading

Error Boundaries

\---

Never

Class Components

Business logic inside JSX

Massive files

Deep prop drilling

\---

Target

One responsibility per component.

\---

\# COMPONENT STANDARDS

Every component should have

Props Interface

Documentation comment

Loading State

Error State

Empty State

Accessibility

Responsive Layout

Dark Mode

\---

Preferred structure

\`\`\`tsx  
interface Props {}

export function Component() {

return ()

}  
\`\`\`

\---

\# FILE SIZE

Preferred

\<200 lines

Acceptable

300

Maximum

500

If larger

Split component.

\---

\# HOOK STANDARDS

Hooks own

Fetching

Mutation

Caching

Transformation

Validation

\---

Naming

useDashboard()

useTransactions()

useAccounts()

useStatements()

useMerchants()

useAnalytics()

\---

Never fetch inside components.

\---

\# SERVICE LAYER

Every API call

↓

Service

↓

Hook

↓

UI

Never

Component

↓

Supabase

\---

\# ERROR HANDLING

Every request must support

Loading

Empty

Error

Retry

Timeout

\---

Never silently ignore errors.

\---

\# UI DESIGN PRINCIPLES

The application should feel

Premium

Fast

Minimal

Calm

Professional

\---

Spacing

Use 8px spacing scale.

Never random margins.

\---

Cards

Rounded

Soft shadows

Subtle borders

No excessive colors.

\---

Icons

Lucide only.

\---

Buttons

Primary

Secondary

Ghost

Danger

Icon

Loading

\---

\# TABLES

TanStack Table

Always

Sorting

Filtering

Pagination

Column visibility

Sticky Header

Resizable Columns

Search

CSV Export

Virtualization for large datasets

\---

\# CHARTS

Use

Recharts

Charts

Line

Area

Bar

Donut

Sparkline

Stacked

Never use 3D charts.

\---

\# FORMS

Always

React Hook Form

\+

Zod

Validation

Never uncontrolled forms.

\---

\# ACCESSIBILITY

Every component must support

Keyboard Navigation

ARIA Labels

Focus Indicators

Screen Readers

High Contrast

Semantic HTML

\---

\# RESPONSIVE

Support

Desktop

Tablet

Mobile

Never desktop-only.

\---

\# DARK MODE

Every component must support

Light

Dark

System

\---

Never hardcode colors.

Always use design tokens.

\---

\# ANIMATIONS

Use

Framer Motion

Duration

150–250ms

Subtle

No flashy animations.

\---

\# LOADING STATES

Every page

Skeleton

Spinner only for very small areas.

\---

\# EMPTY STATES

Every module should have

Illustration

Explanation

Primary Action

\---

\# PERFORMANCE

Lazy load pages.

Virtualize large tables.

Memoize expensive components.

Use SQL Views.

Avoid unnecessary re-renders.

\---

\# DEFINITION OF CODE QUALITY

Claude should never stop after "it works."

Every feature must be

Compiled

Linted

Typed

Responsive

Accessible

Testable

Reusable

Production Ready

Only then is a task considered complete.  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 3  
\#  
\# DATABASE STANDARDS  
\#  
\# SUPABASE  
\#  
\# SQL VIEWS  
\#  
\# RPC FUNCTIONS  
\#  
\# EDGE FUNCTIONS  
\#  
\# n8n INTEGRATION  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATABASE PHILOSOPHY

The database is the Single Source of Truth.

Claude MUST NOT duplicate business logic inside React.

Business logic belongs in one of the following layers:

1\. PostgreSQL SQL Views  
2\. PostgreSQL RPC Functions  
3\. Supabase Edge Functions  
4\. n8n Automation

Never inside React Components.

React is only responsible for presentation.

\---

\# DATABASE RESPONSIBILITIES

n8n

↓

Extract Data

Normalize Data

Categorize Data

Save Data

↓

Supabase Tables

↓

SQL Views

↓

React

\---

Never reverse this architecture.

\---

\# EXISTING DATABASE

Live schema confirmed 2026-11-22, re-verified 2026-11-23, against Supabase project \`fincommand\` (\`cnxfrlirhycbqnwfxvpm\`): \*\*12 tables total\*\*. All of the originally-listed tables plus all of the originally-planned "NEW TABLES" already exist, plus one new table (\`api\_keys\`) added 2026-11-23 — there is no remaining "to be added" set.

\`transactions\`, \`statement\_transactions\`, \`processed\_messages\`, \`merchant\_memory\`, \`banks\`, \`categories\`, \`email\_sources\`, \`accounts\`, \`statements\`, \`clients\`, \`application\_settings\`, \`audit\_logs\`, \`notifications\`, \`api\_keys\`.

\`api\_keys\` (added 2026-11-23, migration \`add\_api\_keys\_table\`): write-only third-party API key storage (currently \`gemini\_api\_key\`, 1 row). RLS \*\*enabled\*\* — unlike the 3 tables flagged below, this one is not an open gap. Authenticated users can set a value but the repository/view layer never returns it; n8n's \`Load API Keys\` node reads it with the service-role key, not the anon key.

(Note: \`monthly\_summaries\` is implemented as a \*\*view\*\*, not a table — see "REQUIRED SQL VIEWS" below. Do not recreate it as a table.)

These tables must NOT be redesigned.

Only extend them through approved migrations.

\*\*Open security gap:\*\* \`application\_settings\`, \`audit\_logs\`, and \`notifications\` currently have \*\*RLS disabled\*\* — confirmed by the Postgres security linter, fully exposed to the anon key. This has NOT been remediated. Do not blindly apply the same RLS policy to all three; each table's actual ownership/access model must be reasoned through first (see Task 5A in the Phase 1 workflow-consolidation brief). Present the remediation SQL to the user before applying it.

\---

\# NEW TABLES

All tables originally planned here (\`accounts\`, \`statements\`, \`clients\`, \`audit\_logs\`, \`notifications\`, \`application\_settings\`) have already been created — see "EXISTING DATABASE" above, which is now the complete table list. This section is kept only as a historical record that these were additions beyond the original 8 tables, not a pending-work list.

Every migration must be reversible.

Never modify production tables directly.

Always create migrations.

\---

\# MIGRATION RULES

Every schema change requires

Migration

↓

Review

↓

Test

↓

Deployment

Never manually edit production schema.

\---

\# DATABASE NAMING

Tables

snake\_case

Columns

snake\_case

Views

vw\_\<module\>\_\<name\>

Example

vw\_transactions

vw\_dashboard\_summary

vw\_account\_health

Materialized Views

mv\_\<module\>\_\<name\>

RPC

rpc\_\<action\>

Indexes

idx\_\<table\>\_\<column\>

Foreign Keys

fk\_\<table\>\_\<column\>

Primary Keys

pk\_\<table\>

\---

\# UUID RULES

Every primary key

UUID

Generated by PostgreSQL

Never generate IDs inside React.

\---

\# TIMESTAMPS

Every table should contain

created\_at

updated\_at

Where appropriate

deleted\_at

Never physically delete important financial data.

Use soft deletes where required.

\---

\# DATABASE CONSTRAINTS

Always enforce

NOT NULL

CHECK Constraints

Foreign Keys

Unique Constraints

Never rely solely on frontend validation.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# SQL VIEW RULES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The frontend should consume SQL Views instead of raw tables whenever possible.

Benefits

Single Source of Truth

Centralized Business Logic

Cleaner React

Better Performance

\---

Allowed

React

↓

Service

↓

SQL View

\---

Avoid

React

↓

Join Multiple Tables

\---

Never calculate

Monthly Spend

Dashboard Totals

Cash Flow

Category Statistics

Merchant Statistics

inside React.

Those belong in SQL Views.

\---

\# REQUIRED SQL VIEWS

\*\*Correction, 2026-11-22:\*\* the list below is the original target list, not the live one. The actual 27 live views (confirmed by direct query against project \`fincommand\`) are: \`monthly\_summaries\`, \`vw\_account\_analytics\`, \`vw\_account\_health\`, \`vw\_account\_summary\`, \`vw\_account\_transactions\`, \`vw\_accounts\`, \`vw\_cashflow\`, \`vw\_categories\`, \`vw\_category\_spend\`, \`vw\_client\_summary\`, \`vw\_client\_top\_categories\`, \`vw\_client\_top\_merchants\`, \`vw\_credit\_card\_utilization\` (not \`vw\_credit\_utilization\`), \`vw\_dashboard\_accounts\`, \`vw\_dashboard\_due\_cards\`, \`vw\_dashboard\_summary\`, \`vw\_merchant\_spend\`, \`vw\_merchant\_transactions\`, \`vw\_merchants\`, \`vw\_monthly\_spend\`, \`vw\_statement\_summary\`, \`vw\_statement\_transactions\`, \`vw\_statements\`, \`vw\_transaction\_details\`, \`vw\_transaction\_search\`, \`vw\_transaction\_trends\`, \`vw\_transactions\`. All 27 are \`SECURITY DEFINER\`. There is no \`vw\_ai\_\*\`, \`vw\_global\_search\`, \`vw\_system\_health\`, or \`vw\_settings\_\*\` view — those were never built, consistent with AI Review and Global Search being deferred (see Part 5) and Settings being replaced by Credentials. Before building a new view, check this list first; before assuming a planned view below exists, verify it against this list, not the plan.

\---

Original target list (kept for intent/grouping context only — see correction above for what actually exists):

Dashboard

vw\_dashboard\_summary

vw\_dashboard\_accounts

vw\_dashboard\_cashflow

vw\_dashboard\_due\_cards

Transactions

vw\_transactions

vw\_transaction\_details

vw\_transaction\_search

vw\_transactions\_review

vw\_transactions\_duplicates

Accounts

vw\_accounts

vw\_account\_summary

vw\_account\_transactions

vw\_account\_trends

vw\_account\_health

Statements

vw\_statements

vw\_statement\_summary

vw\_statement\_transactions

vw\_statement\_processing

vw\_statement\_reconciliation

vw\_statement\_metrics

Analytics

vw\_monthly\_spend

vw\_cashflow

vw\_category\_spend

vw\_merchant\_spend

vw\_account\_analytics

vw\_credit\_utilization

vw\_transaction\_trends

Merchant

vw\_merchants

vw\_merchant\_details

vw\_merchant\_transactions

vw\_merchant\_analytics

AI

vw\_ai\_review

vw\_ai\_review\_summary

vw\_ai\_accuracy

Search

vw\_global\_search

System

vw\_system\_health

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# RPC FUNCTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

RPC should be used when

Business Logic

↓

Needs Parameters

OR

Requires Complex Processing

\---

Examples (illustrative pattern — NOT the actual function names, see below)

rpc\_search()

rpc\_merge\_merchants()

rpc\_detect\_duplicates()

rpc\_generate\_monthly\_summary()

rpc\_dashboard\_summary()

rpc\_recalculate\_health()

rpc\_refresh\_materialized\_views()

rpc\_statement\_reconciliation()

\---

\*\*Actual live RPC functions\*\* (confirmed 2026-11-22, re-verified 2026-11-23, project \`fincommand\`) — 5 total, none following the \`rpc\_\*\` naming convention above:

\`lookup\_merchant\`, \`upsert\_merchant\_memory\`, \`fn\_resolve\_merchant\_default\_category\`, \`set\_updated\_at\`, \`start\_statement\` (added 2026-11-23, migration \`add\_start\_statement\_function\`; called by Workflow D's worker to begin a statement-processing run).

All 5 currently have a mutable \`search\_path\` (a Postgres linter WARN, not yet remediated) — set \`search\_path\` explicitly on each when next modifying them.

\---

Never use RPC for simple CRUD.

Use SQL Views whenever possible.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# MATERIALIZED VIEWS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Use Materialized Views for

Dashboard

Analytics

Monthly Spend

Category Spend

Merchant Spend

Cashflow

Credit Utilization

Refresh

Every 5–10 minutes.

Never refresh synchronously from React.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# EDGE FUNCTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Edge Functions should be used only when SQL cannot solve the problem.

Recommended use cases

Webhook Validation

Complex Business Logic

AI Integrations

Secure API Calls

PDF Processing (future)

Secret Management

Never expose secrets to React.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# SUPABASE SERVICE LAYER

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Components must NEVER access Supabase directly.

Correct

React Component

↓

Hook

↓

Service

↓

Supabase

Wrong

React

↓

Supabase

\---

Example Folder

services/

dashboard.service.ts — live Supabase (verified 2026-11-23; the earlier "still mock" note was stale)

transactions.service.ts — live Supabase

accounts.service.ts — live Supabase

statements.service.ts — live Supabase

merchant.service.ts — live Supabase

analytics.service.ts — live Supabase

credentials.service.ts — live Supabase (new, backs the Credentials module; see the plaintext-password gap noted under "Verified status as of 2026-11-22" and "n8n INTEGRATION")

(\`settings.service.ts\` was not built — Settings was replaced by Credentials, see "Verified status as of 2026-11-22")

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# TANSTACK QUERY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module owns its own Query Keys.

dashboard

transactions

accounts

statements

analytics

merchant

search

settings

ai-review

Invalidate only affected queries.

Never invalidate everything.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATABASE SECURITY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Never expose

Service Role Keys

AI Prompts

Parser Metadata

OAuth Tokens

Internal Logs

Raw Gmail Messages

Use Environment Variables.

\*\*Open as of 2026-11-22 — not yet remediated:\*\* a live Supabase service-role JWT is hardcoded in plaintext in an n8n workflow node, and the Credentials module currently returns bank/credit-card statement passwords to the browser in plaintext. Both violate this rule today. See "n8n INTEGRATION" below and "Verified status as of 2026-11-22" near the top of this document for what each requires.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# n8n INTEGRATION

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\*\*Corrected 2026-11-22.\*\* The real workflow identities are \*\*C, D, E\*\*, not A/B/C — the section above ("EXISTING BACKEND") kept the old A/B/C names for historical context only. This section is the current source of truth. The backend automation exists and works; Claude is not responsible for redesigning it, only for the specific, approved node-count optimization and security fixes tracked in \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\`. Claude otherwise consumes its output.

\---

Workflow C — Gmail Transaction Email Processing

Produces: \`transactions\`, \`merchant\_memory\`, \`processed\_messages\`

Canonical: Phase 8 (\`workflows/active/Workflow C - Phase 8 (canonical).json\`, live n8n ID \`BOZ47nx7DBtFFmXL\`, 55 nodes). Frozen rollback copy in \`workflows/canonical/\`.

\---

Workflow D — Credit Card Statement Processing (CC Parser + Gemini fallback)

Produces: \`statements\`, \`statement\_transactions\`, \`transactions\`

Canonical: Phase 11.1 (\`workflows/active/Workflow D - Phase 11.1 (canonical).json\`, live n8n ID \`iNs91Jxbx3OUIgq2\`, 80 nodes). Frozen rollback copy in \`workflows/canonical/\`. This is the most complex of the three and has known outstanding bugs — see the register.

\---

Workflow E — Bank Account Statement Processing

Produces: \`statements\`, \`statement\_transactions\`, \`transactions\`

Canonical: Phase 1, the only version that exists (\`workflows/active/Workflow E - Phase 1 (canonical).json\`, live n8n ID \`T2rq9vPWeOwbgFvS\`, 78 nodes). Deliberately a separate workflow from D — do not merge E into D. Currently blocked on a placeholder Gmail label; see the register.

\---

\*\*Live status (updated 2026-11-23, verified end to end via real Gmail triggers):\*\* the three canonical workflows (\`BOZ47nx7DBtFFmXL\` C, \`iNs91Jxbx3OUIgq2\` D, \`T2rq9vPWeOwbgFvS\` E) remain \`active: false\` and frozen. What actually runs is a **poller → worker** pair per pipeline, derived from the canonical C/D (the canonical files are not modified):

\- Pollers (schedule, every 2 min): C \`g5bMaNEel7dHIz49\`, D \`FzNXkwAb7NSQJMpb\`. They list INBOX emails (last 14 days), then a **Loop One Email At A Time** node calls the worker once per email, strictly sequentially (parallel calls caused a dedupe race). Retry sweep: at most once per 5 min per email, max 3 attempts, then the Gmail label \`FCC Needs Review\` (\`Label_1\`) is added and the email is no longer retried. Success moves the mail out of the Inbox, so anything left in the Inbox is pending/failed. To reprocess a tagged email: remove the label and put it back in the Inbox.
\- Workers (webhook, one execution per email): C \`YzRE1XBEPU9uGgFw\` (\`/webhook/fcc-c-ingest?id=<gmailMessageId>\`), D \`12rHwNuiRESxSlXq\` (\`/webhook/fcc-d-ingest?id=<gmailMessageId>\`). Per-item lookups use \`Accept: application/vnd.pgrst.object+json\` with neverError + JSON response format.
\- **Duplicate detection (C):** same \`source_message_id\`, OR same card + day + amount + merchant (case-insensitive) + \`transaction_time\`. \`transactions.transaction_time\` (nullable \`time\`, added by migration \`add_transactions_transaction_time\` on 2026-11-23) is parsed from the alert body (forwarded-message header times are ignored). If either side has no time, the match falls back to card + day + amount + merchant. Two genuine identical purchases at different times are therefore both kept; a re-forward of the same alert (same printed time) is dropped. Rollback: \`alter table public.transactions drop column transaction_time;\`
\- **Card number aliasing (D):** \`accounts.source_card_last4\` holds a reissued/previous number (e.g. ICICI "0016" is the Sapphiro 7010 card); D's account validation matches \`card_last4\` OR \`source_card_last4\`.
\- **Node reduction (2026-11-23):** C worker now 29 nodes, D worker **54** (both load Gemini key from Supabase `api_keys` via a `Load API Keys` node; D uses RPC `start_statement`) (was 55 / 80 after dedupe of dead nodes: 36 / 63). Redacted exports of the live pollers/workers: `workflows/active/Workflow {C,D} - {Poller,Worker} (live 2026-11-23).json`. Plan/results: `docs/workflows/NODE_REDUCTION_PLAN.md`; playbook skill: `.claude/skills/n8n-node-reduction/SKILL.md`. Labels are now moved with one Gmail `modify` HTTP call.
\- **D worker HTTP-500 fix + dead-branch deletion (2026-11-23, later the same day):** the "already processed" duplicate-statement short-circuit returned HTTP 500 to the webhook caller despite the n8n execution itself succeeding, because `Ingest Webhook` used `responseMode: lastNode` (whichever node happened to run last decided the response). Fixed by switching to `responseMode: responseNode` plus an explicit `Respond OK` node wired from every true terminal node (56→57 nodes). While tracing this, found and deleted a genuinely dead 3-node branch (`Code in JavaScript1 → Merge Statement + PDF → Split Out`, unreachable from the real save path) (57→54 nodes, the current live count above). Both changes verified live by re-firing the same already-processed message and confirming `HTTP 200`. Fresh timestamped exports: `workflows/active/Workflow {C,D} - Worker (live 2026-11-23_2218).json` — these, plus the unchanged pollers, are the 4 files now in `workflows/active/`; the prior same-day worker exports and the 3 canonical files moved to `workflows/archive/` (canonical files only moved, never edited).
- Workflow E is deferred — not yet tested end to end.
\- Operational notes: n8n public REST API used for deploys (workflows are PUT with name/nodes/connections/settings only); workers/pollers still carry the hardcoded Supabase service-role JWT (see Security below) — rotation is deferred and tracked in \`docs/workflows/E2E_STATUS_2026-11-23.md\`. Full proof, test data and cleanup SQL are in that file.

\*\*CC Parser microservice\*\* (separate repo: \`cc-parser-api\`, FastAPI, Dockerized on port 8000) is the shared parsing backend Workflows D and E both call. It already supports both response shapes — credit-card (\`EnrichedStatement\`: \`data.transactions\`, \`narration\`, \`card\_number\`) and bank-account (\`BankAccountStatement\`: \`data.statement\_transactions\`, \`raw\_description\`, \`account\_last4\`) — across 17 supported banks. Statement parsing for both account types is NOT new work; it already exists. The repo also holds \`Card Registry - Prakash Singh.xlsx\`, the source of record for bank/credit-card statement passwords — use it to resolve Workflow D/E's missing credential configurations; never invent a password.

\*\*Node-count optimization constraint (user decision, 2026-11-22):\*\* target fewer than 20 active nodes per workflow where practical, achieved \*\*without\*\* sub-workflows and \*\*without\*\* large multi-purpose Code nodes (both explicitly ruled out — concern was long-run debuggability). Approach instead: replace long Set/IF/Switch chains with several small, single-purpose, clearly-named Code nodes (one per logical step), keeping native nodes for I/O. Realistic expectation: Workflow D likely lands near 25-35 nodes rather than strictly under 20, given its preserved business logic; C and E have a better chance of landing near or under 20. Full detail in \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\`.

\*\*Security (open, unresolved as of 2026-11-22):\*\* a live Supabase service-role JWT was found hardcoded in plaintext in an n8n node belonging to a decoy workflow ("Workflow C - Production Ready", NOT the canonical Phase 8) — this key must be rotated via the Supabase dashboard and never assumed safe just because a file was redacted. All three canonical workflows must move their Supabase credential off hardcoded headers and onto a managed n8n credential.

Never rewrite Workflow C, D, or E beyond what \`docs/workflows/WORKFLOW_VERSION_REGISTER.md\` explicitly tracks as approved. Only build interfaces around them.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATA FLOW

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Gmail

↓

n8n

↓

AI Extraction

↓

Merchant Memory

↓

Categorisation

↓

Supabase

↓

SQL Views

↓

Hooks

↓

Components

↓

User

↓

Update

↓

Supabase

↓

Merchant Learning

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 4  
\#  
\# MODULE IMPLEMENTATION CONTRACTS  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module follows

Goal

Pages

Components

Hooks

Services

Views

Definition of Done

Out of Scope

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 1

APPLICATION SHELL

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Create application framework.

Includes

Sidebar

Header

Routing

Theme

Authentication Layout

Notification Area

Breadcrumbs

Global Search Placeholder

No business logic.

\---

Files

layouts/

AppShell.tsx

Sidebar.tsx

TopNav.tsx

PageContainer.tsx

\---

Definition of Done

Responsive

Dark Mode

Keyboard Accessible

Lazy Loaded

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 2

DASHBOARD

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide an executive overview of the user's financial position.

Data Sources

vw\_dashboard\_summary

vw\_dashboard\_accounts

vw\_dashboard\_cashflow

vw\_dashboard\_due\_cards

vw\_ai\_review\_summary

Required Components

DashboardHeader

KPICard

CashFlowChart

AccountCard

RecentTransactions

DuePayments

AIReviewWidget

StatementWidget

QuickActions

Hooks

useDashboard()

Services

dashboard.service.ts

Features

Real-time KPI Cards

Cash Flow

Monthly Spend

Recent Transactions

Account Summary

Upcoming Due Dates

Pending Reviews

Pending Statements

System Status

Acceptance Criteria

✓ Dashboard loads under 2 seconds

✓ Responsive

✓ Uses SQL Views only

✓ No Mock Data

✓ Loading States

✓ Error States

✓ Empty States

Out of Scope

Editing Transactions

Merchant Rules

Settings

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 3 — ✅ DONE

TRANSACTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide the primary financial ledger.

Pages

/transactions

/transactions/:id

Views

vw\_transactions

vw\_transaction\_details

vw\_transaction\_search

vw\_transactions\_review

vw\_transactions\_duplicates

Components

TransactionTable

TransactionDrawer

CategoryEditor

MerchantEditor

SearchToolbar

BulkActions

ReviewPanel

DuplicatePanel

Hooks

useTransactions()

Services

transactions.service.ts

Features

Sorting

Filtering

Search

CSV Export

Bulk Categorisation

Manual Edit

Review Queue

Duplicate Detection

Audit History

Acceptance Criteria

50,000+ rows supported

Virtualized Table

Column Visibility

Fast Search

Optimistic Updates

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 4 — ✅ DONE

STATEMENTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Manage imported bank statements.

Pages

/statements

/statements/:id

Views

vw\_statements

vw\_statement\_summary

vw\_statement\_transactions

vw\_statement\_processing

vw\_statement\_reconciliation

vw\_statement\_metrics

Components

StatementTable

StatementSummary

PDFViewer

Timeline

ReconciliationCard

MetricsCard

TransactionTable

Hooks

useStatements()

Services

statements.service.ts

Features

Statement List

Processing Status

Timeline

PDF Viewer

Transaction Matching

Reconciliation

Warnings

Metrics

Acceptance Criteria

PDF Viewer Responsive

Fast Loading

Statement Metrics

Reconciliation Accuracy

No Duplicate Transactions

Out of Scope

Statement Parsing

Email Download

PDF Extraction

These already exist in n8n.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

END OF PART 4

Modules 1–4 above are complete (see the Authoritative Module Sequence table in "PROJECT PHASE: FEATURE DEVELOPMENT MODE" near the top of this document). The next section continues with the upcoming modules, in build order:

MODULE 5 Categories

MODULE 6 Merchants

MODULE 7 Clients

MODULE 8 Accounts

MODULE 9 Credit Cards

MODULE 10 Analytics

MODULE 11 Settings

MODULE 12A Supabase Integration

MODULE 12B n8n Integration

followed by a Deferred Modules note, then Testing, Git Workflow, Deployment, Session Continuity and Definition of Done.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 5  
\#  
\# MODULE IMPLEMENTATION CONTRACTS  
\#  
\# Categories  
\#  
\# Merchants  
\#  
\# Clients  
\#  
\# Accounts  
\#  
\# Credit Cards  
\#  
\# Analytics  
\#  
\# Settings  
\#  
\# Supabase Integration  
\#  
\# n8n Integration  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module follows the same implementation contract.

Goal

Pages

Components

Hooks

Services

SQL Views

Business Rules

Acceptance Criteria

Out of Scope

Definition of Done

Never implement features outside the current module.

Complete the current module before starting another.

Build in the exact order given in the Authoritative Module Sequence table. Stop after each module and wait for explicit approval before beginning the next (per the Module Development Process, Step 10).

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 5

CATEGORIES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Master data for transaction categorization.

Domain model

\`domain/Category.ts\` (\`Category\`) already exists — reuse, do not fork.

Contract status

Pages, Components, Hooks, Services, Views, Features, Business Rules, Acceptance Criteria, and Out of Scope are NOT yet fully scoped. They are to be defined at Step 1–3 of the Module Development Process, immediately before implementation begins, following the same contract format as every module above — not invented here in advance.

Provisional naming (mechanical convention only, not a design decision)

useCategories() — hook

categories.service.ts — service

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 6

MERCHANTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Purpose (per the updated roadmap)

Merchant management and merchant-category mapping.

Page/nav display name remains "Merchant Center" (per PRODUCT\_DECISIONS.md's approved sidebar); commit scope is \`module-6\` / \`merchants\`.

Goal

Create a Merchant Intelligence Center.

This is not simply a lookup table.

It is the learning engine of the application.

Pages

/merchants

/merchants/:id

Views

vw\_merchants

vw\_merchant\_details

vw\_merchant\_transactions

vw\_merchant\_analytics

vw\_merchant\_review

Components

MerchantTable

MerchantProfile

MerchantAnalytics

MerchantHistory

AliasManager

CategoryEditor

MergeDialog

LearningHistory

ConfidenceBadge

Hooks

useMerchants()

Services

merchant.service.ts

Features

Merchant Search

Merchant Profile

Aliases

Merchant Statistics

Transaction History

Category Rules

Confidence Score

Merchant Merge

Merchant Notes

Learning Timeline

Future

Merchant Logos

Merchant Website

Merchant Type

Business Rules

Merchant Memory is authoritative.

Manual corrections improve future categorisation.

Never overwrite historical data.

Merge should preserve audit history.

Acceptance Criteria

Search under 300ms

Virtualized table

Duplicate detection

Responsive layout

Out of Scope

AI Categorisation Logic

n8n Merchant Learning

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 7

CLIENTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Client master data and client assignment.

Domain model

\`domain/Client.ts\` (\`Client\`) already exists — reuse, do not fork.

Contract status

Pages, Components, Hooks, Services, Views, Features, Business Rules, Acceptance Criteria, and Out of Scope are NOT yet fully scoped. They are to be defined at Step 1–3 of the Module Development Process, immediately before implementation begins, following the same contract format as every module above — not invented here in advance.

Provisional naming (mechanical convention only, not a design decision)

useClients() — hook

clients.service.ts — service

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 8

ACCOUNTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide a complete overview of every financial account.

Pages

/accounts

/accounts/:id

Views

vw\_accounts

vw\_account\_summary

vw\_account\_transactions

vw\_account\_trends

vw\_account\_health

Components

AccountCard

AccountSummary

BalanceHistory

TransactionTable

HealthCard

StatementHistory

Hooks

useAccounts()

Services

accounts.service.ts

Features

Balance

Credit Utilization

Health Score

Statements

Recent Transactions

Monthly Trends

Acceptance Criteria

No duplicate queries

All charts responsive

Virtualized transaction list

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 9

CREDIT CARDS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Credit card management.

Credit Cards is a standalone module — per PRODUCT\_DECISIONS.md, do not merge it into Accounts.

Domain model

\`domain/CreditCard.ts\` (\`KNOWN\_CARD\_NETWORKS\`, \`CardNetwork\`) already exists — reuse, do not fork.

Contract status

Pages, Components, Hooks, Services, Views, Features, Business Rules, Acceptance Criteria, and Out of Scope are NOT yet fully scoped. They are to be defined at Step 1–3 of the Module Development Process, immediately before implementation begins, following the same contract format as every module above — not invented here in advance. When scoping this module, revisit \`ARCHITECTURE\_AUDIT.md\`'s open recommendation on whether \`ConnectedAccount\` and \`TransactionAccount\` should share a base interface once this module's real display needs are known.

Provisional naming (mechanical convention only, not a design decision)

useCreditCards() — hook

credit-cards.service.ts — service

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 10

ANALYTICS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide a comprehensive financial intelligence dashboard for understanding spending behavior, cash flow, trends, utilization, and financial performance.

Pages

/analytics

Views

vw\_monthly\_spend

vw\_cashflow

vw\_category\_spend

vw\_merchant\_spend

vw\_account\_analytics

vw\_credit\_utilization

vw\_transaction\_trends

Components

AnalyticsHeader

DateRangeFilter

CashFlowChart

CategorySpendChart

MerchantSpendChart

AccountComparisonChart

CreditUtilizationCard

TrendChart

InsightsPanel

ExportToolbar

Hooks

useAnalytics()

Services

analytics.service.ts

Features

Monthly Spend

Daily Spend

Weekly Spend

Cash Flow

Category Breakdown

Merchant Breakdown

Account Comparison

Credit Utilization

Top Merchants

Top Categories

Average Transaction

Spending Trend

Business vs Personal Spend

Future

Budget Tracking

Forecasting

Acceptance Criteria

Charts responsive

Charts lazy loaded

Materialized views used

No calculations inside React

Loading states

Empty states

Export supported

No mock data

Out of Scope

Budget Management

Investment Tracking

Tax Reports

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 11

SETTINGS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Centralized application configuration.

Pages

/settings

Views

vw\_settings\_general

vw\_settings\_accounts

vw\_settings\_categories

vw\_settings\_merchants

vw\_settings\_ai

vw\_settings\_integrations

vw\_system\_health

Components

SettingsSidebar

GeneralSettings

AccountSettings

CategorySettings

MerchantSettings

AISettings

IntegrationStatus

NotificationSettings

SecurityPanel

DatabaseStatistics

SystemHealth

Hooks

useSettings()

Services

settings.service.ts

Features

Application Settings

Financial Accounts

Categories

Merchant Rules

AI Thresholds

Integrations

System Health

Database Statistics

Version Information

Business Rules

Settings must be validated.

Sensitive settings require confirmation.

Secrets never displayed.

Acceptance Criteria

Responsive

Validation

Confirmation dialogs

Accessible

No sensitive information exposed

Out of Scope

User Management

Multi-Tenant Configuration

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 12A

SUPABASE INTEGRATION

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Replace mock repositories with live Supabase repositories.

Connect

Supabase

Authentication

Storage

No UI redesign.

Pages

None new — every existing page keeps its current UI exactly.

Components

None new — no visual changes. If a component was reading shape incorrectly against the real schema, fix the data mapping only, not the component's markup/design.

Hooks

None new — existing hooks (\`useDashboard\`, \`useTransactions\`, \`useStatements\`, and every hook added by Modules 5–11) keep their exact signatures. Only the repository each hook's service resolves to changes.

Services

Every \`\*.service.ts\` file changes exactly one line each: swap the exported \`mockXRepository\` instance for a new \`SupabaseXRepository implements XRepository\`. This is the single swap point every prior module's report has documented — see e.g. \`statements.service.ts\`.

Views

Implement the SQL views enumerated in Part 3's "REQUIRED SQL VIEWS" section (plus any additional views identified as this module's repositories are built) as real Supabase views/RPCs.

Business Rules

Every module's existing \`Repository\` interface is the contract the Supabase implementation must satisfy — do not change the interface to fit Supabase; make Supabase fit the interface. If an interface genuinely cannot be satisfied, stop and ask before changing it.

Acceptance Criteria

Every module's existing Playwright suite still passes unmodified against live data.

No component, hook, or page file changes except the one-line repository swap per service file.

No mock data remains reachable from any page.

Out of Scope

UI redesign of any kind.

n8n workflow verification (see Module 12B).

New feature functionality (this module is a data-source swap, not a feature module).

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 12B

n8n INTEGRATION

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Connect and verify n8n Workflows A, B, and C against the live Supabase schema built in Module 12A.

No UI redesign.

Pages

None new.

Components

None new.

Hooks

None new — no hook signatures change.

Services

None — this module does not touch \`\*.service.ts\` files. It verifies that the tables/views Workflows A/B/C already write to match what Module 12A's Supabase repositories read from.

Business Rules

Never modify Workflow A (Transaction Email Processing), Workflow B (Statement Processing), or Workflow C (Merchant Learning) — per "WHAT CLAUDE MUST NEVER CHANGE" and "n8n INTEGRATION" in Part 1/3. This module only builds interfaces around them, per the "EXISTING BACKEND (CRITICAL)" section.

If a workflow's output doesn't match what a repository expects, the fix is in the repository's mapping layer, not in the workflow — never edit n8n to fit the frontend.

Acceptance Criteria

Every Workflow A/B/C output table/view is confirmed reachable by its corresponding Module 12A repository.

End-to-end smoke test: a real Gmail-sourced transaction and a real statement both appear correctly in the live UI.

Out of Scope

UI redesign of any kind.

Any change to Workflow A, B, or C.

New feature functionality.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

DEFERRED MODULES — NOT PART OF THE CURRENT MODULE SEQUENCE

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The two contracts below (AI Review Center, Global Search) were part of the original architecture-phase module list but are NOT included in the Authoritative Module Sequence (Modules 1–12) established during the 2026-08-03 roadmap update. Reason: PRODUCT\_DECISIONS.md's approved sidebar navigation structure does not include either as a section, and the project owner's updated module order (see near the top of this document) does not schedule them.

They are kept here, unmodified, for reference only — not deleted, since they represent real prior design work. Do not build either without the project owner first re-adding it to the Authoritative Module Sequence table with an explicit module number.

\---

DEFERRED — AI REVIEW CENTER

Goal

Provide a Human-in-the-Loop interface for reviewing AI decisions.

Pages

/ai-review

Views

vw\_ai\_review

vw\_ai\_review\_summary

vw\_ai\_accuracy

vw\_ai\_learning

Components

ReviewQueue

ReviewDrawer

ConfidenceMeter

AIExplanation

ApprovalPanel

BulkApprovalToolbar

AccuracyDashboard

LearningTimeline

Hooks

useAIReview()

Services

ai-review.service.ts

Features

Pending Queue

Approve

Reject

Edit Category

Edit Merchant

Edit Client

Confidence Breakdown

Learning History

Accuracy Statistics

Bulk Actions

Business Rules

AI decisions are suggestions.

User decisions become ground truth.

Never overwrite user corrections.

Acceptance Criteria

Bulk review supported

Keyboard shortcuts

Responsive

Accessible

Audit history maintained

Out of Scope

Model Training

Prompt Engineering

AI Provider Selection

\---

DEFERRED — GLOBAL SEARCH

Goal

Provide application-wide search.

Keyboard shortcut

CTRL \+ K

Pages

Available from every page.

Views

vw\_global\_search

Components

SearchCommand

SearchInput

SearchResults

SearchHistory

QuickActions

Filters

Hooks

useSearch()

Services

search.service.ts

Features

Transaction Search

Merchant Search

Statement Search

Account Search

Category Search

Settings Search

Recent Searches

Keyboard Navigation

Instant Results

Business Rules

Search should use SQL Views.

No client-side indexing.

Debounce requests.

Acceptance Criteria

Search under 300ms

Keyboard accessible

Responsive

Dark Mode

No duplicate requests

Out of Scope

Natural Language Search

AI Chat

Voice Search

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 6  
\#  
\# TESTING  
\#  
\# GIT  
\#  
\# CI/CD  
\#  
\# SESSION CONTINUITY  
\#  
\# AI OPERATING PROCEDURES  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

TESTING STRATEGY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module requires testing.

Unit

Integration

End-to-End

Accessibility

Performance

\---

Unit Tests

Framework

Vitest

Test

Hooks

Utilities

Services

Components

Target

90%+

\---

Component Tests

React Testing Library

Test

Rendering

Loading

Errors

User Interaction

Accessibility

\---

Integration Tests

Test

Supabase

SQL Views

RPC

Edge Functions

\---

End-to-End

Framework

Playwright

Critical Flows

Dashboard

Transaction Review

Statement View

Merchant Center

Settings

Search

AI Review

\---

Performance

Measure

Initial Load

Dashboard Load

Search

Large Tables

Chart Rendering

Memory Usage

\---

Accessibility

WCAG AA

Keyboard Navigation

Screen Readers

Color Contrast

Focus Indicators

Semantic HTML

Required for every feature.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

CI/CD

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Pipeline

Git Push

↓

Type Check

↓

Lint

↓

Unit Tests

↓

Build

↓

Integration Tests

↓

Deploy Preview

↓

Manual Approval

↓

Production

Every Pull Request must pass.

Never bypass CI.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

GIT WORKFLOW

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Main

Production

Develop

Integration

Feature Branches

feature/dashboard

feature/accounts

feature/transactions

feature/statements

feature/analytics

feature/merchant-center

feature/ai-review

feature/search

feature/settings

Commit Format

feat:

fix:

refactor:

docs:

test:

perf:

chore:

Example

feat: add dashboard cashflow widgets

Module-scoped feature commits

Every feature commit for Modules 3 and onward must scope the type with the module number. This mapping is derived from, and must always match, the Authoritative Module Sequence table in "PROJECT PHASE: FEATURE DEVELOPMENT MODE" near the top of this document.

Format

feat(module-N): implement \<module-name\> module

Mapping

feat(module-3): implement transactions module — ✅ done

feat(module-4): implement statements module — ✅ done

feat(module-5): implement categories module

feat(module-6): implement merchants module

feat(module-7): implement clients module

feat(module-8): implement accounts module

feat(module-9): implement credit cards module

feat(module-10): implement analytics module

feat(module-11): implement settings module

feat(module-12a): integrate supabase

feat(module-12b): integrate n8n

The module report is included in the SAME commit as the feature. See MODULE COMPLETION GIT PROTOCOL below.

Documentation-only commits (plain docs:, no module scope) are only used when documentation changes independently of a feature — never as a second commit immediately following a feature commit for the same module.

Never commit

node\_modules

.env

dist

build

coverage

\---

MODULE COMPLETION GIT PROTOCOL

For every future module, Claude follows this sequence without waiting for separate instructions:

1\. Complete the implementation.

2\. Generate the module report.

3\. Include the report in the same commit as the feature.

Never a separate documentation-only commit unless explicitly requested.

4\. Run

Build

Typecheck

Lint

Tests

Playwright

Fix every issue before committing.

5\. Commit using Conventional Commits, module-scoped per the Commit Format section above (feat(module-N): ...).

6\. Push automatically to GitHub.

7\. Verify the push succeeded.

8\. Include in the completion report

Repository

Branch

Commit Hash

Push Status

Never stop at "committed locally" and call a module done.

A module is only complete once it is pushed and the push is verified.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

CODE REVIEW CHECKLIST

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Before every commit

✓ TypeScript passes

✓ Build succeeds

✓ Lint clean

✓ Responsive

✓ Accessible

✓ No console.log

✓ No TODO unless approved

✓ No unused imports

✓ No duplicated code

✓ SQL Views used

✓ Hooks used

✓ Services used

Only then commit.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

DEFINITION OF DONE

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

A feature is complete only if

Build succeeds

TypeScript clean

Lint clean

Responsive

Dark Mode

Accessible

Loading State

Empty State

Error State

Reusable Components

Hooks extracted

Services extracted

Tests written

SQL Views used

No mock data

No duplicated logic

Performance acceptable

Documentation updated

Committed with the report in the same commit

Pushed to GitHub and push verified

Never consider

"It works"

as complete.

Production Ready is the standard.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

SESSION CONTINUITY PROTOCOL

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every coding session starts by

1 Read CLAUDE.md

2 Identify current module

3 Read existing implementation

4 Read related components

5 Read related hooks

6 Read related services

7 Read related SQL Views

8 Identify unfinished work

9 Continue implementation

Never start coding immediately.

Understand first.

\---

Every coding session ends with

Summary

Completed Files

Remaining Tasks

Known Issues

Recommended Next Step

Never end without a summary.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

AI OPERATING PROCEDURES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Claude is an Engineering Partner.

Not an Architect unless requested.

Default behavior

Preserve Architecture

Preserve Naming

Preserve Folder Structure

Preserve Database

Preserve Existing Features

Prefer

Extend

Never

Rewrite

\---

When asked to build

Read module contract

↓

Create files

↓

Compile

↓

Fix errors

↓

Run lint

↓

Improve responsiveness

↓

Accessibility review

↓

Testing

↓

Summary

↓

Stop

\---

When encountering ambiguity

STOP

Do not invent requirements.

Ask.

\---

When modifying existing code

Read entire file first.

Understand purpose.

Minimize changes.

Preserve behavior.

Avoid unrelated refactoring.

\---

Never

Rename large folders

Move modules

Rewrite architecture

Replace libraries

Change backend workflows

Change database schema

Introduce new frameworks

Unless explicitly instructed.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

ERROR RECOVERY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

If build fails

Fix TypeScript first.

If lint fails

Fix lint.

If runtime fails

Debug before adding code.

If database changes required

Create migration.

Never edit production schema.

If uncertain

Stop.

Explain.

Ask.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

PERFORMANCE RULES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Always

Lazy load routes

Virtualize tables

Memoize expensive components

Use TanStack Query

Use SQL Views

Use Materialized Views where appropriate

Avoid unnecessary re-renders

Optimize bundle size

Never optimize prematurely.

Measure first.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

FINAL ENGINEERING PRINCIPLES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The goal is not simply to build software.

The goal is to build maintainable software.

Every decision should improve

Maintainability

Readability

Performance

Accessibility

Scalability

Developer Experience

Consistency

Never trade long-term architecture for short-term speed.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

FINAL INSTRUCTION TO CLAUDE CODE

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

You are implementing the Finance Command Center.

This repository already contains an approved architecture.

Your responsibility is to implement it faithfully.

Read this CLAUDE.md before every coding session.

Never redesign approved systems.

Never modify n8n workflows.

Never bypass the service layer.

Never duplicate business logic.

Implement one module at a time.

Complete it fully.

Verify quality.

Summarize your work.

Then stop and wait for the next instruction.

END OF CLAUDE.md  
