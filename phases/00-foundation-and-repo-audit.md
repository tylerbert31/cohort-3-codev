# Phase 00 — Foundation & Repository Audit

## Goal
Understand the existing codebase and tool environment before changing it.

## Checklist
- [ ] Read all root project documents.
- [ ] Inspect Git status, current branch, remotes, and recent commits.
- [ ] Confirm no uncommitted user changes will be overwritten.
- [ ] Identify package manager, Node/runtime version, scripts, lint, typecheck, test, and build commands.
- [ ] Map current app routes, components, server actions, data access, and auth integration.
- [ ] Inspect env variable names and validate required variables are present without printing values.
- [ ] Confirm `/impeccable` and `/ui-ux-pro-max` availability and read their instructions.
- [ ] Confirm Supabase MCP availability and identify the connected project safely.
- [ ] Inspect existing Supabase schema, policies, functions, triggers, Realtime, and migrations.
- [ ] Confirm browser QA tooling is available; identify fallback if not.
- [ ] Record risks, unknowns, baseline check results, and task ownership matrix.
- [ ] Decide which tasks warrant separate worktrees and explain why.
- [ ] Update `IMPLEMENTATION_PLAN.md` with actual repository findings.

## Exit gate
No destructive changes made; baseline and tool availability documented; work plan approved internally before implementation proceeds.
