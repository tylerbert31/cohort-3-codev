# Phase 05 — Checklist, Templates & Activity

## Goal
Deliver collaborative checklist workflows and the permanent completion lock.

## Checklist
- [x] Create, edit, reorder, and remove checklist sections (`createSectionAction`, `updateSectionAction`, `deleteSectionAction` in `src/server/actions/checklist.ts`).
- [x] Create, edit, reorder, complete, and remove checklist items (`createItemAction`, `updateItemAction`, `toggleItemCompletionAction`, `deleteItemAction`).
- [x] Support optional quantity and optional assignee (`quantity` chip, `assignee_id` linked to profile in `ChecklistRow`).
- [x] Enforce that assignees are eligible event participants (Server-side validation in `EventsRepository.createItem` and `updateItem` rejects non-members with `FORBIDDEN`).
- [x] Implement shared state and Supabase Realtime where useful (`useEventRealtime` hook in `src/lib/supabase/use-event-realtime.ts`).
- [x] Reconcile stale cache, duplicate events, and reconnects safely (Optimistic state with fallback `router.refresh()` on error).
- [x] Show useful progress without making the interface noisy (Overall progress bar and per-section item counts in `EventView`).
- [x] Save personal templates and edit template contents (`saveTemplateFromEventAction`, `createTemplateAction`, `deleteTemplateAction`, `/templates` route).
- [x] Apply templates by copying content into the target event (`applyTemplateToEventAction`).
- [x] Prevent template application from corrupting existing event data (Appends cloned sections/items, isolated from source template).
- [x] Implement important activity feed events with safe metadata (`ActivityEvent` recorded for sections, items, assignments, completion, archive, restore).
- [x] Complete an event and permanently lock it (`completeEventAction` with irreversible status update).
- [x] Reject create/update/delete/assignment/completion mutations after completion (Strict database trigger and application assertion `assertEventNotCompleted` throws `EVENT_LOCKED`).
- [x] Ensure UI is clearly read-only after completion; server remains authoritative (`LockedEventBanner`, disabled checkboxes and buttons).
- [x] Test all checklist, template, activity, and completed-lock paths (21 new tests in `tests/checklist-templates-activity.test.ts`, 57/57 tests passing across the project).
- [x] Review optimistic updates and rollback/error handling (Optimistic UI in `EventView` rolls back on server action rejection).
- [x] Run `/impeccable` review on the implemented core flows and address major findings (`impeccable detect src/` reported 0 findings).

## Exit gate
Shared checklist, templates, activity, archive behavior, and permanent completion lock work and are covered by tests.
