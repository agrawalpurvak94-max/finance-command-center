# PROJECT_MILESTONES.md

Finance Command Center — roadmap.

Last updated 2026-08-04. Architecture frozen — project is in Feature Development Mode (see CLAUDE.md's "PROJECT PHASE: FEATURE DEVELOPMENT MODE" section, which is the single source of truth this file mirrors).

---

## Milestone 1 — Architecture & Core UI Foundation (complete)

- ✅ Application Shell (Module 1)
- ✅ Dashboard (Module 2)
- ✅ Transactions (Module 3)
- ✅ Statements (Module 4)
- ✅ Domain layer, repository/service/hook layering, shared components — frozen
- ✅ Git Workflow

## Milestone 2 — Core Operations (upcoming)

- ⬜ Categories (Module 5)
- ⬜ Merchants (Module 6)
- ⬜ Clients (Module 7)
- ⬜ Accounts (Module 8)
- ⬜ Credit Cards (Module 9)

## Milestone 3 — Financial Intelligence (upcoming)

- ⬜ Analytics (Module 10)
- ⬜ Settings (Module 11)

## Milestone 4 — Production Readiness (upcoming)

- ⬜ Supabase Integration (Module 12A)
- ⬜ n8n Integration (Module 12B)
- ⬜ Performance
- ⬜ Accessibility
- ⬜ Production Deployment

## Deferred — not part of the current sequence

- AI Review Center
- Global Search

Not scheduled. PRODUCT_DECISIONS.md's approved sidebar navigation doesn't include either; both require the project owner explicitly re-adding them to CLAUDE.md's Authoritative Module Sequence table before being built. See CLAUDE.md's "DEFERRED MODULES" note (end of Part 5) for the preserved contracts.

---

Module → commit mapping (see CLAUDE.md's "GIT WORKFLOW" section — this table must always match it):

| Module                     | Commit prefix                                             |
| -------------------------- | --------------------------------------------------------- |
| 3 — Transactions           | `feat(module-3): implement transactions module` — ✅ done |
| 4 — Statements             | `feat(module-4): implement statements module` — ✅ done   |
| 5 — Categories             | `feat(module-5): implement categories module`             |
| 6 — Merchants              | `feat(module-6): implement merchants module`              |
| 7 — Clients                | `feat(module-7): implement clients module`                |
| 8 — Accounts               | `feat(module-8): implement accounts module`               |
| 9 — Credit Cards           | `feat(module-9): implement credit cards module`           |
| 10 — Analytics             | `feat(module-10): implement analytics module`             |
| 11 — Settings              | `feat(module-11): implement settings module`              |
| 12A — Supabase Integration | `feat(module-12a): integrate supabase`                    |
| 12B — n8n Integration      | `feat(module-12b): integrate n8n`                         |

Each module's report ships in the same commit as its feature — see CLAUDE.md's "MODULE COMPLETION GIT PROTOCOL". One module at a time; stop and wait for explicit approval before starting the next (CLAUDE.md's Module Development Process, Step 10).
