# Phase 06 — QA, Hardening & Deployment

## Goal
Prove the integrated product is stable, accessible, responsive, secure, and deployable.

## Automated checks
- [ ] Run formatter/lint.
- [ ] Run TypeScript/typecheck.
- [ ] Run unit tests.
- [ ] Run integration tests.
- [ ] Run browser/e2e tests.
- [ ] Run production build.
- [ ] Fix regressions and rerun affected checks.
- [ ] Review dependency changes and remove unused packages.

## Browser QA
- [ ] Google sign-in/sign-out and profile sync.
- [ ] Event creation, dashboard list, and event detail.
- [ ] Invite join success and invalid invite behavior.
- [ ] Cross-user access denial.
- [ ] Checklist item CRUD, completion, quantity, and assignment.
- [ ] Realtime collaboration and reconnect behavior where feasible.
- [ ] Template save/apply.
- [ ] Activity feed.
- [ ] Archive/restore.
- [ ] Complete event and verify all mutations are rejected.
- [ ] Mobile widths ~360px and ~390px; tablet ~768px; desktop ~1280px.
- [ ] Keyboard navigation, focus, dialogs, forms, and reduced motion.
- [ ] Empty/loading/error/permission-denied states.
- [ ] Check horizontal overflow and fixed navigation overlap.

## Deployment readiness
- [ ] Confirm AWS Amplify compatibility for chosen Next.js features.
- [ ] Document environment variable names, scope, and required values without storing secrets.
- [ ] Verify secrets are configured in the correct hosting environment.
- [ ] Confirm build/deploy logs do not expose credentials.
- [ ] Run deployment smoke tests for auth, dashboard, event access, and protected mutation.
- [ ] Update docs with deployment steps, known limitations, and rollback notes.
- [ ] Ensure all phase checklists reflect actual evidence.
- [ ] Produce final summary of changes, test evidence, remaining gaps, and worktree integration.

## Exit gate
No known critical security or data-integrity failures; all required checks are recorded honestly; deployment readiness is documented.
