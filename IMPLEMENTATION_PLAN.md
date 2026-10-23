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
| **05 — Checklist, templates & activity** | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified | **Ready to begin** |
| **06 — QA, hardening & deployment** | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes | Pending |

## Execution Protocol & Repository Reality
- **Current Active Branch:** `feature/04-events-and-invitations`
- **Authentication:** `@clerk/nextjs` with Google OAuth; routes guarded by `src/proxy.ts`.
- **Profile Sync:** Trusted server action `syncUserProfile()` handles idempotent upsert to Supabase `profiles`.
- **Events & Invitations:** Validated Server Actions (`createEventAction`, `getEventDetailsAction`, `listUserEventsAction`, `archiveEventAction`, `restoreEventAction`, `completeEventAction`, `generateInviteCodeAction`, `joinEventAction`, `revokeInviteCodeAction`).
- **Authorization & Security:** Strict server-side membership check on `/events/[id]`, private data hidden on `/join/[code]` prior to authentication, 8-character high-entropy invite codes with sliding-window rate limiting.
- **Automated Tests:** 36 automated unit and integration tests passing via Vitest across 3 suites. Next.js Turbopack build verified.
- **Git Policy:** Branches are preserved. Feature branch is pushed to remote, then merged into `master`, and `master` pushed to remote.
