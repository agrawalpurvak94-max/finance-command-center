# DESIGN_DIFF_REPORT.md

Analysis only — no application code was touched. Generated 2026-08-01.

---

## ⚠️ Blocking gap: FRONTEND.md and SUPABASE.md do not exist

Searched the entire project tree (`Frontend/`, its `docs/`, and the parent `AI Intelligent Platform Project/` folder including `Stitch Designs/`) — neither file exists anywhere. Everything below is compared against **CLAUDE.md only**, plus this session's own prior artifacts (`STITCH_MAPPING.md`, `PACKAGE_REPORT.md`, the built Module 1 shell). If `FRONTEND.md`/`SUPABASE.md` are meant to exist, please provide them or point me to where they live — they aren't fabricated here.

---

## New screens detected

Two new folders appeared in `FInal Stitch Designs/stitch_duplicate_of_finance_intelligence_command_center/`, using a different naming convention (mixed-case with spaces) than every prior screen (lowercase-with-underscores + version suffix):

| Folder                          | Maps to              | Title tag                                        |
| ------------------------------- | -------------------- | ------------------------------------------------ |
| `Dashboard Ops Command Centre/` | Module 2 — Dashboard | "Operational Command Center \| FinOps Core"      |
| `analytics tab/`                | Module 9 — Analytics | (no `<title>` override seen in the excerpt used) |

The old dashboard candidates (`executive_financial_intelligence_v7/`, `financial_dashboard_v8_refined/`) are **still present, not deleted**. Given you said "these are now the latest visual reference," I'm treating the two new folders as superseding both old dashboard candidates for Module 2 — but this isn't stated outright, so flagging rather than assuming silently. The design-token file (`DESIGN.md`) inside both new folders is byte-identical in substance to `apex_ledger/DESIGN.md` (only whitespace differs) — the underlying color/type/spacing system has **not** changed.

---

## ⚠️ Brand name changed: "Finance Command Center" → "FinOps Core"

