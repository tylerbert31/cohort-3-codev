# Architecture

## Stack
- Next.js + TypeScript.
- Clerk authentication, Google OAuth only.
- Supabase PostgreSQL and Realtime.
- TanStack React Query for client-side server-state caching where useful.
- Next.js Server Actions as the default mutation boundary in `src/server/actions/`.
- AWS Amplify as the primary deployment target.
- Framer Motion, GSAP/ScrollTrigger, and Lenis are available candidates, not mandatory dependencies for every view.

## Suggested structure
```text
src/
  app/
    (auth)/
    (dashboard)/
    events/
    templates/
  components/
    ui/
    layout/
    events/
    checklist/
    templates/
  server/
    actions/
    auth/
    db/
    services/
    validation/
  lib/
    clerk/
    supabase/
    query/
    utils/
  types/
supabase/
  migrations/
tests/
  unit/
  integration/
  e2e/
phases/
```
Adapt to the existing repository rather than forcing this exact tree if it already has a sound convention.

## Trust boundaries
- Browser: UI, form interaction, safe public configuration, authorized client subscriptions if configured correctly.
- Server Actions: authenticate with Clerk, validate input, authorize membership/role, enforce lifecycle state, execute mutations, return typed safe results.
- Supabase: persistence, indexes, constraints, RLS/policies, functions/triggers as appropriate, Realtime.
- Never place service-role keys in `NEXT_PUBLIC_*` variables or client bundles.
- Avoid duplicating business rules across UI and server; UI communicates permissions but server enforces them.

## Server Action conventions
- Keep mutations in `src/server/actions/`.
- Validate inputs with a schema validation library already in the repository; add one only if needed.
- Return predictable typed success/error results.
- Avoid leaking internal exception details to users.
- Revalidate or invalidate relevant server/client caches after mutations.
- Keep each action focused and testable.
- Verify auth, membership, role, and event lock for each protected mutation.

## Query/caching conventions
- Use TanStack React Query for client-owned server state, cache invalidation, and mutation lifecycle where appropriate.
- Avoid adding React Query wrappers around data that is simpler and safer to load on the server.
- Keep query keys centralized and scoped by event/user where needed.
- Realtime events should update or invalidate relevant queries without exposing unauthorized data.

## Deployment
- Primary target: AWS Amplify.
- Verify Next.js features used are supported by the selected Amplify hosting/runtime configuration.
- Validate required environment variables during build/startup without printing values.
- Document environment variable names and which are public/server-only.
- Include a deployment smoke test for auth callback, dashboard, event reads, and a protected mutation.
