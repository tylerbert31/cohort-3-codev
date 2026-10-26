# Phase 03 — App Foundation & Authentication

## Goal
Deliver a stable app shell and Clerk Google authentication.

## Checklist
- [ ] Align repository structure with `ARCHITECTURE.md` without unnecessary churn.
- [ ] Configure Clerk with Google OAuth as the only login method.
- [ ] Implement sign-in, sign-out, callback, and protected route handling.
- [ ] Synchronize Clerk user ID, first name, last name, and image URL to Supabase through a trusted server path.
- [ ] Handle missing profile fields and profile image changes.
- [ ] Ensure profile synchronization is idempotent and failures are observable without leaking secrets.
- [ ] Implement dashboard shell and responsive navigation.
- [ ] Add typed server data access and consistent safe error handling.
- [ ] Configure query/cache conventions and TanStack React Query only where useful.
- [ ] Validate environment variable presence without logging values.
- [ ] Add tests for auth boundaries and profile sync.
- [ ] Verify production build and auth smoke test.

## Exit gate
Google sign-in works, protected routes are protected, profile data syncs safely, and baseline checks pass.
