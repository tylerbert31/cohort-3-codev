# Implementation Plan

Execute phases in order. Each phase has a dedicated checklist under `phases/`. The phase checklist is the execution ledger; update it as work is completed.

## Phase overview
| Phase | Outcome | Gate |
|---|---|---|
| 00 — Foundation & repo audit | Existing project, skills, MCP, scripts, and environment understood | Audit report and safe baseline |
| 01 — UX direction & design system | Design direction and responsive interaction patterns established | Impeccable + UI UX Pro Max review |
| 02 — Data model & security | Migrations, identity sync, access rules, and lifecycle lock verified | Positive and negative authorization tests |
| 03 — App foundation & auth | App shell, Clerk Google login, profile sync, dashboard skeleton | Auth and profile sync work |
| 04 — Events & invitations | Create/list/detail events and secure join flow | Invite/membership tests pass |
| 05 — Checklist, templates & activity | Shared grouped checklist, assignment, quantities, templates, activity, archive/completion | Core workflows and lock verified |
| 06 — QA, hardening & deployment | Automated and browser QA, accessibility/responsive review, Amplify readiness | Release checklist passes |

## Execution protocol
- At the start, inspect Git status, branch, package manager, scripts, existing code, environment variable names, and Supabase schema.
- Do not overwrite existing work or reset branches.
- Before implementation, identify tasks that can safely run in parallel.
- Use independent Git worktrees only for parallel tasks with clear file ownership and low integration coupling. Suggested candidates: design system/UI audit; database/security review; test-plan/e2e harness. Keep foundational architecture and migrations coordinated by the lead.
- Each subagent reports: scope, files changed, tests run, results, risks, and commit hash if it commits.
- One lead/orchestrator owns integration, conflict resolution, final review, and phase checklist updates.
- Never allow multiple agents to edit the same files concurrently in the same worktree.
- Merge/rebase worktrees deliberately; run the complete test suite after integration.
- Stop and ask before destructive database changes, major scope changes, or actions requiring unavailable credentials.
- Keep progress and decisions documented in `IMPLEMENTATION_PLAN.md` and relevant phase files.
