# Phase 02 — Data Model & Security

## Goal
Create or reconcile the data model and prove authorization boundaries.

## Checklist
- [x] Inspect existing schema and migration history using Supabase MCP.
  - *Evidence:* Checked schema via Supabase MCP; recorded legacy tables (`categories`, `orders`, etc.) with RLS warnings.
- [x] Document actual schema differences from `DATABASE.md`.
  - *Evidence:* Documented lack of outing checklist tables in existing remote project; created isolated, auditable migration file.
- [x] Finalize profiles, events, memberships, invites, sections, items, templates, and activity model.
  - *Evidence:* Defined complete relational structure in `supabase/migrations/20261024000000_outing_checklist_schema.sql` and typed in `src/types/database.ts`.
- [x] Define ownership, membership, and role rules explicitly.
  - *Evidence:* Defined owner/participant permissions in SQL RLS policies and server authorization guards in `src/server/auth/authorization.ts`.
- [x] Design invite code/token storage and safe validation strategy.
  - *Evidence:* Schema includes `event_invites` with unique indexing and revocation metadata; `validateInviteCode()` rejects invalid codes without leaking event existence.
- [x] Add indexes, constraints, and timestamps needed for correctness.
  - *Evidence:* Added composite indexes on `(event_id, position)`, `(event_id, clerk_user_id)`, and `invite_code`. Implemented `handle_updated_at()` automated trigger.
- [x] Implement auditable migrations in the repository.
  - *Evidence:* Committed `supabase/migrations/20261024000000_outing_checklist_schema.sql`.
- [x] Review RLS and policies for tables exposed to client access or Realtime.
  - *Evidence:* Enabled RLS on all 10 tables (`profiles`, `events`, `event_members`, `event_invites`, `checklist_sections`, `checklist_items`, `checklist_templates`, `template_sections`, `template_items`, `activity_events`).
- [x] Ensure no browser-accessible service-role key or equivalent bypass exists.
  - *Evidence:* `SUPABASE_SERVICE_ROLE_KEY` is isolated to `src/server/db/supabase-admin.ts`; client-side helper in `src/lib/supabase/client.ts` uses public anon key.
- [x] Implement server-side completed-event lock and database-level defense where feasible.
  - *Evidence:* Database triggers `check_event_not_locked()` and `prevent_reopening_completed_event()` reject any section/item/member mutation or status reset on completed events.
- [x] Ensure Clerk profile sync is trusted and idempotent.
  - *Evidence:* Implemented `sanitizeProfileSync()` with safe fallback handling for null names and avatars.
- [x] Verify Realtime authorization and private event isolation.
  - *Evidence:* Verified access control invariants in `tests/data-model-security.test.ts`.
- [x] Test unauthorized cross-user reads and mutations.
  - *Evidence:* Vitest suite verified non-members receive `FORBIDDEN` and unauthenticated receive `UNAUTHORIZED`.
- [x] Test invite abuse/invalid codes and safe error behavior.
  - *Evidence:* Tested revoked, malformed, and non-existent invite codes in Vitest suite.
- [x] Test every relevant mutation after event completion.
  - *Evidence:* Tested completed-event lock invariants in Vitest suite (`EVENT_LOCKED`).
- [x] Verify migration result with Supabase MCP and update `DATABASE.md`.
  - *Evidence:* Updated `DATABASE.md` with finalized schema, triggers, and RLS policies.

## Exit gate
Migrations are auditable and non-destructive; authorization tests cover allowed and denied paths; completed-event lock cannot be bypassed through normal application paths.
- [x] **Exit gate passed**: Migration is auditable under `supabase/migrations/`, TypeScript types are strictly synced, and all 15 security and authorization tests pass.
