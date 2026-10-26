# Product Requirements Document

## 1. Overview
A collaborative outing and packing checklist app. Authenticated users create private events, invite other people, organize items, coordinate assignments, and track completion together.

## 2. User types
- **Signed-in user:** can create events, manage events they own, participate in events they joined, maintain personal templates, and view their own profile.
- **Event owner/authorized manager:** can manage event settings and invitations, subject to the permission model defined in `DATABASE.md`.
- **Event participant:** can view and update allowed checklist data for events they belong to, unless the event is completed/locked.
- **Unauthenticated visitor:** can only access public sign-in/onboarding surfaces. An invite link must not reveal private event data before authentication and membership validation.

## 3. Core journeys
### A. Sign in
1. User chooses Continue with Google.
2. Clerk handles authentication.
3. On successful sign-in, the app synchronizes the user's Clerk ID, first name, last name, and profile image URL to Supabase using a trusted server-side path.
4. User lands on the dashboard.

### B. Create an event
1. User creates an event with a name and relevant event details.
2. The system creates the owner membership and a reusable invite code/link.
3. The event appears on the dashboard.
4. Owner can add sections and checklist items.

### C. Join an event
1. User opens an invite link or enters an invite code.
2. If signed out, user is asked to authenticate before joining.
3. The server validates the code and membership rules.
4. User becomes a participant and can access the event only after membership is confirmed.
5. Invalid, expired/revoked, or unauthorized invite attempts return safe, actionable errors without leaking event details.

### D. Manage a shared checklist
1. Participant views grouped checklist sections.
2. Participant can add, edit, complete, and remove items within permissions.
3. Items can have an optional quantity and optional assignee.
4. Changes are persisted through server-authorized mutations and reflected for other participants.
5. Realtime updates should handle duplicate/out-of-order notifications gracefully; the database remains authoritative.

### E. Templates
1. User saves a useful checklist as a personal template or builds one from scratch.
2. User can apply a template when creating/editing an event.
3. Applying a template copies its content; it does not create unintended shared references.

### F. Archive and restore
1. Authorized user archives an event.
2. Archived events are separated from active events.
3. Authorized user can restore an archived event unless its lifecycle rules prohibit restoration.
4. Archiving does not erase event history or bypass authorization.

### G. Complete an event
1. Authorized user marks an event completed.
2. The server enforces the terminal locked state.
3. No participant can create, update, delete, assign, or complete checklist items after completion.
4. UI presents the event as read-only and clearly communicates why actions are disabled.
5. Treat completion as permanent for the MVP; no reopen action.

### H. Activity feed
Record important actions such as event creation, participant joining, checklist item creation/update/completion/deletion, assignment changes, archive/restore, and event completion. Avoid noisy events for trivial UI interactions. Do not expose secrets or invite tokens in activity text.

## 4. Functional requirements
- Clerk authentication with Google OAuth only.
- Profile synchronization to Supabase: Clerk user ID, first name, last name, profile-image URL.
- Private events and membership-based access.
- Reusable invite code/link with server-side validation and abuse-resistant handling.
- Grouped checklist sections and items.
- Optional item quantity and assignee.
- Shared updates with appropriate Supabase Realtime subscriptions.
- Personal checklist templates.
- Event archive and restore.
- Activity feed for important events.
- Permanent read-only lock after event completion.
- Loading, empty, error, offline/reconnect, and permission-denied states.
- Responsive mobile, tablet, and desktop layouts.

## 5. Non-functional requirements
- Authorization is enforced server-side and at the database boundary; never rely on hidden UI controls.
- Validate all untrusted input on the server.
- Avoid leaking whether a private event exists to an unauthorized visitor.
- Keep secrets server-only.
- Use accessible labels, focus states, semantic structure, and sufficient contrast.
- Respect `prefers-reduced-motion`.
- Keep interactions performant on mobile devices.
- Include tests for permission boundaries and the completed-event lock.
- Do not add unrequested product scope without documenting the rationale and obtaining approval.

## 6. Explicit exclusions for MVP
- No alternate authentication provider or email/password sign-in; Google OAuth through Clerk only.
- No public browsing of private events.
- No reopening completed events.
- No client-side privileged Supabase credentials.
- No UI-only security controls.
- No animation added solely for decoration.

## 7. Acceptance criteria
- A user cannot read or mutate an event unless authorized as a member.
- Invite joining is validated server-side and does not reveal private event information prematurely.
- Checklist mutations are reflected reliably for authorized participants.
- Completed events reject all mutation attempts at the server/database layer.
- Archive/restore preserves the expected event data and authorization.
- Templates can be saved and applied without cross-event data corruption.
- Browser QA passes core journeys at mobile and desktop breakpoints.
