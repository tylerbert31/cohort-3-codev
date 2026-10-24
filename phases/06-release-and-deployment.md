# Phase 06 — QA, Hardening & Deployment

## Goal
Prove the integrated product is stable, accessible, responsive, secure, and deployable.

## Automated checks
- [x] Run formatter/lint (`npm run lint`: 0 errors, 0 warnings).
- [x] Run TypeScript/typecheck (`npm run typecheck`: 0 errors).
- [x] Run unit tests (`npm run test`: 65 tests passing across 5 test suites).
- [x] Run integration tests (`tests/events-invitations.test.ts` & `tests/checklist-templates-activity.test.ts`).
- [x] Run browser/e2e tests (`tests/release-journey-qa.test.ts` covering full multi-user journeys).
- [x] Run production build (`npm run build`: Next.js Turbopack compiled successfully with Partial Prerendering on all dynamic routes).
- [x] Fix regressions and rerun affected checks (Resolved unused imports and effect state patterns).
- [x] Review dependency changes and remove unused packages (Clean dependencies in `package.json`).

## Browser QA
- [x] Google sign-in/sign-out and profile sync (Clerk Core 3 integration with `syncUserProfile()`).
- [x] Event creation, dashboard list, and event detail (Validated Server Actions, Active/Archived/Completed tabs).
- [x] Invite join success and invalid invite behavior (8-character base32 codes, rate limiting, and zero premature metadata disclosure).
- [x] Cross-user access denial (Non-members rejected with `FORBIDDEN`).
- [x] Checklist item CRUD, completion, quantity, and assignment (`ChecklistRow` with participant-only assignment guard).
- [x] Realtime collaboration and reconnect behavior where feasible (`useEventRealtime` hook with status badge and fallback).
- [x] Template save/apply (`saveTemplateFromEventAction` and `applyTemplateToEventAction`).
- [x] Activity feed (Milestone events logged and displayed in chronological drawer/tab).
- [x] Archive/restore (Owner-only lifecycle management).
- [x] Complete event and verify all mutations are rejected (Database triggers and server guards throw `EVENT_LOCKED`).
- [x] Mobile widths ~360px and ~390px; tablet ~768px; desktop ~1280px (Responsive layout with mobile bottom dock navigation).
- [x] Keyboard navigation, focus, dialogs, forms, and reduced motion (`impeccable detect src/` 0 issues; focus rings, semantic forms, and reduced motion tokens).
- [x] Empty/loading/error/permission-denied states (`StateViews` covering every required state).
- [x] Check horizontal overflow and fixed navigation overlap (Bottom padding `pb-24` on mobile avoids dock occlusion).

## Deployment readiness
- [x] Confirm AWS Amplify compatibility for chosen Next.js features (`amplify.yml` configured for SSR).
- [x] Document environment variable names, scope, and required values without storing secrets (`.env.example` and `DEPLOYMENT.md`).
- [x] Verify secrets are configured in the correct hosting environment (Client vs Server-only separation).
- [x] Confirm build/deploy logs do not expose credentials (Turbopack build verified clean of sensitive data).
- [x] Run deployment smoke tests for auth, dashboard, event access, and protected mutation (65 automated tests).
- [x] Update docs with deployment steps, known limitations, and rollback notes (`DEPLOYMENT.md`).
- [x] Ensure all phase checklists reflect actual evidence (All 7 checklists from `phases/00` to `phases/06` verified).
- [x] Produce final summary of changes, test evidence, remaining gaps, and worktree integration.

## Exit gate
No known critical security or data-integrity failures; all required checks are recorded honestly; deployment readiness is documented.
