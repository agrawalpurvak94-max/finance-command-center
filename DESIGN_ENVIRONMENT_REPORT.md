# DESIGN_ENVIRONMENT_REPORT.md

Design MCP & Skills Audit — Step 1

Generated: 2026-07-31

---

## Currently installed MCP servers

All confirmed via `claude mcp list` (project scope), run from this project directory:

| Server          | Status      | Relevant to UI/UX work?                                          |
| --------------- | ----------- | ---------------------------------------------------------------- |
| context7        | ✔ Connected | Yes — up-to-date docs for React/Tailwind/shadcn/TanStack         |
| filesystem      | ✔ Connected | Indirect — project file access                                   |
| chrome-devtools | ✔ Connected | Yes — CSS/layout/network/perf/a11y inspection of the running app |
| playwright      | ✔ Connected | Yes — interactive browser verification of UI                     |
| n8n-mcp         | ✔ Connected | No — backend automation, unrelated to design                     |
| supabase        | ✔ Connected | No — data layer, unrelated to design                             |

No Figma, GitHub, Vercel, Exa, or Firecrawl MCP is currently configured.

## Currently installed Skills

Verified against the skill listing surfaced to this session (no marketplace has been added since bootstrap, so this reflects the current set):

| Skill                                                                                                      | Design-relevant?                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `dataviz`                                                                                                  | Yes — chart/KPI/dashboard visual design system guidance                                   |
| `artifact-design`                                                                                          | Yes — general design fundamentals for published pages, reusable judgment for UI decisions |
| `artifact-capabilities`                                                                                    | Only if a design prototype needs live/interactive capabilities                            |
| `run`                                                                                                      | Indirect — launches the app to visually verify UI                                         |
| `simplify`                                                                                                 | Indirect — code-quality pass, not design-specific                                         |
| `security-review`                                                                                          | No                                                                                        |
| `n8n-*` pack (11 skills)                                                                                   | No — n8n workflow authoring, unrelated to design                                          |
| `update-config`, `keybindings-help`, `loop`, `schedule`, `claude-api`, `init`, `review`, `security-review` | No                                                                                        |

**No skill exists for**: React component patterns, Tailwind-specific guidance, shadcn/ui, accessibility auditing, motion/animation, performance, UX research, or component architecture as standalone named skills. This matches what was already found and documented in `SKILLS_REPORT.md` during bootstrap — re-confirmed here rather than assumed unchanged.

## VS Code extensions (informational — no changes made this step)

Design-relevant extensions already installed (from `VSCODE_REPORT.md`): Tailwind CSS IntelliSense, Error Lens, Material Icon Theme, Supabase. No Figma, Storybook, or dedicated design-tooling extension is installed.

## Project configuration / CLAUDE.md review

- CLAUDE.md's stack (Part 2) names shadcn/ui, Tailwind CSS, Recharts, Framer Motion (now `motion`), Lucide — all already installed per `PACKAGE_REPORT.md`.
- CLAUDE.md does not name Figma, Vercel, or any specific design-handoff tool anywhere — these are being added at the user's explicit request in this task, not because CLAUDE.md calls for them.
- CLAUDE.md's Git Workflow (Part 6) assumes GitHub-style PRs; a GitHub remote does not exist yet (confirmed: `git log`/`git branch` show a local-only repo on `develop`/`main`, no `origin`).
- No deploy target is named anywhere in CLAUDE.md or PROJECT_BOOTSTRAP.md (flagged previously in `BOOTSTRAP_REPORT.md`) — Vercel MCP is being added speculatively at the user's request, not because Vercel is confirmed as the host.

---

## Missing capabilities for UI/UX development

1. **Design-file handoff** (Figma → code): no MCP or skill currently bridges Figma designs into this codebase.
2. **Remote GitHub operations** (PRs, issues, reviews) from inside Claude: `gh` CLI is **not installed** on this machine (verified — not on PATH in either Bash or PowerShell), and no GitHub MCP is configured. CLAUDE.md's PR-gated workflow currently has no tooling behind it.
3. **Deploy/hosting visibility** (Vercel project status, preview URLs, analytics): no MCP configured; no deploy target confirmed at all.
4. **Web research for design references** (competitor UIs, pattern research): no research MCP configured.
5. **Live site/competitor analysis** (scraping a reference site's markup/structure): no MCP configured.

## Recommendations

Detailed in `DESIGN_SETUP_REPORT.md` after installation, but the audit-stage recommendation is:

- **Figma**: the _official_ Dev Mode MCP Server requires the Figma **desktop app** running locally with Dev Mode MCP enabled, on a paid Dev/Full seat — confirmed **not installed** on this machine. Cannot be connected without you installing Figma desktop and enabling that toggle yourself (a manual, GUI-only step I cannot perform). The closest working alternative is the community `figma-developer-mcp` package (Figma REST API + a personal access token) — see Step 2 for the decision this needs from you.
- **GitHub**: official `github-mcp-server`, HTTP transport, needs a GitHub Personal Access Token — no existing `gh` auth session to reuse (not installed).
- **Vercel**: official, OAuth-based, no key needed upfront — safe to add now, but the OAuth login itself needs to happen in a browser (I can't complete it headlessly).
- **Exa**: official `exa-mcp-server`, needs an `EXA_API_KEY` from your Exa dashboard.
- **Firecrawl**: official `firecrawl-mcp` has a **keyless free tier** for scrape/search/interact — can be installed now with no key, with a documented limitation that crawl/map/agent/extract need a key later.
