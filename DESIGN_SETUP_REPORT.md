# DESIGN_SETUP_REPORT.md

Design MCP & Skills Setup — Steps 2–4

Generated: 2026-07-31

No application code, UI, Supabase, or project structure was touched this session — configuration only, per Step 5.

---

## Installed MCPs

| Server    | Status                   | Notes                                                                                                                                                                                                                                                      |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| firecrawl | ✔ Connected              | Official `firecrawl-mcp`, keyless free tier. `firecrawl_scrape` and `firecrawl_search` work now (rate-limited); `crawl`/`map`/`agent`/`extract` need an API key later.                                                                                     |
| vercel    | ⚠ Added, needs auth      | Official, OAuth-based (`https://mcp.vercel.com`). See "Pending manual steps" — the login flow requires an interactive terminal, which this session cannot provide.                                                                                         |
| github    | ✔ Connected (2026-08-01) | Official `github-mcp-server`, HTTP transport (`https://api.githubcopilot.com/mcp`), PAT provided and passed as a redacted `Authorization` header — never written into any repo file (verified via `grep -r "github_pat_"` across the project, no matches). |

## Not installed (by your choice or by real constraint)

| Server                        | Reason                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Figma (official Dev Mode MCP) | Requires the Figma desktop app running locally with Dev Mode enabled on a paid Dev/Full seat — confirmed **not installed** on this machine (checked both common install paths and PATH). You chose to skip rather than use the community `figma-developer-mcp` alternative. If you install Figma desktop later and enable Dev Mode MCP in Preferences, this can be revisited — no fabricated workaround was attempted. |
| Exa (research)                | Needs an `EXA_API_KEY` from dashboard.exa.ai — you chose to skip. General web research in the meantime still goes through the existing `WebSearch`/`WebFetch` tools, which have been used throughout this bootstrap.                                                                                                                                                                                                   |

## Installed Skills

Found via Anthropic's own official marketplace (`claude-plugins-official`, already configured in this environment — not a marketplace I added), not fabricated:

| Plugin                                        | Skills it provides                         | Why relevant                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design@claude-plugins-official`     | `frontend-design`                          | "Create distinctive, production-grade frontend interfaces with high design quality... avoids generic AI aesthetics" — directly matches CLAUDE.md's "Stripe + Linear + Notion, not Bootstrap Admin Panel" design philosophy.                                                                                                                                                         |
| `modern-web-guidance@claude-plugins-official` | `modern-web-guidance`, `chrome-extensions` | Google Chrome team's official "keep your coding agent up to date with the latest web best practices" skill — covers the Performance gap identified in `DESIGN_ENVIRONMENT_REPORT.md`. `chrome-extensions` came bundled with the plugin (not independently selectable) and isn't relevant to this project — low token overhead, left as-is rather than fighting the plugin boundary. |

Both installed at **project scope** (`-s project`), consistent with how this project's MCP servers are scoped — not pushed into your global user config.

## Skills searched for but not found (documented, not fabricated)

No standalone skill exists in the official marketplace (or in this session's built-in skill set) specifically named or scoped to: **shadcn/ui, dedicated accessibility auditing, dedicated motion/animation, dedicated UX research, or dedicated component architecture.** Per Step 3's instruction not to fabricate these, here is the equivalent workflow for each instead:

| Requested              | Equivalent workflow                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadcn/ui              | Covered by the already-configured `context7` MCP (up-to-date shadcn docs on demand) + `frontend-design` skill's general UI quality guidance.                                                                                                          |
| Accessibility          | `eslint-plugin-jsx-a11y`, already wired into `eslint.config.js` and enforced on every lint run (from bootstrap) — a real automated gate, not just guidance.                                                                                           |
| Motion/animation       | `context7` for up-to-date Motion (formerly Framer Motion) API docs; CLAUDE.md's own duration/subtlety rules (150–250ms, no flashy animation) are the actual spec to follow.                                                                           |
| Performance            | `modern-web-guidance` (installed) + CLAUDE.md's own performance rules (lazy loading, virtualization, memoization) enforced by code review during module implementation.                                                                               |
| UX research            | `firecrawl` (installed, keyless tier) for pulling reference sites' structure/content when researching patterns.                                                                                                                                       |
| Component architecture | No dedicated skill; this is a judgment call CLAUDE.md already governs directly (Single Responsibility, composition over inheritance, file-size caps) — not something a marketplace skill would add beyond what's already binding project instruction. |

## Configuration steps performed

1. `claude mcp add firecrawl -- npx -y firecrawl-mcp` (project scope).
2. `claude mcp add --transport http vercel https://mcp.vercel.com` (project scope).
3. `claude mcp login vercel` — attempted; failed only because this session's terminal is non-interactive (see below), not because of a configuration error.
4. `claude plugin install frontend-design@claude-plugins-official -s project`.
5. `claude plugin install modern-web-guidance@claude-plugins-official -s project`.

## Validation results

- `claude mcp list` (re-run after each change): `firecrawl` → ✔ Connected (first attempt timed out during npx's cold-start package download; resolved on retry once cached — not a real failure). `vercel` → shows `! Needs authentication`, which is the expected/correct state for an OAuth server before login, not an error.
- `claude plugin list`: both `frontend-design` and `modern-web-guidance` show `Status: ✔ enabled`.
- `claude plugin details <name>` confirms real skill components in both (not empty/broken installs): `frontend-design` (1 skill), `modern-web-guidance` (2 skills).
- No configuration errors in `.claude.json` — every `add`/`install` command reported success with no warnings beyond the firecrawl cold-start timeout already resolved.

## Pending manual steps

1. **Vercel OAuth login** — run this yourself in a real interactive terminal (this automated session's stdin isn't a TTY, so it can't complete a browser redirect):
   ```
   claude mcp login vercel
   ```
   This opens a browser to sign in with your Vercel account; no token needs to be pasted back to me.
2. (Optional) Reconsider Figma once the desktop app + Dev Mode MCP is enabled, or provide a Figma personal access token to use the community `figma-developer-mcp` alternative instead.
3. (Optional) Provide an `EXA_API_KEY` if research MCP access becomes useful later.

## Update — 2026-08-01

GitHub MCP connected using the provided PAT (HTTP transport, `https://api.githubcopilot.com/mcp`). Verified via `claude mcp list` → `✔ Connected`, and confirmed the token was never written into any repo file (`grep -r "github_pat_"` across the project: no matches). This directly unblocks CLAUDE.md's PR-gated Git Workflow tooling gap noted in `DESIGN_ENVIRONMENT_REPORT.md`.

## Remaining recommendations

- Once GitHub MCP is connected, it directly unblocks CLAUDE.md's PR-gated Git Workflow (Part 6) — currently there's no tooling behind that process at all.
- Consider installing the `gh` CLI on this machine independent of the MCP — it wasn't found during this audit, and several of this environment's own standing instructions assume it's available for GitHub operations.
- `frontend-design` and `modern-web-guidance` are both real, low-cost (≈78 and ≈757 always-on tokens respectively) additions — no reason to remove either before Module 1 begins.
