\# CLAUDE.md

\# Finance Command Center  
\#\# Claude Code Implementation Playbook

Version: 1.0

Status: Production Engineering Guide

Authoritative Specification

\---

\# PURPOSE

This document is the permanent engineering guide for Claude Code.

It defines:

\- Project architecture  
\- Coding standards  
\- Design standards  
\- Backend architecture  
\- Frontend architecture  
\- Database architecture  
\- Development workflow  
\- Module implementation contracts  
\- Rules that must never be violated

Whenever there is ambiguity, this document takes precedence over assumptions.

If requirements conflict with implementation, stop and ask for clarification.

Never redesign approved architecture.

\---

\# PROJECT OVERVIEW

Project Name

Finance Command Center

\---

\#\# Vision

Build a premium personal financial intelligence platform that automatically captures financial activity from Gmail and bank statements, categorizes transactions using AI, stores them in Supabase, and provides a world-class web dashboard for reconciliation, analytics, reporting, and financial insights.

The application is NOT a SaaS platform.

There is only one client.

The system is built specifically around one financial ecosystem.

Future multi-user support is optional.

\---

\#\# Primary Goals

Provide one place to manage

\- Credit Cards  
\- Savings Accounts  
\- Current Accounts  
\- OD Accounts  
\- Statements  
\- Merchant Intelligence  
\- AI Categorisation  
\- Financial Analytics

\---

The system should reduce manual bookkeeping by automating:

\- transaction extraction  
\- statement parsing  
\- merchant normalization  
\- categorization  
\- reconciliation

\---

\# PROJECT PHILOSOPHY

The application should feel like

Stripe Dashboard

\+

Linear

\+

Notion

\+

Modern Banking

NOT

Traditional ERP

NOT

Accounting Software

NOT

Bootstrap Admin Panel

\---

The interface should feel

Minimal

Premium

Fast

Clean

Professional

Calm

High Information Density

\---

Animations should be subtle.

Whitespace should be generous.

Every screen should have a clear hierarchy.

\---

\# EXISTING BACKEND (CRITICAL)

This project already has a working backend.

Claude MUST understand that this backend already exists.

The objective is NOT to redesign it.

The objective is to build a frontend around it.

\---

Current Architecture

