# Documentation Index

This folder holds the Finance Command Center's non-code documentation. It was reorganized into the structure below in a documentation-only pass performed before Module 12A (Supabase Integration) — no application code, business logic, repositories, or domain models were touched as part of that reorganization.

**CLAUDE.md stays in the project root** — it is actively read by Claude Code at the start of every session (per its own "SESSION CONTINUITY RULE") and by convention Claude Code looks for it there. Moving it would break that convention for no benefit, so it was deliberately left in place rather than moved here.

---

## Folder structure

```
docs/
  README.md                    — this file
  architecture/                — how the app is built (frontend-only)
  database/                    — how the app's data is/will be persisted
  reports/                     — dated, frozen module-completion reports
  project/                     — project governance and roadmap documents
  design-references/           — pre-existing: Linear/Notion/Stripe visual reference notes
  STITCH_MAPPING.md            — pre-existing: Stitch-design-to-component mapping notes
```

### `docs/architecture/`

Living documents describing the current, real shape of the frontend. Update these when the thing they describe changes — they are not dated snapshots.

| File                  | Covers                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOMAIN_MODEL.md`     | Every entity in `src/domain/*.ts` — fields, types, relationships                                                                            |
| `REPOSITORY_MAP.md`   | Every repository interface + mock implementation in `src/repositories/`, and each service's Supabase swap point                             |
| `ROUTE_MAP.md`        | Every route, every entity drawer, the drill-down/cross-filter navigation graph, `ActiveFilterBanner` usage                                  |
| `UI_COMPONENT_MAP.md` | Every reusable and module-specific component in `src/components/` — purpose, props, where reused                                            |
| `DATA_FLOW.md`        | End-to-end data flow: the existing n8n/Gmail backend automation, and the frontend's own Page → Component → Hook → Service → Repository path |

### `docs/database/`

Living documents describing what's known about the database, and what to do about the gaps. Distinguish carefully throughout between "verified in this repo" and "claimed by CLAUDE.md, not independently verified" — no live Supabase schema inspection has been performed as of this pass.

| File                    | Covers                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_SCHEMA.md`    | What actually exists in `supabase/` (nothing) vs. what CLAUDE.md claims exists in production (unverified)                                                  |
| `SUPABASE_MAPPING.md`   | Proposed Domain Model → Repository → Supabase Table → Columns mapping, explicitly labeled as a candidate pending verification                              |
| `SUPABASE_AUDIT.md`     | Frontend needs vs. database reality — missing tables/columns/relationships/indexes/constraints/RLS, repository compatibility, a Module 12A readiness score |
| `DATABASE_READINESS.md` | The audit's findings distilled into a prioritized (High/Medium/Low) punch list                                                                             |
| `MIGRATION_PLAN.md`     | An ordered migration plan (purpose/dependencies/tables affected/impact/rollback per step) — a plan to hand to whoever writes the SQL, not SQL itself       |

### `docs/reports/`

Dated, frozen module-completion reports (`MODULE2_REPORT.md` through `MODULE10_REPORT.md`), moved here unmodified and unrenamed from the project root. These are point-in-time records of what shipped in each module — do not edit them retroactively to reflect later changes; if something they describe has since changed, that belongs in the relevant `docs/architecture/` or `docs/database/` living document instead, not as an edit to the historical report.

Future module reports (Module 11 onward) should be added here directly, following the same `MODULEN_REPORT.md` naming convention, per CLAUDE.md's "MODULE COMPLETION GIT PROTOCOL."

### `docs/project/`

Project governance and roadmap documents, moved here from the project root: `PROJECT_MILESTONES.md`, `PRODUCT_DECISIONS.md`, `RECOVERY_REPORT.md`, `NEXT_TASK.md`, `PROJECT_STATUS.md`, `PROJECT_BOOTSTRAP.md`. `PRODUCT_DECISIONS.md` in particular remains the highest-priority document after CLAUDE.md itself for any product/UX decision — see its own header ("Priority: Highest — Overrides Stitch exports where conflicts exist").

---

## What was deliberately NOT moved

A number of root-level `*_REPORT.md` files from the project's bootstrap phase (`BOOTSTRAP_REPORT.md`, `CONFIG_REPORT.md`, `DESIGN_DIFF_REPORT.md`, `DESIGN_ENVIRONMENT_REPORT.md`, `DESIGN_SETUP_REPORT.md`, `MCP_REPORT.md`, `PACKAGE_REPORT.md`, `SKILLS_REPORT.md`, `STRUCTURE_REPORT.md`, `SUPABASE_REPORT.md`, `VSCODE_REPORT.md`), plus `ARCHITECTURE_AUDIT.md`, `DOMAIN_ARCHITECTURE_REPORT.md`, and `COMPONENT_LIBRARY.md`, remain at the project root. This documentation pass's instructions scoped the reports move specifically to `MODULE*_REPORT.md` files and the project-governance move to a named list — these other files fell outside both, so they were left in place rather than moved on this pass's own initiative. They can be relocated in a future pass if the project owner wants them under `docs/` too.

---

## Where future documentation should be placed

- **A new module ships** → its `MODULEN_REPORT.md` goes in `docs/reports/`, per CLAUDE.md's git protocol (same commit as the feature).
- **The frontend's actual shape changes** (a new domain field, a new repository, a new route, a new shared component) → update the relevant file in `docs/architecture/` in the same change, so it stays a living description rather than going stale.
- **The database gets migrated** (Module 12A or later) → update `docs/database/DATABASE_SCHEMA.md` and `SUPABASE_MAPPING.md` to reflect verified reality (replacing "candidate"/"claimed" language with confirmed facts), and check off the relevant step in `MIGRATION_PLAN.md`.
- **A product or engineering decision is made** that isn't yet in `PRODUCT_DECISIONS.md` or `CLAUDE.md` → route it through those two governance documents first (per their own stated authority), not into `docs/architecture/` — architecture docs describe what exists, not what was decided and why.
- **Anything Stitch-design or visual-reference related** → `docs/design-references/` or `docs/STITCH_MAPPING.md`, following the existing pattern already in this folder.
