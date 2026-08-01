# PROJECT_MILESTONES.md

Finance Command Center — roadmap.

Last updated 2026-08-02.

---

## Milestone 1 — Core UI Foundation

- ✅ Application Shell
- ✅ Dashboard
- ✅ Transactions
- ✅ Git Workflow

## Milestone 2 — Core Operations

- ⬜ Statements
- ⬜ Accounts
- ⬜ Credit Cards
- ⬜ Categories
- ⬜ Merchants
- ⬜ Clients

## Milestone 3 — Financial Intelligence

- ⬜ Analytics
- ⬜ Settings

## Milestone 4 — Production Readiness

- ⬜ Authentication
- ⬜ Supabase Integration
- ⬜ Performance
- ⬜ Accessibility
- ⬜ Production Deployment

---

Module → commit mapping (see CLAUDE.md's Commit Convention section):

| Module                    | Commit prefix                                   |
| ------------------------- | ----------------------------------------------- |
| 4 — Statements            | `feat(module-4): implement statements module`   |
| 5 — Accounts              | `feat(module-5): implement accounts module`     |
| 6 — Credit Cards          | `feat(module-6): implement credit cards module` |
| 7 — Categories            | `feat(module-7): implement categories module`   |
| 8 — Merchants             | `feat(module-8): implement merchants module`    |
| 9 — Clients               | `feat(module-9): implement clients module`      |
| 10 — Analytics            | `feat(module-10): implement analytics module`   |
| 11 — Settings             | `feat(module-11): implement settings module`    |
| 12 — Supabase Integration | `feat(module-12): integrate supabase`           |

Each module's report ships in the same commit as its feature — see CLAUDE.md's "MODULE COMPLETION GIT PROTOCOL".
