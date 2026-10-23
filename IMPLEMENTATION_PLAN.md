# Implementation Plan

Execute phases in order. Each phase has a dedicated checklist under `phases/`. The phase checklist is the execution ledger; update it as work is completed.

## Phase Overview
| Phase | Outcome | Gate | Status |
|---|---|---|---|
| **00 — Foundation & repo audit** | Existing project, skills, MCP, scripts, and environment understood | Audit report and safe baseline | **COMPLETE** |
| **01 — UX direction & design system** | Design direction and responsive interaction patterns established | Impeccable + UI UX Pro Max review | **COMPLETE** |
| **02 — Data model & security** | Migrations, identity sync, access rules, and lifecycle lock verified | Positive and negative authorization tests | **COMPLETE** |
| **03 — App foundation & auth** | App shell, Clerk Google login, profile sync, dashboard skeleton | Auth and profile sync work | **COMPLETE** |
| **04 — Events & invitations** | Create/list/detail events and secure join flow | Invite/membership tests pass | **Ready to begin** |
| **05 — Checklist, templates & activity** | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified | Pending |
| **06 — QA, hardening & deployment** | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes | Pending |

## Execution Protocol & Repository Reality
- **Current Active Branch:** `feature/03-app-foundation-auth`
- **Authentication:** `@clerk/nextjs` with Google OAuth; routes guarded by `src/proxy.ts`.
- **Profile Sync:** Trusted server action `syncUserProfile()` handles idempotent upsert to Supabase `profiles`.
- **Dashboard:** Interactive dashboard skeleton in `src/app/page.tsx` with Active, Completed, and Archived trip categories.
- **Automated Tests:** 21 automated unit and integration tests passing via Vitest. Next.js Turbopack build verified.
- **Git Policy:** Branches are preserved. Feature branch is pushed to remote, then merged into `master`, and `master` pushed to remote.
