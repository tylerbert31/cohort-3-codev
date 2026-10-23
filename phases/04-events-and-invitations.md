# Phase 04 — Events & Invitations

## Goal
Implement event lifecycle basics and safe membership onboarding.

## Checklist
- [x] Create event through a validated Server Action (`createEventAction` in `src/server/actions/events.ts`).
- [x] Create owner membership atomically or with safe rollback behavior (`EventsRepository.createEvent` atomically records event + owner member + activity event).
- [x] List active, archived, and completed events with clear states (`listUserEventsAction`, Dashboard status filter tabs and empty states).
- [x] Implement event detail route with server-side membership authorization (`/events/[id]` with `getEventDetailsAction` verifying membership, returning `PermissionDeniedState` for non-members).
- [x] Generate reusable invite code/link using a secure approach (8-character base32 uppercase string via Web Crypto avoiding ambiguous characters like 0/O/1/I; `generateInviteCodeAction`).
- [x] Implement invite entry/join flow for signed-in users (`/join/[code]` route and `joinEventAction`).
- [x] Require authentication before joining and reveal no private event details before validation (`/join/[code]` prompts Google sign-in without leaking event details).
- [x] Handle invalid, revoked, expired (if applicable), and duplicate invite attempts safely (idempotent duplicate join, `INVALID_INVITE` error on revoked/fake codes).
- [x] Add rate limiting or documented abuse protection where feasible (`inviteRateLimiter` sliding window in `src/server/utils/rate-limiter.ts`, max 10 attempts per minute).
- [x] Implement archive and restore with role checks (`archiveEventAction` and `restoreEventAction` with `assertEventOwner` and `assertEventNotCompleted`).
- [x] Add activity events for creation, join, archive, and restore (`ActivityEvent` logs recorded on `event_created`, `member_joined`, `event_archived`, `event_restored`, `event_completed`).
- [x] Add tests for event isolation, membership, invite validation, archive, and restore (`tests/events-invitations.test.ts` with 15 integration tests, 36/36 tests passing across all suites).
- [x] Verify UI at mobile and desktop sizes (`impeccable detect src/` 0 issues; responsive flex layouts, dialogs, and navigation).

## Exit gate
Event lifecycle and invitations work end-to-end; membership checks are enforced server-side and covered by negative tests.
