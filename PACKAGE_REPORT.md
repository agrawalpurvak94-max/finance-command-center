# PACKAGE_REPORT.md

Bootstrap Phase 6 — Install Packages

Generated: 2026-07-30

512 packages installed via `npm install`. Versions below are the actual resolved versions (`npm ls --depth=0`), not the semver ranges requested.

---

## Deviations from a literal reading of PROJECT_BOOTSTRAP.md (flagged, not silent)

1. **ESLint instead of the Vite default (oxlint).** The current `create-vite` scaffold (`create-vite@9.1.2`) now defaults to `oxlint`, not ESLint. PROJECT_BOOTSTRAP.md Phase 3 explicitly requires ESLint + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-config-prettier`, so `oxlint` was removed and the full ESLint 9 flat-config stack was installed instead.
2. **`react-router`, not `react-router-dom`.** `react-router-dom` is deprecated as of React Router v8; the current package is `react-router` directly. Installed `react-router@7.18.2` (see version-pin note below).
3. **`motion`, not `framer-motion`.** Framer Motion was renamed to Motion in 2025 and became an independent project; `framer-motion` still works but points at the old, unmaintained package. Installed `motion@12.43.0` — CLAUDE.md's "Framer Motion" requirement is the same library under its current name.
4. **shadcn/ui applied `base-nova` style / `neutral` base color, not "New York."** I told the user I'd request "New York, Neutral, CSS variables" defaults, but the current `shadcn@4.16.0` CLI's own `-d/--defaults` flag resolves to `base-nova` style with `neutral` base color and CSS variables — "New York" is no longer the current default style name. Ran the tool's actual defaults rather than forcing an older, possibly-unsupported style name.
5. **Tailwind v4 needs no PostCSS/Autoprefixer.** Installed only `tailwindcss` + `@tailwindcss/vite` (the dedicated Vite plugin) — v4 handles imports and vendor prefixing internally.

---

## Runtime dependencies

| Package                                        | Resolved version      | Why                                                                                                                                     |
| ---------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| react, react-dom                               | 19.2.8                | CLAUDE.md stack: React 19                                                                                                               |
| react-router                                   | 7.18.2                | Routing (see deviation #2)                                                                                                              |
| @tanstack/react-query                          | 5.101.4               | Server state (State Management section)                                                                                                 |
| @tanstack/react-table                          | 8.21.3                | Tables (Transactions/Accounts/Statements modules)                                                                                       |
| zustand                                        | 5.0.14                | Global UI state only — never server state, per CLAUDE.md                                                                                |
| react-hook-form                                | 7.83.0                | Forms                                                                                                                                   |
| zod                                            | 4.4.3                 | Form validation                                                                                                                         |
| @hookform/resolvers                            | 5.5.7                 | Wires Zod schemas into React Hook Form                                                                                                  |
| recharts                                       | 3.10.1                | Charts                                                                                                                                  |
| motion                                         | 12.43.0               | Animations (see deviation #3)                                                                                                           |
| lucide-react                                   | 0.545.0               | Icons — "Lucide only" per CLAUDE.md                                                                                                     |
| @supabase/supabase-js                          | 2.111.0               | The only sanctioned way to talk to Supabase                                                                                             |
| clsx, tailwind-merge, class-variance-authority | 2.1.1 / 3.6.0 / 0.7.1 | Required by shadcn/ui component variants                                                                                                |
| @base-ui/react                                 | 1.6.0                 | Pulled in automatically by `shadcn init` — the current shadcn registry's underlying primitive library                                   |
| @fontsource-variable/geist                     | 5.3.0                 | Pulled in automatically by `shadcn init` — the default font for the applied theme                                                       |
| tw-animate-css                                 | 1.4.0                 | Pulled in automatically by `shadcn init` — animation utilities used by shadcn components                                                |
| shadcn                                         | 4.16.0                | Pulled in automatically by `shadcn init` as a runtime dependency (shares CSS via `shadcn/tailwind.css`) — not something I added by hand |

## Dev dependencies

| Package                                        | Resolved version                  | Why                                                                        |
| ---------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| typescript                                     | 5.9.3                             | Strict-mode type checking                                                  |
| vite, @vitejs/plugin-react                     | 8.2.0 / 6.0.5                     | Build tool                                                                 |
| tailwindcss, @tailwindcss/vite                 | 4.3.3 / 4.3.3                     | Styling (see deviation #5)                                                 |
| eslint, @eslint/js, typescript-eslint, globals | 9.39.5 / 9.39.5 / 8.65.0 / 16.5.0 | Lint (see deviation #1)                                                    |
| eslint-plugin-react-hooks                      | 7.1.1                             | Hooks rules — required a non-obvious flat-config fix, see CONFIG_REPORT.md |
| eslint-plugin-react-refresh                    | 0.4.26                            | Fast-refresh safety                                                        |
| eslint-plugin-jsx-a11y                         | 6.10.2                            | Accessibility lint rules — CLAUDE.md's Accessibility section               |
| eslint-config-prettier                         | 10.1.8                            | Turns off ESLint rules that conflict with Prettier                         |
| prettier                                       | 3.9.6                             | Formatting                                                                 |
| husky, lint-staged                             | 9.1.7 / 16.4.0                    | Pre-commit lint/format gate                                                |
| @types/node, @types/react, @types/react-dom    | 24.13.3 / 19.2.17 / 19.2.3        | Type definitions                                                           |

## Testing dependencies

| Package                                      | Resolved version        | Why                                              |
| -------------------------------------------- | ----------------------- | ------------------------------------------------ |
| vitest, @vitest/ui                           | 3.2.7 / 3.2.7           | Unit/component tests — 90%+ target per CLAUDE.md |
| jsdom                                        | 27.4.0                  | DOM environment for Vitest                       |
| @testing-library/react, jest-dom, user-event | 16.3.2 / 6.9.1 / 14.6.1 | Component testing                                |
| @playwright/test                             | 1.62.1                  | E2E — critical flows per CLAUDE.md               |

---

## Security review (`npm audit`)

7 high-severity findings, both investigated rather than blindly force-fixed:

1. **`react-router` (GHSA-qwww-vcr4-c8h2, "RSC Mode CSRF Bypass").** Affects the 7.12.0–8.2.0 range; the only fix available is `react-router@8.3.0`, a major version bump with API changes beyond what was authorized ("never replace these libraries without approval"). The specific vulnerability is scoped to **RSC (React Server Components) framework mode** — this project uses `react-router` purely as a client-side SPA library (declarative mode), which does not exercise that code path. **Accepted as a non-applicable risk for now**, documented here rather than silently upgraded or silently ignored. Revisit if the project ever adopts React Router's framework/RSC mode.
2. **`brace-expansion` (GHSA-mh99-v99m-4gvg, DoS via unbounded expansion), via `eslint-plugin-jsx-a11y` → `minimatch` → `@eslint/config-array` → `eslint`.** `npm audit fix --force` would downgrade `eslint-plugin-jsx-a11y` to `6.4.1`, which **predates flat-config support** (`flatConfigs.recommended`) that `eslint.config.js` depends on — applying it would break linting entirely. The vulnerable path only matters if this dev-only tooling processes attacker-controlled glob patterns, which it doesn't in local development. **Accepted as a non-applicable dev-tooling risk**, not force-fixed.

`npm audit fix` (non-force) was run and did not change react-router (no non-breaking patch exists in the 7.x line).

## Install-script approval

`npm install` initially skipped `esbuild@0.28.1`'s postinstall script under npm's script-execution allowlist gate. This script downloads esbuild's required platform binary — without it, Vite's dev/build pipeline would fail. Reviewed and approved explicitly via `npm approve-scripts esbuild`, recorded in `package.json`'s `allowScripts` field. No other package had a pending script.
