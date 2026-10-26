# Phase 04 — Events & Invitations

## Goal
Implement event lifecycle basics and safe membership onboarding.

## Checklist
- [ ] Create event through a validated Server Action.
- [ ] Create owner membership atomically or with safe rollback behavior.
- [ ] List active, archived, and completed events with clear states.
- [ ] Implement event detail route with server-side membership authorization.
- [ ] Generate reusable invite code/link using a secure approach.
- [ ] Implement invite entry/join flow for signed-in users.
- [ ] Require authentication before joining and reveal no private event details before validation.
- [ ] Handle invalid, revoked, expired (if applicable), and duplicate invite attempts safely.
- [ ] Add rate limiting or documented abuse protection where feasible.
- [ ] Implement archive and restore with role checks.
- [ ] Add activity events for creation, join, archive, and restore.
- [ ] Add tests for event isolation, membership, invite validation, archive, and restore.
- [ ] Verify UI at mobile and desktop sizes.

## Exit gate
Event lifecycle and invitations work end-to-end; membership checks are enforced server-side and covered by negative tests.
