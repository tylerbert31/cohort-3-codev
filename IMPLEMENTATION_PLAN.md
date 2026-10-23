# Implementation Plan

Execute phases in order. Each phase has a dedicated checklist under `phases/`. The phase checklist is the execution ledger; update it as work is completed.

## Phase Overview
| Phase | Outcome | Gate | Status |
|---|---|---|---|
| **00 — Foundation & repo audit** | Existing project, skills, MCP, scripts, and environment understood | Audit report and safe baseline | **COMPLETE** |
| **01 — UX direction & design system** | Design direction and responsive interaction patterns established | Impeccable + UI UX Pro Max review | Ready to begin |
| **02 — Data model & security** | Migrations, identity sync, access rules, and lifecycle lock verified | Positive and negative authorization tests | Pending approval / config |
| **03 — App foundation & auth** | App shell, Clerk Google login, profile sync, dashboard skeleton | Auth and profile sync work | Pending Phase 01/02 |
| **04 — Events & invitations** | Create/list/detail events and secure join flow | Invite/membership tests pass | Pending |
| **05 — Checklist, templates & activity** | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified | Pending |
| **06 — QA, hardening & deployment** | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes | Pending |

## Execution Protocol & Repository Reality (Audited Phase 00)
- **Git & Integration Target:** `master` is synchronized with `origin` (`https://github.com/tylerbert31/cohort-3-codev.git`). Direct commits to `master` are disallowed for feature implementations.
- **Branch Strategy:** Work will proceed on scoped feature branches (e.g. `feature/01-ui-ux-design-system` / `feature/ui`). Isolated sibling worktrees (`../cohort-worktrees/<branch-name>`) will be utilized when parallel tracks have non-overlapping file scopes.
- **Runtime & Tooling:** Node `v24.21.0` and npm `11.19.0` are active. Package management strictly runs through `npm`. Chrome and Edge with Chrome DevTools MCP tools are available for browser QA and viewport emulation (360px, 390px, 768px, 1280px).
- **Skills Available:**
  - `/impeccable`: Launcher verified (`impeccable.cmd context`). Detected `DESIGN.md` and initial state.
  - `/ui-ux-pro-max`: Reference guidelines verified (`quick-reference.md`, `pro-rules.md`, `data/stacks/nextjs.csv`). Note: Search Python script requires Python, which is not in system PATH, but full guideline catalogs are directly readable.
- **Supabase Status:** Connected to `https://fksmnckygfvccbxgrwxz.supabase.co`. Current database contains legacy restaurant tables with RLS disabled. User noted alternative organization ID `zxdxyirwyzvkmtltajnl`. No migrations or changes were run during Phase 00.
- **Environment Keys Present in `.env`:**
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (present)
  - `CLERK_SECRET_KEY` (present)
  - `NEXT_PUBLIC_SUPABASE_URL` (present)
  - `SUPABASE_SERVICE_ROLE_KEY` (present)
  - *Missing:* `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not present in `.env`.

## Outstanding Blockers & Decisions Requiring Approval
1. **Supabase Project Target:** Clarify whether `https://fksmnckygfvccbxgrwxz.supabase.co` is the intended database for this project (which currently contains 6 legacy restaurant tables), or if re-authenticating with org ID `zxdxyirwyzvkmtltajnl` to connect to a new project is required before Phase 02.
2. **Missing Anon Key:** Confirm obtaining `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side Supabase/Realtime initialization.
3. **Approval to begin Phase 01:** Proceed to create `feature/01-ui-ux-design-system` (or `feature/ui`) and execute `phases/01-ux-direction-and-design-system.md`.
