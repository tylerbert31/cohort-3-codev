# Phase 05 — Checklist, Templates & Activity

## Goal
Deliver collaborative checklist workflows and the permanent completion lock.

## Checklist
- [ ] Create, edit, reorder, and remove checklist sections.
- [ ] Create, edit, reorder, complete, and remove checklist items.
- [ ] Support optional quantity and optional assignee.
- [ ] Enforce that assignees are eligible event participants.
- [ ] Implement shared state and Supabase Realtime where useful.
- [ ] Reconcile stale cache, duplicate events, and reconnects safely.
- [ ] Show useful progress without making the interface noisy.
- [ ] Save personal templates and edit template contents.
- [ ] Apply templates by copying content into the target event.
- [ ] Prevent template application from corrupting existing event data.
- [ ] Implement important activity feed events with safe metadata.
- [ ] Complete an event and permanently lock it.
- [ ] Reject create/update/delete/assignment/completion mutations after completion.
- [ ] Ensure UI is clearly read-only after completion; server remains authoritative.
- [ ] Test all checklist, template, activity, and completed-lock paths.
- [ ] Review optimistic updates and rollback/error handling.
- [ ] Run `/impeccable` review on the implemented core flows and address major findings.

## Exit gate
Shared checklist, templates, activity, archive behavior, and permanent completion lock work and are covered by tests.
