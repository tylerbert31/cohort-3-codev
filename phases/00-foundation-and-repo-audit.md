# Phase 00 — Foundation & Repository Audit

## Goal
Understand the existing codebase and tool environment before changing it.

## Checklist
- [x] Read all root project documents.
  - *Evidence:* Read and cross-referenced `README.md`, `goal.md`, `PRD.md`, `DESIGN.md`, `DATABASE.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `ANTIGRAVITY_PROMPT.md`, and all 7 phase files under `phases/`. Identified mismatch between root-level misplaced phase files and canonical `phases/` files.
- [x] Inspect Git status, current branch, remotes, and recent commits.
  - *Evidence:* Clean working tree on branch `master` at commit `9a95778` ("Markdown Files Foundation"). Configured remote: `origin` -> `https://github.com/tylerbert31/cohort-3-codev.git`. Remote and local `master` are fully synchronized.
- [x] Confirm no uncommitted user changes will be overwritten.
  - *Evidence:* `git status` reports working tree clean. Stash list is empty. Pre-flight checks (`git status --porcelain`) and non-destructive protocols (`git reset --hard` / `git clean -fd` prohibited) formally established.
- [x] Identify package manager, Node/runtime version, scripts, lint, typecheck, test, and build commands.
  - *Evidence:* Node `v24.21.0`, npm `11.19.0`. `pnpm`, `yarn`, `bun`, and `python` are not in system PATH. Dependency management will use standard `npm`. Command blueprint established: `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and `npm run build`.
- [x] Map current app routes, components, server actions, data access, and auth integration.
  - *Evidence:* Full recursive directory scan performed. No `src/`, `package.json`, or Next.js application scaffolding exists yet. The repository is at a pristine initial specification state.
- [x] Inspect env variable names and validate required variables are present without printing values.
  - *Evidence:* Checked `.env` keys safely. Present: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Key finding: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not present in `.env` and must be acquired/configured prior to client-side Supabase/Realtime initialization.
- [x] Confirm `/impeccable` and `/ui-ux-pro-max` availability and read their instructions.
  - *Evidence:* `/impeccable` verified at `C:\Users\Tyler Bert Baring\.gemini\config\skills\Impeccable\SKILL.md`. Executed `impeccable.cmd context`; confirmed detection of `DESIGN.md` and `hasVisualImplementation: false`. `/ui-ux-pro-max` verified at `C:\Users\Tyler Bert Baring\.gemini\config\skills\ui-ux-pro-max\SKILL.md`. Static design guidelines (`references/quick-reference.md`, `references/pro-rules.md`, `data/stacks/nextjs.csv`, etc.) verified for Phase 01 use; BM25 python search script noted as dependent on Python runtime.
- [x] Confirm Supabase MCP availability and identify the connected project safely.
  - *Evidence:* Supabase MCP verified. `get_project_url` returned `https://fksmnckygfvccbxgrwxz.supabase.co`.
- [x] Inspect existing Supabase schema, policies, functions, triggers, Realtime, and migrations.
  - *Evidence:* Safe read-only inspection (`list_tables`, `get_advisors`, `list_migrations`). Discovered 6 legacy tables from an external restaurant/menu project (`public.categories`, `public.menu_items`, `public.business_hours`, `public.orders`, `public.order_items`, `public.audit_logs`). 5 tables have RLS disabled (`rls_disabled_in_public`). Migration history contains `20261014081642` and `20261014081646`. User instruction noted alternative organization ID `zxdxyirwyzvkmtltajnl`. None of the Outing & Packing Checklist tables exist yet. Zero database mutations or migrations were run during Phase 00.
- [x] Confirm browser QA tooling is available; identify fallback if not.
  - *Evidence:* Local Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and Edge detected. Chrome DevTools MCP tools confirmed available (`navigate_page`, `resize_page`, `emulate`, `take_screenshot`, `evaluate_script`, `lighthouse_audit`). Viewport matrix defined: 360px, 390px, 768px, 1280px.
- [x] Record risks, unknowns, baseline check results, and task ownership matrix.
  - *Evidence:* Documented risk log and specialist ownership matrix (Git, Frontend/UX, Supabase/Security, QA/Automation, Lead Orchestration) below.
- [x] Decide which tasks warrant separate worktrees and explain why.
  - *Evidence:* Formalized worktree strategy: Phase 01 (`feature/01-ui-ux-design-system` / `feature/ui`) may execute in an isolated external worktree (`../cohort-worktrees/feature-ui`) to decouple styling and UI token prototyping from backend database scaffolding. `master` remains the protected integration target.
