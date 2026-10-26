# Database & Authorization Design

Use Supabase PostgreSQL as the source of truth. Schema migrations are auditable under `supabase/migrations/`.

## Finalized Entities & Relationships
Implemented in `supabase/migrations/20261024000000_outing_checklist_schema.sql` and typed in `src/types/database.ts`:

1. `profiles`: `id` (UUID PK), `clerk_user_id` (TEXT UNIQUE NOT NULL), `first_name`, `last_name`, `image_url`, `created_at`, `updated_at`.
2. `events`: `id` (UUID PK), `owner_id` (FK to profiles), `title`, `description`, `location`, `start_date`, `end_date`, `status` ('active' | 'archived' | 'completed'), `archived_at`, `completed_at`, timestamps.
3. `event_members`: `id` (UUID PK), `event_id` (FK to events), `clerk_user_id` (FK to profiles), `role` ('owner' | 'participant'), `joined_at`. Unique constraint on `(event_id, clerk_user_id)`.
4. `event_invites`: `id` (UUID PK), `event_id` (FK to events), `invite_code` (TEXT UNIQUE NOT NULL), `created_by` (FK to profiles), `is_active` (BOOL), timestamps, `revoked_at`.
5. `checklist_sections`: `id` (UUID PK), `event_id` (FK to events), `title`, `position` (INT), timestamps.
6. `checklist_items`: `id` (UUID PK), `event_id` (FK to events), `section_id` (FK to checklist_sections), `title`, `notes`, `quantity`, `assignee_id` (FK to profiles), `is_completed` (BOOL), `completed_at`, `completed_by` (FK to profiles), `position`, `created_by`, timestamps.
7. `checklist_templates`: `id` (UUID PK), `owner_id` (FK to profiles), `name`, `description`, timestamps.
8. `template_sections`: `id` (UUID PK), `template_id` (FK to checklist_templates), `title`, `position`, `created_at`.
9. `template_items`: `id` (UUID PK), `template_id` (FK to checklist_templates), `section_id` (FK to template_sections), `title`, `notes`, `quantity`, `position`, `created_at`.
10. `activity_events`: `id` (UUID PK), `event_id` (FK to events), `actor_id` (FK to profiles), `event_type`, `details` (JSONB), `created_at`.

## Database-Level Defense: Permanent Completed-Event Lock
Enforced via PostgreSQL triggers:
- `prevent_reopening_completed_event()`: Prevents transitioning an event out of `status = 'completed'`. Reopening is permanently disallowed for the MVP.
- `check_event_not_locked()`: Attached to `checklist_sections`, `checklist_items`, and `event_members`. Rejects any `INSERT`, `UPDATE`, or `DELETE` if the parent event has `status = 'completed'`.
- Mirror verification on the application layer: Server Actions execute `assertEventNotCompleted()` prior to database transactions.

## Row Level Security (RLS)
Enabled on all 10 tables:
- `profiles`: SELECT allowed for authenticated users; updates restricted to own profile.
- `events`: SELECT allowed for participants; updates restricted to owner.
- `event_members`: SELECT allowed for event participants.
- `checklist_sections` & `checklist_items`: SELECT allowed for event participants.
- `checklist_templates`, `template_sections`, `template_items`: Scoped strictly to `owner_id = clerk_user_id`.
- `activity_events`: SELECT allowed for event participants.

## Authorization & Security Verification
Automated test suite in `tests/data-model-security.test.ts` validates:
- [x] Permanent completed-event lock throws `EVENT_LOCKED`.
- [x] Non-member access rejected with `FORBIDDEN`.
- [x] Unauthenticated access rejected with `UNAUTHORIZED`.
- [x] Revoked, inactive, or non-existent invite codes rejected safely with `INVALID_INVITE`.
- [x] Clerk profile synchronization sanitizes inputs and handles null/missing fields idempotently.
