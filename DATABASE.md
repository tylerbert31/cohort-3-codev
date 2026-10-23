# Database & Authorization Design

Use Supabase PostgreSQL as the source of truth. Use the installed Supabase MCP to inspect the connected project, review current schema/migrations, and apply schema changes through the project's supported workflow. Do not assume the database is empty.

## Core entities (proposed; reconcile with existing schema before migration)
- `profiles`: `clerk_user_id` (unique external identity), `first_name`, `last_name`, `image_url`, timestamps.
- `events`: owner, name, event details, lifecycle status, archived timestamp, completed timestamp, created/updated timestamps.
- `event_members`: event, profile/user identity, role, join timestamp.
- `event_invites`: event, invite code/token hash, status/revocation metadata, creator, timestamps. Store secrets/tokens safely; never log raw invite secrets.
- `checklist_sections`: event, title, ordering metadata, timestamps.
- `checklist_items`: event/section, title, optional notes, optional quantity, optional assignee, completion state, ordering metadata, creator, timestamps.
- `checklist_templates`: owner, name, optional description, timestamps.
- `template_sections` and `template_items` (or a documented JSON representation if justified): normalized template content.
- `activity_events`: event, actor, event type, safe structured metadata, timestamp.

Names and types are proposals, not permission to overwrite existing production data. Inspect the live schema first and create migrations that preserve existing data.

## Authorization requirements
- Clerk is the only auth provider. The Clerk user ID is the canonical identity key.
- Never trust a client-supplied user ID, role, owner ID, or event membership claim.
- Every server action derives the authenticated Clerk user ID from the trusted Clerk server SDK.
- Validate event membership and role for every read/mutation where required.
- Completed events are permanently locked: enforce this in trusted mutation logic and, where feasible, database policies/constraints/RPCs so an overlooked code path cannot bypass the lock.
- Ensure unauthorized users cannot access private event rows, related items, activity, or participant information.
- Validate invite codes on the server, rate-limit or otherwise protect brute-forceable endpoints where the stack permits, and avoid leaking event details in errors.
- Apply least privilege to service credentials. Never expose service-role credentials to browser code.
- Use Supabase RLS as a defense-in-depth boundary for direct client access and Realtime. If using a server-only data access pattern, document the exact trusted boundary and ensure no browser-accessible key can bypass RLS. Do not silently disable RLS as a shortcut.

## Clerk profile synchronization
- Upsert profile data from a trusted server-side path after authentication or through a verified Clerk webhook.
- Persist Clerk ID, first name, last name, and profile-image URL.
- Handle absent first/last names and changed profile images.
- Avoid accepting arbitrary profile identity fields from the browser.
- Ensure webhook verification if webhooks are used; make sync idempotent.

## Realtime
- Subscribe only to data the current user is authorized to see.
- Re-check membership and lifecycle constraints on server mutations; Realtime is not authorization.
- Handle reconnect, duplicate notifications, and stale cached data.
- Prefer invalidation/refetch or safe reconciliation over assuming events always arrive exactly once.

## Migration process
1. Inspect project/schema using Supabase MCP.
2. Record existing tables, policies, functions, triggers, and migration state.
3. Draft a migration and review destructive operations.
4. Apply through the repository's migration workflow; do not make undocumented dashboard-only schema edits.
5. Verify schema and policies after migration.
6. Test positive and negative authorization cases.
7. Update this file if the final schema differs from this proposal.