Both new screens render the sidebar logo as **"FinOps Core"**, not "Finance Command Center" (which is what every prior screen, CLAUDE.md's project name, and the Module 1 shell we already built all use). This is a significant, unflagged rename with no accompanying note in either `DESIGN.md`. Two secondary inconsistencies compound this:

- The Analytics screen's breadcrumb reads **"INTEL CORE"** › Analytics & Insights — a third, different name in the same screen that already says "FinOps Core" in its own sidebar.
- The Analytics screen's footer copyright line reads "SECURED BY QUANTUM LEDGER ARCHITECTURE • © 2025 FINOPS CORE" — marketing filler text, not a real product name.

This needs your explicit decision before Module 1's shell (already built and approved) is touched again.

---

## Changed layouts

### Sidebar (both new screens)

- Logo treatment is **inconsistent between the two new screens themselves**: Dashboard renders a colored icon-box (primary bg + `account_balance` glyph) next to the wordmark plus a small "FY 2024-25" caption underneath; Analytics renders plain colored text with no icon box and **no FY caption at all**.
- **"Financial Accounts" renamed to "Accounts"** in the nav label (both new screens agree on this).
- **New top-level nav item: "Credit Cards"** (icon `credit_card`), inserted between Accounts and Transactions. Previously, credit cards were a _tab_ inside the Financial Accounts screen (`financial_accounts_v7`'s "BANK ACCOUNTS / CREDIT CARDS" tab switcher), not a separate nav destination.
- **"Settings" nav item is absent from both new screens** — consistent with every prior screen (Settings was never in the main scrollable nav in any Stitch export; it only ever appeared as a bottom-pinned item in a couple of older screens, and even there the label was empty/glitched). Not a regression, but worth noting since our built shell does include it.
- Nav item order is otherwise unchanged: Dashboard, Clients, Accounts, [Credit Cards — new], Transactions, Statements, Categories, Merchant Center, Analytics.

### Top bar (both new screens)

- Notification bell now shows an **unread-indicator dot** (small red circle) — not present in any prior screen.
- **Help icon is still present** in both new screens — this directly conflicts with your last explicit instruction to remove Help from the shell. Flagging, not silently reintroducing it.
- The static avatar-only pattern from prior screens is replaced with an **avatar + name + role text block**: Dashboard shows "Global Workspace / Admin View"; Analytics shows "V. ADHIKARI / Finance Lead" — two different identity treatments in the same design pass, both of which are exactly the kind of fake/placeholder personal-and-business data your last task told us to keep out of the shell.
- Search placeholder text differs between the two screens: "Search transactions, clients, or tags..." (Dashboard) vs "Search accounts, clients or transactions..." (Analytics) — no longer the previously-agreed plain "Search…".
- No "Workspaces" text link is present in either new screen (consistent with its earlier removal).

### Dashboard — now "Operational Command Center"

Far richer than the simplified scope you specified previously (Total Spend, Transactions, Top Categories, Biggest Expenses). New structure, top to bottom:

1. Page header with a live "Refreshed: HH:MM:SS" timestamp chip and a sync button.
2. KPI row: **Total Spend (MTD)**, **Total Income (MTD)**, **CC Outstanding** (with a "Due in 48h" warning state, red left-border accent). The grid is declared `grid-cols-4` but only **3 cards are populated — the 4th column is empty**, a real layout bug in the export itself.
3. **"Connected Facilities"** — 3 account/card summary cards (HDFC Corporate, ICICI Current, Kotak Treasury), one in an "URGENT" state (red border + badge + "Pay Now" action). This duplicates content conceptually already owned by the Financial Accounts module (`financial_accounts_v7`).
4. **"Resolution Queue"** (badged "12 ACTIONABLE") — a list of flagged transactions needing action (Uncategorized / Missing GST / Tag Required), each with a "Resolve" button. This is conceptually AI-Review-queue content surfacing inside the Dashboard.
5. **"Recent Transactions"** table — same shape as the Transactions module's table, summarized.
6. An **empty, unfinished placeholder section** titled in a comment as "Statement Import & Alerts" — the grid container exists in the HTML but has zero children. The design is incomplete here, not just visually sparse.
7. **"Quick Actions"** — a 2×2 icon-button grid (Add Transaction / Add Client / Add Merchant / New Report).
8. A floating **"+ New Transaction"** action button, bottom-left, fixed to the sidebar rather than the viewport corner.

### Analytics — "Consolidated Insights"

This is where the richer KPI/chart content from the _old_ dashboard candidates (`executive_financial_intelligence_v7`, `financial_dashboard_v8_refined`) appears to have actually belonged all along — resolving the open question flagged in `STITCH_MAPPING.md` from Module 1. Structure:

1. Breadcrumb + title, an **FY toggle** (FY 2024-25 / FY 2023-24 segmented control), a **date-range picker** button, and an **Export Report** button.
2. KPI row (4, fully populated this time): Total Spend, Liquid Assets, Avg Monthly, Avg Txn Size — each with a trend row (up/down/flat) — a different KPI set from every previous dashboard candidate.
3. **Spending Trend** chart — a hand-built bar/line hybrid (divs with inline heights, not a real charting library) with an ALL / 6M / 1M range toggle and hover-reveal value tooltips.
4. An **empty, unfinished placeholder section** commented "Intelligence Alerts (1/3 width)" — same issue as the Dashboard's empty section, content never filled in.
5. **Category Allocation** — a hand-built SVG donut (stacked `<circle>` arcs) with a text legend.
6. **Top Merchants** table with per-merchant category icons and trend arrows.
7. **"Key Client Profitability"** — horizontally-scrollable cards (Revenue / Spend / Margin per client); one card is rendered at `opacity-50`, an unlabeled **dimmed/inactive visual state** with no explanation of what triggers it.
8. **Credit Line Utilization** — labeled progress bars per card, color-coded by utilization severity (red/blue/secondary).
9. A footer with a pulsing "SYSTEM OPERATIONAL" status dot and the placeholder copyright line mentioned above.

---

## New components (beyond what Module 1 already built)

- KPI card with trend indicator (up/down/flat, colored)
- Account/Facility summary card, with an "urgent" variant (colored border + badge + due-date + primary action)
- Resolution/Action queue item (category tag + amount + resolve action)
- Quick Action tile (icon + label, grid-arranged)
- Floating action button (FAB)
- Hand-rolled donut chart + legend (should become a real Recharts `PieChart` per CLAUDE.md's charting stack, not divs/SVG arcs)
- Hand-rolled trend chart with range toggle (should become a real Recharts `BarChart`/`AreaChart`)
- Client profitability card (with a dimmed/inactive state variant)
- Labeled progress bar (credit utilization)
- FY segmented toggle control
- Date-range picker button
- Export button
- System-status footer indicator (pulsing dot + label)
- Topbar identity block (avatar + name + role), distinct from Module 1's icon-only avatar menu

## Components removed (relative to the previous Stitch version)

Nothing was structurally _removed_ from the confirmed Module 1 shell pattern — Settings' absence is a continuation, not a new removal, and the sidebar nav item set only gained "Credit Cards." The only true removal is that the old dashboard candidates' AI-Processing/Processing-Pipeline donut widget doesn't reappear anywhere in the new Dashboard (it's arguably been replaced conceptually by the "Resolution Queue" list).

## Navigation changes (summary)

| Change       | Detail                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| Renamed      | "Financial Accounts" → "Accounts"                                             |
| Added        | "Credit Cards" (new top-level item)                                           |
| Unchanged    | Item order otherwise identical; Settings still absent from the scrollable nav |
| Inconsistent | Sidebar logo/subtitle treatment differs between the two new screens           |

---

## Missing states

None of the mockups (old or new) show: empty states (no "no transactions yet," no "no alerts" design), loading/skeleton states, or error states (e.g., a failed account sync). The new Dashboard's hover-reveal chart tooltips and the dimmed client-profitability card are the closest things to a "state," and neither is explained in prose. Two sections in the new exports are literally unfinished (empty containers) rather than intentionally minimal — implementation would need to invent their content, which conflicts with "never invent features" until you supply real designs for them.

## UX improvements (spacing/typography/a11y/state polish only, per your standing instruction — not layout redesigns)

- Fix the Dashboard's `grid-cols-4` KPI row with only 3 populated cards (either add the 4th KPI or correct the grid to 3 columns) — currently a visible layout gap.
- The chart hover-tooltips are pure CSS `opacity-0 group-hover:opacity-100` with no keyboard/focus equivalent and no screen-reader text — a real chart library (Recharts) with accessible tooltips fixes this by construction.
- Reconcile the three-way brand-name conflict (FinOps Core / Finance Command Center / Intel Core) before any further screens are designed.
- Reconcile the two different topbar identity/help/search-placeholder treatments between Dashboard and Analytics into one consistent pattern.
- The two empty/unfinished sections need real content (or explicit removal) before Module 2/9 implementation begins.

---

## Recommendation

Do not implement Module 2 or Module 9 yet. Three decisions are needed first: (1) confirm the brand rename and which name is final, (2) confirm these two new screens fully replace the old dashboard candidates, (3) resolve the two empty/unfinished sections and the Help-icon/topbar-identity conflict with your Module 1 "generic shell" instruction.
