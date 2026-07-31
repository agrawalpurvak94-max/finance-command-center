# NEXT_TASK.md

## Module 1

## Application Shell

Goal: create the application framework — Sidebar, Header, Routing, Theme, Authentication Layout, Notification Area, Breadcrumbs, Global Search Placeholder. No business logic.

## Dependencies

Already installed and available (bootstrap-verified working):

- `react-router` 7.18.2 — routing
- `zustand` 5.0.14 — theme/UI state (global UI state only, per CLAUDE.md)
- `lucide-react` 0.545.0 — icons
- `motion` 12.43.0 — subtle transitions (150–250ms, per CLAUDE.md)
- shadcn/ui (`components.json` configured, `base-nova` style) — only `button` is installed so far; additional primitives (e.g. sheet, dropdown-menu, avatar, separator) are not yet added and will need `npx shadcn@latest add <component>` as the shell is built
- Tailwind v4 dark-mode CSS variables (`.dark` class variant + full token set already generated in `src/styles/index.css`) — no toggle exists yet

## Acceptance Criteria

Per CLAUDE.md Module 1 Definition of Done:

- Responsive
- Dark Mode
- Keyboard Accessible
- Lazy Loaded

## SQL Views required

None. Module 1 is explicitly scoped as UI framework only ("No business logic") — it has no data dependency and queries no SQL Views.

## Files expected

- `src/layouts/AppShell.tsx`
- `src/layouts/Sidebar.tsx`
- `src/layouts/TopNav.tsx`
- `src/layouts/PageContainer.tsx`
