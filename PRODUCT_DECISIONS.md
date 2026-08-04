\# PRODUCT\_DECISIONS.md

\# Finance Command Center  
\#\# Product Decisions & Engineering Standards

\*\*Version:\*\* 1.0  
\*\*Status:\*\* Approved  
\*\*Priority:\*\* Highest (Overrides Stitch exports where conflicts exist)

\---

\# Purpose

This document defines the official product decisions for the Finance Command Center application.

Whenever there is a conflict between:

\- Stitch Designs  
\- Generated HTML  
\- Previous Screens  
\- AI Suggestions  
\- Existing Components

\*\*This document takes precedence.\*\*

\---

\# Product Vision

Finance Command Center is a premium financial intelligence platform for power users managing multiple bank accounts, credit cards, clients and financial transactions.

The application is designed for:

\- Business Owners  
\- Finance Teams  
\- Chartered Accountants  
\- CFOs  
\- Power Users managing multiple financial accounts

The experience should feel like professional financial software rather than a generic admin dashboard.

\---

\# Product Name

Official Product Name:

\*\*Finance Command Center\*\*

Do NOT rename the application.

Never use:

\- FinOps Core  
\- Intel Core  
\- Finance Intelligence Platform  
\- Finance Dashboard

unless explicitly instructed.

\---

\# Design Philosophy

The application should prioritize:

\- Clarity  
\- Information Density  
\- Fast Navigation  
\- Operational Efficiency  
\- Professional Appearance

Avoid:

\- Marketing website aesthetics  
\- Oversized cards  
\- Excessive whitespace  
\- Glassmorphism  
\- Large gradients  
\- Decorative animations

Aim for software similar in quality to:

\- Mercury  
\- Ramp  
\- Stripe Dashboard  
\- Brex  
\- Linear  
\- Notion

\---

\# Navigation Structure

Sidebar Navigation:

\`\`\`  
Dashboard

Clients

Accounts

Credit Cards

Transactions

Statements

Categories

Merchant Center

Analytics

Settings  
\`\`\`

Credit Cards is a standalone module.

Do not merge it into Accounts.

\---

\# Dashboard Responsibility

Dashboard is NOT an analytics page.

Dashboard is the operational command center.

It answers:

\- What requires attention today?  
\- Which accounts need action?  
\- Which statements are pending?  
\- Which transactions need review?  
\- What happened recently?  
\- What should the user do next?

Dashboard Sections:

\- Financial Snapshot  
\- Connected Accounts  
\- Credit Cards  
\- Resolution Queue  
\- Recent Transactions  
\- Recent Statements  
\- Quick Actions  
\- Notifications

Dashboard should minimize scrolling.

Most important information should appear above the fold.

\---

\# Analytics Responsibility

Analytics is a historical insights page.

Analytics answers:

\- Spending trends  
\- Category analysis  
\- Merchant analysis  
\- Client analysis  
\- Monthly comparisons  
\- Cash Flow  
\- Forecasts  
\- Financial KPIs

Charts belong here.

Dashboard should contain only operational metrics.

\---

\# Header

The application header must remain clean.

Allowed:

\- Search  
\- Theme Toggle  
\- Notification Icon  
\- Profile Menu  
\- Settings

Remove:

\- Help Icon  
\- Workspace Links  
\- ADMIN VIEW  
\- Named User Labels  
\- FY subtitle  
\- Decorative navigation links

\---

\# Dashboard Widgets

Every dashboard section should be a reusable widget.

Never build one monolithic Dashboard component.

Examples:

\- KPI Widget  
\- Facility Widget  
\- Resolution Queue Widget  
\- Transaction Table Widget  
\- Statement Widget  
\- Notification Widget

Widgets must be reusable across future pages.

\---

\# Component Standards

Always create reusable components.

Avoid duplicate implementations.

Examples:

\- Data Table  
\- Search Bar  
\- Filter Bar  
\- KPI Card  
\- Status Badge  
\- Account Card  
\- Credit Card Card  
\- Dialog  
\- Drawer  
\- Form  
\- Pagination  
\- Empty State  
\- Skeleton  
\- Error State

\---

\# UI Standards

Use:

\- React 19  
\- TypeScript  
\- Tailwind CSS v4  
\- shadcn/ui

Rules:

\- No inline styles  
\- No hardcoded colors  
\- No duplicated layouts  
\- Responsive by default  
\- Accessible components  
\- Keyboard friendly

\---

\# Data

Until Supabase integration begins:

Use strongly typed mock repositories.

Do not hardcode data directly inside components.

All mock data should be isolated.

\---

\# Stitch Designs

Stitch screens are visual references.

They are NOT production code.

Claude should:

\- Preserve layout  
\- Preserve information hierarchy  
\- Improve responsiveness  
\- Improve accessibility  
\- Improve maintainability

Claude may fix:

\- Broken layouts  
\- Empty widgets  
\- Inconsistent spacing  
\- Grid bugs  
\- Missing responsive behavior

Do NOT copy HTML directly.

\---

\# Empty States

Every screen must include:

\- Empty State  
\- Loading State  
\- Error State

No blank pages.

\---

\# Tables

Every data table should support:

\- Search  
\- Sort  
\- Pagination  
\- Hover State  
\- Sticky Header  
\- Empty State  
\- Loading Skeleton  
\- Responsive Layout

\---

\# Forms

Forms must support:

\- Validation  
\- Required indicators  
\- Helpful error messages  
\- Keyboard navigation  
\- Responsive layouts

\---

\# Icons

Use a single icon library consistently.

Do not mix icon libraries.

\---

\# Code Quality

Never use:

\- any  
\- duplicated logic  
\- magic numbers  
\- inline business logic

Prefer:

\- reusable hooks  
\- utility functions  
\- typed interfaces  
\- shared components

\---

\# Testing

Every completed module must pass:

\- Build  
\- Typecheck  
\- ESLint  
\- Prettier  
\- Playwright

No module is complete until all checks pass.

\---

\# Git

Each completed module should be committed separately.

Example:

\`\`\`  
feat: implement dashboard

feat: implement transactions

feat: implement accounts  
\`\`\`

Avoid mixing multiple features into one commit.

\---

\# Future Enhancements

Future releases may include:

\- Net Worth Dashboard  
\- Budget Planning  
\- Investment Tracking  
\- Cash Flow Forecasting  
\- AI Insights  
\- Smart Categorization  
\- Reconciliation Assistant

These features should not influence the current architecture.

\---

\# Decision Authority

If any future prompt, design, HTML export or generated code conflicts with this document:

\*\*PRODUCT\_DECISIONS.md always wins.\*\*

When uncertain:

Do not assume.

Generate a clarification report instead of inventing functionality.
