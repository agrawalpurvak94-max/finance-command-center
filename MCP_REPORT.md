# MCP_REPORT.md

Bootstrap Phase 2 — MCP Servers

Generated: 2026-07-30

---

## Summary

| Server          | Status                                                                                | Scope                         |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------- |
| context7        | ✔ Connected                                                                           | project                       |
| filesystem      | ✔ Connected                                                                           | project (this directory only) |
| chrome-devtools | ✔ Connected                                                                           | project                       |
| playwright      | ✔ Connected                                                                           | project                       |
| n8n-mcp         | ✔ Connected                                                                           | project                       |
| supabase        | ✔ Connected (2026-07-31, after receiving a personal access token)                     | project                       |
| github          | Not installed — deferred per PROJECT_BOOTSTRAP.md ("install after repository exists") | —                             |

**Update 2026-07-31:** all 6 required MCP servers are now connected. No manual steps remain for this phase.

All servers were added at **project** scope (`claude mcp add`, no `--scope user`), so they apply to this repository only, not globally.

---

## context7

**Why required:** CLAUDE.md's stack (React 19, Tailwind v4, TanStack Query/Table, Supabase JS, React Hook Form) moves fast enough that answers from training data alone risk being stale — this session already caught three cases where the "obvious" package name or flag had changed (see PACKAGE_REPORT.md). Context7 gives version-accurate library docs on demand instead of guessing.

**Official docs:** [context7.com/docs/clients/claude-code](https://context7.com/docs/clients/claude-code)

**Install command used:**

```
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

**Config:** No API key supplied — running in the free/unauthenticated tier (lower rate limit). An API key can be added later from [context7.com/dashboard](https://context7.com/dashboard) via `--api-key`.

**Env vars:** None required.

**Verification:** `claude mcp list` → `✔ Connected`.

---

## Supabase MCP

**Why required:** CLAUDE.md's entire data-access architecture requires the frontend to consume existing `vw_*` SQL Views and `rpc_*` functions rather than querying tables directly, and explicitly forbids guessing the schema. This MCP is how Claude inspects what actually exists in the project before any service/hook is written.

**Official docs:** [supabase.com/docs/guides/ai-tools/mcp](https://supabase.com/docs/guides/ai-tools/mcp)

**Install command used:**

```
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=cnxfrlirhycbqnwfxvpm
```

`--read-only` is applied so this MCP can never write to the schema, consistent with CLAUDE.md's "never modify existing Supabase schema" rule.

**Status: connected (2026-07-31).** Running the server directly first surfaced a more restrictive requirement than the docs initially suggested:

```
Please provide a personal access token (PAT) with the --access-token flag or set the SUPABASE_ACCESS_TOKEN environment variable
```

This needed a **Supabase personal access token** (from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)) — separate from the project URL/anon key. The user provided one; the server was reconfigured with `--access-token=<PAT>` and verified connected via `claude mcp list`.

**Env vars:** none used — the token was passed via the `--access-token` CLI flag rather than an env var, so it lives only in this project's local MCP config (`C:\Users\suruc\.claude.json`), not in any file inside the repo.

---

## chrome-devtools (Browser DevTools MCP)

**Why required:** PROJECT_BOOTSTRAP.md's "Browser DevTools MCP" requirement (CSS, network, performance, accessibility inspection) maps to Google's official Chrome DevTools MCP — there is no separate "Browser DevTools MCP" package; this is the canonical implementation.

**Official docs:** [github.com/ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)

**Install command used:**

```
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --no-usage-statistics
```

`--no-usage-statistics` disables Google's default telemetry collection — a deliberate choice given this project handles personal financial data, even though the telemetry itself wouldn't touch app data (it covers tool usage, not browsed content).

**Env vars:** None required. Requires a local Chrome/Chrome-for-Testing install (already present on this machine, confirmed by successful connection).

**Verification:** `claude mcp list` → `✔ Connected`.

---

## Playwright MCP

**Why required:** CLAUDE.md names Playwright for E2E, and PROJECT_BOOTSTRAP.md separately calls for a Playwright MCP for interactive browser/responsive/accessibility testing during development — distinct from the `@playwright/test` npm package (PACKAGE_REPORT.md), which drives the scripted CI test suite.

**Official docs:** [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**Install command used:**

```
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

**Env vars:** None required.

**Verification:** `claude mcp list` → `✔ Connected`.

---

## Filesystem MCP

**Why required:** PROJECT_BOOTSTRAP.md asks for project inspection / documentation / asset access via MCP, distinct from the CLI's own file tools, for other MCP-aware clients/agents that may attach to this session.

**Official docs:** [github.com/modelcontextprotocol/servers/tree/main/src/filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)

**Install command used:**

```
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem "c:\Users\suruc\OneDrive\Documents\Agentic Workflows\AI Intelligent Platform Project\Frontend"
```

Scoped to this project directory only — not the whole filesystem — per least-privilege.

**Env vars:** None required.

**Verification:** `claude mcp list` → `✔ Connected`.

---

## n8n MCP

**Why required:** CLAUDE.md forbids ever redesigning Workflows A/B/C, but the frontend must match their output schema exactly (`transactions`, `merchant_memory`, `processed_messages`). This MCP lets Claude inspect what those workflows actually produce instead of guessing field names.

**Package used:** `n8n-mcp` (czlonkowski) — the package already implied by this account's active `n8n-mcp-*` skill pack.
**Official docs:** [github.com/czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)

**Install command used:**

```
claude mcp add n8n-mcp -e MCP_MODE=stdio -e LOG_LEVEL=error -e DISABLE_CONSOLE_OUTPUT=true -e N8N_API_URL=http://localhost:5678 -e N8N_API_KEY=<redacted> -- npx -y n8n-mcp
```

**⚠️ Important caveat — read-only is a policy, not a technical restriction.** Unlike Supabase MCP, `n8n-mcp` has **no dedicated read-only flag**. Supplying `N8N_API_KEY` enables its full workflow-management tool set, including create/update/activate/deactivate. There is no configuration-level lock available for this package. CLAUDE.md's "never modify workflows" rule will be enforced **behaviorally** (write-capable n8n tools will never be invoked), not technically. Flagging this honestly rather than claiming a guarantee that doesn't exist.

**Env vars:** `N8N_API_URL`, `N8N_API_KEY` (both supplied and stored only in local MCP config, never echoed in any report or committed file).

**Verification:** `claude mcp list` → `✔ Connected`.

---

## GitHub MCP — deferred

Not installed. PROJECT_BOOTSTRAP.md explicitly scopes this to "install after repository exists." The `gh` CLI is available in this environment and already covers PR/issue workflows if needed before a GitHub MCP is added later.

---

## Pending manual steps

None. All 6 required MCP servers are connected as of 2026-07-31.
