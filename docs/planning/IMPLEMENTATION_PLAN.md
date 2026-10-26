# Implementation Plan

Execute phases in order. Each phase has a dedicated checklist under `phases/`. The phase checklist is the execution ledger; update it as work is completed.

## Phase Overview
| Phase | Outcome | Gate | Status |
|---|---|---|---|
| **00 — Foundation & repo audit** | Existing project, skills, MCP, scripts, and environment understood | Audit report and safe baseline | **COMPLETE** |
| **01 — UX direction & design system** | Design direction and responsive interaction patterns established | Impeccable + UI UX Pro Max review | **COMPLETE** |
| **02 — Data model & security** | Migrations, identity sync, access rules, and lifecycle lock verified | Positive and negative authorization tests | **COMPLETE** |
| **03 — App foundation & auth** | App shell, Clerk Google login, profile sync, dashboard skeleton | Auth and profile sync work | **COMPLETE** |
| **04 — Events & invitations** | Create/list/detail events and secure join flow | Invite/membership tests pass | **COMPLETE** |
| **05 — Checklist, templates & activity** | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified | **COMPLETE** |
| **06 — QA, hardening & deployment** | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes | **COMPLETE** |

## Execution Protocol & Repository Reality
- **Current Active Branch:** `feature/06-release-and-deployment`
- **Authentication:** `@clerk/nextjs` with Google OAuth; routes guarded by `src/proxy.ts`.
- **Profile Sync:** Trusted server action `syncUserProfile()` handles idempotent upsert to Supabase `profiles`.
- **Checklist & Templates:** Validated Server Actions in `src/server/actions/checklist.ts` for section CRUD, item CRUD, completion toggle, assignee validation, template creation/extraction/application, and Realtime sync (`useEventRealtime`).
- **Authorization & Security:** Database triggers and server assertions enforce permanent completed-event lock (`EVENT_LOCKED`). Non-members rejected on event/section/item operations with `FORBIDDEN`.
- **Automated Tests:** 65 automated unit and integration tests passing via Vitest across 5 suites. Next.js Turbopack build verified.
- **Git Policy:** Branches are preserved. Feature branch is pushed to remote, then merged into `master`, and `master` pushed to remote.