\`\`\`  
Gmail

↓

n8n

↓

AI Extraction

↓

Merchant Memory

↓

AI Categorisation

↓

Supabase

↓

Finance Dashboard  
\`\`\`

\---

There are THREE existing workflows.

\---

Workflow A

Transaction Email Processing

\`\`\`  
Gmail

↓

Normalize Email

↓

Merchant Lookup

↓

AI Categorisation

↓

Deduplication

↓

Supabase

↓

Processed Label  
\`\`\`

\---

Workflow B

Statement Processing

\`\`\`  
Statement Email

↓

Save PDF

↓

Google Drive

↓

PDF Parser

↓

AI Extraction

↓

Normalize

↓

Supabase

↓

Statement Linked  
\`\`\`

\---

Workflow C

Merchant Learning

\`\`\`  
Transaction Saved

↓

Merchant Lookup

↓

Known Merchant?

↓

YES

↓

Reuse Category

↓

NO

↓

AI Classification

↓

Merchant Memory Updated  
\`\`\`

\---

These workflows already work.

Do not redesign them.

\---

\# WHAT CLAUDE MUST NEVER CHANGE

Unless explicitly instructed.

Never redesign

\- Gmail Processing  
\- n8n Architecture  
\- Statement Parser  
\- Merchant Learning  
\- AI Categorisation Flow  
\- Existing Supabase Tables  
\- Existing Labels  
\- Existing Database Relationships

Never replace working systems.

Always extend.

\---

\# DEVELOPMENT PRINCIPLES

Every implementation should follow

Single Responsibility Principle

Composition over inheritance

Reusable Components

Separation of Concerns

Type Safety

Accessibility

Performance

Maintainability

\---

Never duplicate logic.

Never duplicate components.

Never duplicate SQL.

\---

\# TECHNOLOGY STACK

Frontend

React 19

TypeScript

Vite

Tailwind CSS

shadcn/ui

TanStack Query

TanStack Table

React Hook Form

Zod

Recharts

Framer Motion

Lucide Icons

React Router

\---

Backend

Supabase

PostgreSQL

SQL Views

RPC

Edge Functions

Supabase Auth

Storage

\---

Automation

n8n

Gemini

Claude

OpenAI

Google Drive

Gmail

\---

Development

GitHub

VS Code

Claude Code

Docker

Google Stitch

\---

\# TECHNOLOGIES NOT ALLOWED

Do NOT introduce these without approval.

Redux

Bootstrap

Material UI

Ant Design

jQuery

Moment.js

Styled Components

CSS Modules

Axios

MobX

Class Components

JavaScript (new files)

Use TypeScript.

\---

\# PROJECT STRUCTURE

\`\`\`  
finance-command-center/

src/

    app/

    pages/

    layouts/

    components/

    hooks/

    services/

    stores/

    lib/

    types/

    utils/

    styles/

supabase/

    migrations/

    functions/

    views/

    rpc/

tests/

docs/

public/  
\`\`\`

\---

Folder Responsibilities

app/

Application entry

Routing

Providers

\---

pages/

Only page composition.

No business logic.

\---

components/

Reusable UI.

\---

hooks/

Business logic.

Fetching.

State.

\---

services/

Supabase communication.

Never query Supabase directly inside components.

\---

stores/

Global UI state only.

Never server state.

\---

utils/

Pure helper functions.

\---

types/

All interfaces.

No duplicated types.

\---

supabase/

SQL

Views

RPC

Functions

Migrations

\---

\# APPLICATION ARCHITECTURE

\`\`\`  
React Pages

↓

Components

↓

Hooks

↓

Services

↓

Supabase Client

↓

SQL Views

↓

Tables  
\`\`\`

Never skip layers.

\---

\# STATE MANAGEMENT

Server State

TanStack Query

\---

Global UI State

Zustand

\---

Local State

React

\---

Never duplicate server state in Zustand.

\---

\# ROUTING

Routes

/

Dashboard

/accounts

/accounts/:id

/transactions

/transactions/:id

/statements

/statements/:id

/analytics

/merchants

/ai-review

/settings

\---

Every route should lazy load.

\---

\# SESSION CONTINUITY RULE

Every coding session begins by

1 Reading CLAUDE.md

2 Understanding current module

3 Reviewing previous implementation

4 Identifying incomplete work

Only then start coding.

Never assume.

Always verify.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 2  
\#  
\# CODING STANDARDS  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# TYPESCRIPT

Always use

Strict Mode

Interfaces

Explicit types

Readonly where appropriate

Enums sparingly

Generics when useful

Avoid

any

unknown unless necessary

Type assertions unless unavoidable

\---

\# REACT

Always

Functional Components

Hooks

Composition

Named exports

Reusable Components

Memoization where useful

Lazy loading

Error Boundaries

\---

Never

Class Components

Business logic inside JSX

Massive files

Deep prop drilling

\---

Target

One responsibility per component.

\---

\# COMPONENT STANDARDS

Every component should have

Props Interface

Documentation comment

Loading State

Error State

Empty State

Accessibility

Responsive Layout

Dark Mode

\---

Preferred structure

\`\`\`tsx  
interface Props {}

export function Component() {

return ()

}  
\`\`\`

\---

\# FILE SIZE

Preferred

\<200 lines

Acceptable

300

Maximum

500

If larger

Split component.

\---

\# HOOK STANDARDS

Hooks own

Fetching

Mutation

Caching

Transformation

Validation

\---

Naming

useDashboard()

useTransactions()

useAccounts()

useStatements()

useMerchants()

useAnalytics()

\---

Never fetch inside components.

\---

\# SERVICE LAYER

Every API call

↓

Service

↓

Hook

↓

UI

Never

Component

↓

Supabase

\---

\# ERROR HANDLING

Every request must support

Loading

Empty

Error

Retry

Timeout

\---

Never silently ignore errors.

\---

\# UI DESIGN PRINCIPLES

The application should feel

Premium

Fast

Minimal

Calm

Professional

\---

Spacing

Use 8px spacing scale.

Never random margins.

\---

Cards

Rounded

Soft shadows

Subtle borders

No excessive colors.

\---

Icons

Lucide only.

\---

Buttons

Primary

Secondary

Ghost

Danger

Icon

Loading

\---

\# TABLES

TanStack Table

Always

Sorting

Filtering

Pagination

Column visibility

Sticky Header

Resizable Columns

Search

CSV Export

Virtualization for large datasets

\---

\# CHARTS

Use

Recharts

Charts

Line

Area

Bar

Donut

Sparkline

Stacked

Never use 3D charts.

\---

\# FORMS

Always

React Hook Form

\+

Zod

Validation

Never uncontrolled forms.

\---

\# ACCESSIBILITY

Every component must support

Keyboard Navigation

ARIA Labels

Focus Indicators

Screen Readers

High Contrast

Semantic HTML

\---

\# RESPONSIVE

Support

Desktop

Tablet

Mobile

Never desktop-only.

\---

\# DARK MODE

Every component must support

Light

Dark

System

\---

Never hardcode colors.

Always use design tokens.

\---

\# ANIMATIONS

Use

Framer Motion

Duration

150–250ms

Subtle

No flashy animations.

\---

\# LOADING STATES

Every page

Skeleton

Spinner only for very small areas.

\---

\# EMPTY STATES

Every module should have

Illustration

Explanation

Primary Action

\---

\# PERFORMANCE

Lazy load pages.

Virtualize large tables.

Memoize expensive components.

Use SQL Views.

Avoid unnecessary re-renders.

\---

\# DEFINITION OF CODE QUALITY

Claude should never stop after "it works."

Every feature must be

Compiled

Linted

Typed

Responsive

Accessible

Testable

Reusable

Production Ready

Only then is a task considered complete.  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 3  
\#  
\# DATABASE STANDARDS  
\#  
\# SUPABASE  
\#  
\# SQL VIEWS  
\#  
\# RPC FUNCTIONS  
\#  
\# EDGE FUNCTIONS  
\#  
\# n8n INTEGRATION  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATABASE PHILOSOPHY

The database is the Single Source of Truth.

Claude MUST NOT duplicate business logic inside React.

Business logic belongs in one of the following layers:

1\. PostgreSQL SQL Views  
2\. PostgreSQL RPC Functions  
3\. Supabase Edge Functions  
4\. n8n Automation

Never inside React Components.

React is only responsible for presentation.

\---

\# DATABASE RESPONSIBILITIES

n8n

↓

Extract Data

Normalize Data

Categorize Data

Save Data

↓

Supabase Tables

↓

SQL Views

↓

React

\---

Never reverse this architecture.

\---

\# EXISTING DATABASE

The following tables already exist and are considered production assets.

transactions

statement\_transactions

processed\_messages

merchant\_memory

monthly\_summaries

banks

categories

email\_sources

These tables must NOT be redesigned.

Only extend them through approved migrations.

\---

\# NEW TABLES

The following tables may be added.

accounts

statements

clients

audit\_logs

notifications

application\_settings

Every migration must be reversible.

Never modify production tables directly.

Always create migrations.

\---

\# MIGRATION RULES

Every schema change requires

Migration

↓

Review

↓

Test

↓

Deployment

Never manually edit production schema.

\---

\# DATABASE NAMING

Tables

snake\_case

Columns

snake\_case

Views

vw\_\<module\>\_\<name\>

Example

vw\_transactions

vw\_dashboard\_summary

vw\_account\_health

Materialized Views

mv\_\<module\>\_\<name\>

RPC

rpc\_\<action\>

Indexes

idx\_\<table\>\_\<column\>

Foreign Keys

fk\_\<table\>\_\<column\>

Primary Keys

pk\_\<table\>

\---

\# UUID RULES

Every primary key

UUID

Generated by PostgreSQL

Never generate IDs inside React.

\---

\# TIMESTAMPS

Every table should contain

created\_at

updated\_at

Where appropriate

deleted\_at

Never physically delete important financial data.

Use soft deletes where required.

\---

\# DATABASE CONSTRAINTS

Always enforce

NOT NULL

CHECK Constraints

Foreign Keys

Unique Constraints

Never rely solely on frontend validation.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# SQL VIEW RULES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The frontend should consume SQL Views instead of raw tables whenever possible.

Benefits

Single Source of Truth

Centralized Business Logic

Cleaner React

Better Performance

\---

Allowed

React

↓

Service

↓

SQL View

\---

Avoid

React

↓

Join Multiple Tables

\---

Never calculate

Monthly Spend

Dashboard Totals

Cash Flow

Category Statistics

Merchant Statistics

inside React.

Those belong in SQL Views.

\---

\# REQUIRED SQL VIEWS

Dashboard

vw\_dashboard\_summary

vw\_dashboard\_accounts

vw\_dashboard\_cashflow

vw\_dashboard\_due\_cards

Transactions

vw\_transactions

vw\_transaction\_details

vw\_transaction\_search

vw\_transactions\_review

vw\_transactions\_duplicates

Accounts

vw\_accounts

vw\_account\_summary

vw\_account\_transactions

vw\_account\_trends

vw\_account\_health

Statements

vw\_statements

vw\_statement\_summary

vw\_statement\_transactions

vw\_statement\_processing

vw\_statement\_reconciliation

vw\_statement\_metrics

Analytics

vw\_monthly\_spend

vw\_cashflow

vw\_category\_spend

vw\_merchant\_spend

vw\_account\_analytics

vw\_credit\_utilization

vw\_transaction\_trends

Merchant

vw\_merchants

vw\_merchant\_details

vw\_merchant\_transactions

vw\_merchant\_analytics

AI

vw\_ai\_review

vw\_ai\_review\_summary

vw\_ai\_accuracy

Search

vw\_global\_search

System

vw\_system\_health

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# RPC FUNCTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

RPC should be used when

Business Logic

↓

Needs Parameters

OR

Requires Complex Processing

\---

Examples

rpc\_search()

rpc\_merge\_merchants()

rpc\_detect\_duplicates()

rpc\_generate\_monthly\_summary()

rpc\_dashboard\_summary()

rpc\_recalculate\_health()

rpc\_refresh\_materialized\_views()

rpc\_statement\_reconciliation()

\---

Never use RPC for simple CRUD.

Use SQL Views whenever possible.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# MATERIALIZED VIEWS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Use Materialized Views for

Dashboard

Analytics

Monthly Spend

Category Spend

Merchant Spend

Cashflow

Credit Utilization

Refresh

Every 5–10 minutes.

Never refresh synchronously from React.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# EDGE FUNCTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Edge Functions should be used only when SQL cannot solve the problem.

Recommended use cases

Webhook Validation

Complex Business Logic

AI Integrations

Secure API Calls

PDF Processing (future)

Secret Management

Never expose secrets to React.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# SUPABASE SERVICE LAYER

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Components must NEVER access Supabase directly.

Correct

React Component

↓

Hook

↓

Service

↓

Supabase

Wrong

React

↓

Supabase

\---

Example Folder

services/

dashboard.service.ts

transactions.service.ts

accounts.service.ts

statements.service.ts

merchant.service.ts

analytics.service.ts

settings.service.ts

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# TANSTACK QUERY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module owns its own Query Keys.

dashboard

transactions

accounts

statements

analytics

merchant

search

settings

ai-review

Invalidate only affected queries.

Never invalidate everything.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATABASE SECURITY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Never expose

Service Role Keys

AI Prompts

Parser Metadata

OAuth Tokens

Internal Logs

Raw Gmail Messages

Use Environment Variables.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# n8n INTEGRATION

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The backend automation is COMPLETE.

Claude is NOT responsible for redesigning n8n.

Claude consumes its output.

\---

Workflow A

Transaction Emails

Produces

transactions

merchant\_memory

processed\_messages

\---

Workflow B

Statement Processing

Produces

statements

statement\_transactions

transactions

\---

Workflow C

Merchant Learning

Updates

merchant\_memory

\---

Never rewrite Workflow A.

Never rewrite Workflow B.

Never rewrite Workflow C.

Only build interfaces around them.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\# DATA FLOW

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Gmail

↓

n8n

↓

AI Extraction

↓

Merchant Memory

↓

Categorisation

↓

Supabase

↓

SQL Views

↓

Hooks

↓

Components

↓

User

↓

Update

↓

Supabase

↓

Merchant Learning

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 4  
\#  
\# MODULE IMPLEMENTATION CONTRACTS  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module follows

Goal

Pages

Components

Hooks

Services

Views

Definition of Done

Out of Scope

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 1

APPLICATION SHELL

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Create application framework.

Includes

Sidebar

Header

Routing

Theme

Authentication Layout

Notification Area

Breadcrumbs

Global Search Placeholder

No business logic.

\---

Files

layouts/

AppShell.tsx

Sidebar.tsx

TopNav.tsx

PageContainer.tsx

\---

Definition of Done

Responsive

Dark Mode

Keyboard Accessible

Lazy Loaded

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 2

DASHBOARD

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide an executive overview of the user's financial position.

Data Sources

vw\_dashboard\_summary

vw\_dashboard\_accounts

vw\_dashboard\_cashflow

vw\_dashboard\_due\_cards

vw\_ai\_review\_summary

Required Components

DashboardHeader

KPICard

CashFlowChart

AccountCard

RecentTransactions

DuePayments

AIReviewWidget

StatementWidget

QuickActions

Hooks

useDashboard()

Services

dashboard.service.ts

Features

Real-time KPI Cards

Cash Flow

Monthly Spend

Recent Transactions

Account Summary

Upcoming Due Dates

Pending Reviews

Pending Statements

System Status

Acceptance Criteria

✓ Dashboard loads under 2 seconds

✓ Responsive

✓ Uses SQL Views only

✓ No Mock Data

✓ Loading States

✓ Error States

✓ Empty States

Out of Scope

Editing Transactions

Merchant Rules

Settings

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 3

ACCOUNTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide a complete overview of every financial account.

Pages

/accounts

/accounts/:id

Views

vw\_accounts

vw\_account\_summary

vw\_account\_transactions

vw\_account\_trends

vw\_account\_health

Components

AccountCard

AccountSummary

BalanceHistory

TransactionTable

HealthCard

StatementHistory

Hooks

useAccounts()

Services

accounts.service.ts

Features

Balance

Credit Utilization

Health Score

Statements

Recent Transactions

Monthly Trends

Acceptance Criteria

No duplicate queries

All charts responsive

Virtualized transaction list

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 4

TRANSACTIONS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide the primary financial ledger.

Pages

/transactions

/transactions/:id

Views

vw\_transactions

vw\_transaction\_details

vw\_transaction\_search

vw\_transactions\_review

vw\_transactions\_duplicates

Components

TransactionTable

TransactionDrawer

CategoryEditor

MerchantEditor

SearchToolbar

BulkActions

ReviewPanel

DuplicatePanel

Hooks

useTransactions()

Services

transactions.service.ts

Features

Sorting

Filtering

Search

CSV Export

Bulk Categorisation

Manual Edit

Review Queue

Duplicate Detection

Audit History

Acceptance Criteria

50,000+ rows supported

Virtualized Table

Column Visibility

Fast Search

Optimistic Updates

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 5

STATEMENTS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Manage imported bank statements.

Pages

/statements

/statements/:id

Views

vw\_statements

vw\_statement\_summary

vw\_statement\_transactions

vw\_statement\_processing

vw\_statement\_reconciliation

vw\_statement\_metrics

Components

StatementTable

StatementSummary

PDFViewer

Timeline

ReconciliationCard

MetricsCard

TransactionTable

Hooks

useStatements()

Services

statements.service.ts

Features

Statement List

Processing Status

Timeline

PDF Viewer

Transaction Matching

Reconciliation

Warnings

Metrics

Acceptance Criteria

PDF Viewer Responsive

Fast Loading

Statement Metrics

Reconciliation Accuracy

No Duplicate Transactions

Out of Scope

Statement Parsing

Email Download

PDF Extraction

These already exist in n8n.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

END OF PART 4

The next section continues with

MODULE 6 Analytics

MODULE 7 Merchant Center

MODULE 8 AI Review

MODULE 9 Global Search

MODULE 10 Settings

followed by Testing, Git Workflow, Deployment, Session Continuity and Definition of Done.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 5  
\#  
\# MODULE IMPLEMENTATION CONTRACTS  
\#  
\# Analytics  
\#  
\# Merchant Center  
\#  
\# AI Review  
\#  
\# Global Search  
\#  
\# Settings  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module follows the same implementation contract.

Goal

Pages

Components

Hooks

Services

SQL Views

Business Rules

Acceptance Criteria

Out of Scope

Definition of Done

Never implement features outside the current module.

Complete the current module before starting another.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 6

ANALYTICS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide a comprehensive financial intelligence dashboard for understanding spending behavior, cash flow, trends, utilization, and financial performance.

Pages

/analytics

Views

vw\_monthly\_spend

vw\_cashflow

vw\_category\_spend

vw\_merchant\_spend

vw\_account\_analytics

vw\_credit\_utilization

vw\_transaction\_trends

Components

AnalyticsHeader

DateRangeFilter

CashFlowChart

CategorySpendChart

MerchantSpendChart

AccountComparisonChart

CreditUtilizationCard

TrendChart

InsightsPanel

ExportToolbar

Hooks

useAnalytics()

Services

analytics.service.ts

Features

Monthly Spend

Daily Spend

Weekly Spend

Cash Flow

Category Breakdown

Merchant Breakdown

Account Comparison

Credit Utilization

Top Merchants

Top Categories

Average Transaction

Spending Trend

Business vs Personal Spend

Future

Budget Tracking

Forecasting

Acceptance Criteria

Charts responsive

Charts lazy loaded

Materialized views used

No calculations inside React

Loading states

Empty states

Export supported

No mock data

Out of Scope

Budget Management

Investment Tracking

Tax Reports

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 7

MERCHANT CENTER

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Create a Merchant Intelligence Center.

This is not simply a lookup table.

It is the learning engine of the application.

Pages

/merchants

/merchants/:id

Views

vw\_merchants

vw\_merchant\_details

vw\_merchant\_transactions

vw\_merchant\_analytics

vw\_merchant\_review

Components

MerchantTable

MerchantProfile

MerchantAnalytics

MerchantHistory

AliasManager

CategoryEditor

MergeDialog

LearningHistory

ConfidenceBadge

Hooks

useMerchants()

Services

merchant.service.ts

Features

Merchant Search

Merchant Profile

Aliases

Merchant Statistics

Transaction History

Category Rules

Confidence Score

Merchant Merge

Merchant Notes

Learning Timeline

Future

Merchant Logos

Merchant Website

Merchant Type

Business Rules

Merchant Memory is authoritative.

Manual corrections improve future categorisation.

Never overwrite historical data.

Merge should preserve audit history.

Acceptance Criteria

Search under 300ms

Virtualized table

Duplicate detection

Responsive layout

Out of Scope

AI Categorisation Logic

n8n Merchant Learning

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 8

AI REVIEW CENTER

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide a Human-in-the-Loop interface for reviewing AI decisions.

Pages

/ai-review

Views

vw\_ai\_review

vw\_ai\_review\_summary

vw\_ai\_accuracy

vw\_ai\_learning

Components

ReviewQueue

ReviewDrawer

ConfidenceMeter

AIExplanation

ApprovalPanel

BulkApprovalToolbar

AccuracyDashboard

LearningTimeline

Hooks

useAIReview()

Services

ai-review.service.ts

Features

Pending Queue

Approve

Reject

Edit Category

Edit Merchant

Edit Client

Confidence Breakdown

Learning History

Accuracy Statistics

Bulk Actions

Business Rules

AI decisions are suggestions.

User decisions become ground truth.

Never overwrite user corrections.

Acceptance Criteria

Bulk review supported

Keyboard shortcuts

Responsive

Accessible

Audit history maintained

Out of Scope

Model Training

Prompt Engineering

AI Provider Selection

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 9

GLOBAL SEARCH

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Provide application-wide search.

Keyboard shortcut

CTRL \+ K

Pages

Available from every page.

Views

vw\_global\_search

Components

SearchCommand

SearchInput

SearchResults

SearchHistory

QuickActions

Filters

Hooks

useSearch()

Services

search.service.ts

Features

Transaction Search

Merchant Search

Statement Search

Account Search

Category Search

Settings Search

Recent Searches

Keyboard Navigation

Instant Results

Business Rules

Search should use SQL Views.

No client-side indexing.

Debounce requests.

Acceptance Criteria

Search under 300ms

Keyboard accessible

Responsive

Dark Mode

No duplicate requests

Out of Scope

Natural Language Search

AI Chat

Voice Search

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

MODULE 10

SETTINGS

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Goal

Centralized application configuration.

Pages

/settings

Views

vw\_settings\_general

vw\_settings\_accounts

vw\_settings\_categories

vw\_settings\_merchants

vw\_settings\_ai

vw\_settings\_integrations

vw\_system\_health

Components

SettingsSidebar

GeneralSettings

AccountSettings

CategorySettings

MerchantSettings

AISettings

IntegrationStatus

NotificationSettings

SecurityPanel

DatabaseStatistics

SystemHealth

Hooks

useSettings()

Services

settings.service.ts

Features

Application Settings

Financial Accounts

Categories

Merchant Rules

AI Thresholds

Integrations

System Health

Database Statistics

Version Information

Business Rules

Settings must be validated.

Sensitive settings require confirmation.

Secrets never displayed.

Acceptance Criteria

Responsive

Validation

Confirmation dialogs

Accessible

No sensitive information exposed

Out of Scope

User Management

Multi-Tenant Configuration

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\#  
\# PART 6  
\#  
\# TESTING  
\#  
\# GIT  
\#  
\# CI/CD  
\#  
\# SESSION CONTINUITY  
\#  
\# AI OPERATING PROCEDURES  
\#  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

TESTING STRATEGY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every module requires testing.

Unit

Integration

End-to-End

Accessibility

Performance

\---

Unit Tests

Framework

Vitest

Test

Hooks

Utilities

Services

Components

Target

90%+

\---

Component Tests

React Testing Library

Test

Rendering

Loading

Errors

User Interaction

Accessibility

\---

Integration Tests

Test

Supabase

SQL Views

RPC

Edge Functions

\---

End-to-End

Framework

Playwright

Critical Flows

Dashboard

Transaction Review

Statement View

Merchant Center

Settings

Search

AI Review

\---

Performance

Measure

Initial Load

Dashboard Load

Search

Large Tables

Chart Rendering

Memory Usage

\---

Accessibility

WCAG AA

Keyboard Navigation

Screen Readers

Color Contrast

Focus Indicators

Semantic HTML

Required for every feature.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

CI/CD

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Pipeline

Git Push

↓

Type Check

↓

Lint

↓

Unit Tests

↓

Build

↓

Integration Tests

↓

Deploy Preview

↓

Manual Approval

↓

Production

Every Pull Request must pass.

Never bypass CI.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

GIT WORKFLOW

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Main

Production

Develop

Integration

Feature Branches

feature/dashboard

feature/accounts

feature/transactions

feature/statements

feature/analytics

feature/merchant-center

feature/ai-review

feature/search

feature/settings

Commit Format

feat:

fix:

refactor:

docs:

test:

perf:

chore:

Example

feat: add dashboard cashflow widgets

Module-scoped feature commits

Every feature commit for Modules 4 and onward must scope the type with the module number.

Format

feat(module-N): implement \<module-name\> module

Mapping

feat(module-4): implement statements module

feat(module-5): implement accounts module

feat(module-6): implement credit cards module

feat(module-7): implement categories module

feat(module-8): implement merchants module

feat(module-9): implement clients module

feat(module-10): implement analytics module

feat(module-11): implement settings module

feat(module-12): integrate supabase

The module report is included in the SAME commit as the feature. See MODULE COMPLETION GIT PROTOCOL below.

Documentation-only commits (plain docs:, no module scope) are only used when documentation changes independently of a feature — never as a second commit immediately following a feature commit for the same module.

Never commit

node\_modules

.env

dist

build

coverage

\---

MODULE COMPLETION GIT PROTOCOL

For every future module, Claude follows this sequence without waiting for separate instructions:

1\. Complete the implementation.

2\. Generate the module report.

3\. Include the report in the same commit as the feature.

Never a separate documentation-only commit unless explicitly requested.

4\. Run

Build

Typecheck

Lint

Tests

Playwright

Fix every issue before committing.

5\. Commit using Conventional Commits, module-scoped per the Commit Format section above (feat(module-N): ...).

6\. Push automatically to GitHub.

7\. Verify the push succeeded.

8\. Include in the completion report

Repository

Branch

Commit Hash

Push Status

Never stop at "committed locally" and call a module done.

A module is only complete once it is pushed and the push is verified.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

CODE REVIEW CHECKLIST

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Before every commit

✓ TypeScript passes

✓ Build succeeds

✓ Lint clean

✓ Responsive

✓ Accessible

✓ No console.log

✓ No TODO unless approved

✓ No unused imports

✓ No duplicated code

✓ SQL Views used

✓ Hooks used

✓ Services used

Only then commit.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

DEFINITION OF DONE

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

A feature is complete only if

Build succeeds

TypeScript clean

Lint clean

Responsive

Dark Mode

Accessible

Loading State

Empty State

Error State

Reusable Components

Hooks extracted

Services extracted

Tests written

SQL Views used

No mock data

No duplicated logic

Performance acceptable

Documentation updated

Committed with the report in the same commit

Pushed to GitHub and push verified

Never consider

"It works"

as complete.

Production Ready is the standard.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

SESSION CONTINUITY PROTOCOL

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Every coding session starts by

1 Read CLAUDE.md

2 Identify current module

3 Read existing implementation

4 Read related components

5 Read related hooks

6 Read related services

7 Read related SQL Views

8 Identify unfinished work

9 Continue implementation

Never start coding immediately.

Understand first.

\---

Every coding session ends with

Summary

Completed Files

Remaining Tasks

Known Issues

Recommended Next Step

Never end without a summary.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

AI OPERATING PROCEDURES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Claude is an Engineering Partner.

Not an Architect unless requested.

Default behavior

Preserve Architecture

Preserve Naming

Preserve Folder Structure

Preserve Database

Preserve Existing Features

Prefer

Extend

Never

Rewrite

\---

When asked to build

Read module contract

↓

Create files

↓

Compile

↓

Fix errors

↓

Run lint

↓

Improve responsiveness

↓

Accessibility review

↓

Testing

↓

Summary

↓

Stop

\---

When encountering ambiguity

STOP

Do not invent requirements.

Ask.

\---

When modifying existing code

Read entire file first.

Understand purpose.

Minimize changes.

Preserve behavior.

Avoid unrelated refactoring.

\---

Never

Rename large folders

Move modules

Rewrite architecture

Replace libraries

Change backend workflows

Change database schema

Introduce new frameworks

Unless explicitly instructed.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

ERROR RECOVERY

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

If build fails

Fix TypeScript first.

If lint fails

Fix lint.

If runtime fails

Debug before adding code.

If database changes required

Create migration.

Never edit production schema.

If uncertain

Stop.

Explain.

Ask.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

PERFORMANCE RULES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

Always

Lazy load routes

Virtualize tables

Memoize expensive components

Use TanStack Query

Use SQL Views

Use Materialized Views where appropriate

Avoid unnecessary re-renders

Optimize bundle size

Never optimize prematurely.

Measure first.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

FINAL ENGINEERING PRINCIPLES

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

The goal is not simply to build software.

The goal is to build maintainable software.

Every decision should improve

Maintainability

Readability

Performance

Accessibility

Scalability

Developer Experience

Consistency

Never trade long-term architecture for short-term speed.

\---

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

FINAL INSTRUCTION TO CLAUDE CODE

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

You are implementing the Finance Command Center.

This repository already contains an approved architecture.

Your responsibility is to implement it faithfully.

Read this CLAUDE.md before every coding session.

Never redesign approved systems.

Never modify n8n workflows.

Never bypass the service layer.

Never duplicate business logic.

Implement one module at a time.

Complete it fully.

Verify quality.

Summarize your work.

Then stop and wait for the next instruction.

END OF CLAUDE.md  
