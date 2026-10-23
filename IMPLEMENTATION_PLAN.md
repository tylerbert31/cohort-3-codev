# Implementation Plan

Execute phases in order. Each phase has a dedicated checklist under `phases/`. The phase checklist is the execution ledger; update it as work is completed.

## Phase Overview
| Phase | Outcome | Gate | Status |
|---|---|---|---|
| **00 — Foundation & repo audit** | Existing project, skills, MCP, scripts, and environment understood | Audit report and safe baseline | **COMPLETE** |
| **01 — UX direction & design system** | Design direction and responsive interaction patterns established | Impeccable + UI UX Pro Max review | **COMPLETE** |
| **02 — Data model & security** | Migrations, identity sync, access rules, and lifecycle lock verified | Positive and negative authorization tests | **Ready to begin** |
| **03 — App foundation & auth** | App shell, Clerk Google login, profile sync, dashboard skeleton | Auth and profile sync work | Pending Phase 02 |
| **04 — Events & invitations** | Create/list/detail events and secure join flow | Invite/membership tests pass | Pending |
| **05 — Checklist, templates & activity** | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified | Pending |
| **06 — QA, hardening & deployment** | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes | Pending |

## Execution Protocol & Repository Reality
- **Current Active Branch:** `feature/01-ui-ux-design-system`
- **Scaffolding:** Next.js 16 (Turbopack) with React 19, TypeScript, and Tailwind CSS installed and verified.
- **Design System:** Implemented in `src/components/ui/` and `src/components/layout/`. Passed `impeccable detect` with 0 findings. Compiles cleanly via `npm run build` and `tsc --noEmit`.
- **Database Status:** Connected to `https://fksmnckygfvccbxgrwxz.supabase.co`. Current database contains legacy restaurant tables with RLS disabled.

## Outstanding Decisions for Phase 02
1. **Supabase Project Target:** Confirm whether migrations should be drafted and applied against `https://fksmnckygfvccbxgrwxz.supabase.co`, or if re-authenticating with org ID `zxdxyirwyzvkmtltajnl` is preferred.
2. **Missing Anon Key:** Confirm adding `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env` for Realtime client subscriptions.
