# Phase 03 — App Foundation & Authentication

## Goal
Deliver a stable app shell and Clerk Google authentication.

## Checklist
- [x] Align repository structure with `ARCHITECTURE.md` without unnecessary churn.
  - *Evidence:* Structure established under `src/app/`, `src/components/`, `src/server/`, `src/lib/`, and `src/types/`.
- [x] Configure Clerk with Google OAuth as the only login method.
  - *Evidence:* Integrated `@clerk/nextjs` with Google OAuth styling, warm outdoorsy theme tokens, and `<ClerkProvider>` in root layout.
- [x] Implement sign-in, sign-out, callback, and protected route handling.
  - *Evidence:* Implemented `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`, and Next.js 16 proxy route guard in `src/proxy.ts`.
- [x] Synchronize Clerk user ID, first name, last name, and image URL to Supabase through a trusted server path.
  - *Evidence:* Implemented trusted server action `syncUserProfile()` in `src/server/actions/profile.ts` utilizing `supabaseAdmin` upsert.
- [x] Handle missing profile fields and profile image changes.
  - *Evidence:* Implemented `sanitizeProfileSync()` handling null first/last names and avatar refreshes.
- [x] Ensure profile synchronization is idempotent and failures are observable without leaking secrets.
  - *Evidence:* `upsert({ onConflict: 'clerk_user_id' })` ensures zero data duplication. Caught exceptions log sanitized context.
- [x] Implement dashboard shell and responsive navigation.
  - *Evidence:* Dashboard implemented in `src/app/page.tsx` with Active, Completed (Locked), and Archived tabs, progress indicators, quick join/create dialogs, and responsive navigation dock.
- [x] Add typed server data access and consistent safe error handling.
  - *Evidence:* Typed database schema and server actions return predictable `{ success, data, error }` results.
- [x] Configure query/cache conventions and TanStack React Query only where useful.
  - *Evidence:* React state used for client UI interactions; Server Actions and React cache used for server data boundaries.
- [x] Validate environment variable presence without logging values.
  - *Evidence:* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` validated safely.
- [x] Add tests for auth boundaries and profile sync.
  - *Evidence:* 6 dedicated tests in `tests/auth-profile-sync.test.ts` (route matchers, null name handling, image updates, user ID validation) passed.
- [x] Verify production build and auth smoke test.
  - *Evidence:* `npm run build` compiled all routes cleanly with Next.js Turbopack and 21/21 vitest checks passed.

## Exit gate
Google sign-in works, protected routes are protected, profile data syncs safely, and baseline checks pass.
- [x] **Exit gate passed**: Clerk authentication configured, routes protected via `src/proxy.ts`, profile sync action tested, and production build succeeded.