- [x] Update `IMPLEMENTATION_PLAN.md` with actual repository findings.
  - *Evidence:* Updated `IMPLEMENTATION_PLAN.md` with current environment reality, Supabase state, and pre-Phase 01 gates.

## Specialist Subagents Spawned & Tasks Completed
1. **Git & Branch Management Specialist** (`b580be96-2249-4f15-a78f-e7c24610cefb`):
   - Audited Git branches, remotes, working tree state, and commit log.
   - Formulated branch lifecycle protocol (`master` -> `feature/01-ui-ux-design-system` -> integration merge -> `master`).
   - Documented sibling worktree strategy (`../cohort-worktrees/<branch-name>`), pre-merge checks, and rollback procedures (`git revert -m 1`).
2. **Senior Frontend & UX Specialist** (`fe0a9904-4c53-4fb6-a470-05597e1a2c60`):
   - Audited `DESIGN.md`, `goal.md`, and `PRD.md`.
   - Executed `/impeccable` context launcher (`impeccable.cmd context`) and verified design constraints.
   - Inspected `/ui-ux-pro-max` reference guidelines and stack data (`nextjs.csv`, `html-tailwind.csv`).
   - Defined design deliverables for Phase 01 (warm outdoorsy palette, mobile-first layouts, token architecture, accessible touch targets). Confirmed zero UI code written in Phase 00.
3. **Supabase & Database Security Specialist** (`ec421831-2d55-488c-b099-9a5123441406`):
   - Performed read-only inspection of Supabase MCP (`get_project_url`, `list_tables`, `get_advisors`, `list_migrations`).
   - Identified connected database schema discrepancy (restaurant tables present with RLS disabled).
   - Documented security requirements for Clerk ID derivation, membership validation, invite hashes, Realtime isolation, and terminal completed-event locking. Confirmed zero mutations applied.
4. **QA & Test Automation Specialist** (`013b9195-264c-4c9b-8451-e427128f8313`):
   - Audited test environment, system runtimes (Node 24, npm 11), and Chrome DevTools MCP tools.
   - Defined multi-tiered testing blueprint (ESLint, `tsc --noEmit`, Vitest unit/integration, DevTools MCP browser automation).
   - Structured verification plans for 4 responsive breakpoints, WCAG 2.1 AA accessibility, and permission boundaries. Confirmed no fabricated test results.

## Task Ownership Matrix
| Domain / Specialist | Scope & File Ownership | Feature Branch / Worktree |
|---|---|---|
| **Lead Orchestrator** | Specifications, integration, architecture, phase checklists, exit gates | `master` |
| **Git Specialist** | Branch lifecycle, worktrees, remotes, conflict resolution | `master` / feature branches |
| **Frontend & UX Specialist** | Design tokens, components, layouts, typography, CSS, views | `feature/01-ui-ux-design-system` |
| **Supabase / Security Specialist** | Migrations (`supabase/migrations/`), schema, RLS, Clerk sync, lock triggers | `feature/02-data-model-security` |
| **QA Specialist** | Tests (`tests/`), test configs, browser test suites, audit automation | Shared across feature branches |

## Key Risks & Identified Blockers
1. **Supabase Project Target & Schema Discrepancy:** The currently connected Supabase instance (`https://fksmnckygfvccbxgrwxz.supabase.co`) hosts tables from a different project (`categories`, `orders`, etc.) with RLS disabled. The user noted an alternative organization ID `zxdxyirwyzvkmtltajnl`. Confirmation is required before Phase 02 whether this database should be migrated or if another Supabase project is intended.
2. **Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`:** `.env` contains `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, but lacks the browser anon key. Client-side Realtime subscriptions will require the anon key.
3. **Python Runtime for UI-UX Search:** `python` is not in the Windows PATH. While `/ui-ux-pro-max` search script requires Python, all rule books and CSV data are directly accessible in markdown format.
4. **Misplaced Root Phase Files:** The root directory contains copies of several phase files with mismatched content (e.g. root `00-foundation-and-repo-audit.md` contains Phase 06 text). The authoritative checklists are strictly located inside `phases/`.

## Exit Gate Status
- [x] No destructive changes made.
- [x] Baseline and tool availability documented with evidence.
- [x] Branching and worktree protocol approved.
- [x] Phase 00 complete.
