# Phase 02 — Data Model & Security

## Goal
Create or reconcile the data model and prove authorization boundaries.

## Checklist
- [ ] Inspect existing schema and migration history using Supabase MCP.
- [ ] Document actual schema differences from `DATABASE.md`.
- [ ] Finalize profiles, events, memberships, invites, sections, items, templates, and activity model.
- [ ] Define ownership, membership, and role rules explicitly.
- [ ] Design invite code/token storage and safe validation strategy.
- [ ] Add indexes, constraints, and timestamps needed for correctness.
- [ ] Implement auditable migrations in the repository.
- [ ] Review RLS and policies for tables exposed to client access or Realtime.
- [ ] Ensure no browser-accessible service-role key or equivalent bypass exists.
- [ ] Implement server-side completed-event lock and database-level defense where feasible.
- [ ] Ensure Clerk profile sync is trusted and idempotent.
- [ ] Verify Realtime authorization and private event isolation.
- [ ] Test unauthorized cross-user reads and mutations.
- [ ] Test invite abuse/invalid codes and safe error behavior.
- [ ] Test every relevant mutation after event completion.
- [ ] Verify migration result with Supabase MCP and update `DATABASE.md`.

## Exit gate
Migrations are auditable and non-destructive; authorization tests cover allowed and denied paths; completed-event lock cannot be bypassed through normal application paths.
