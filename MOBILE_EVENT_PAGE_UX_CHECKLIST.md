# Mobile Event Page UX Overhaul — Implementation Checklist

**Status:** Planned — implementation not started  
**Route in scope:** `/events/[id]` (trip detail / packing checklist)  
**Primary target:** Mobile web at 320–430 CSS px, then tablet and desktop  
**Related files:** `src/app/events/[id]/event-view.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/checklist-row.tsx`, `src/components/layout/app-shell.tsx`, `src/app/globals.css`

## 1. Screenshot evaluation

Reviewed the supplied 424 × 876 mobile screenshot. The problem is not simply an unattractive color palette; the screen has weak hierarchy, overloaded action areas, repeated component surfaces, and at least one apparent navigation clipping defect.

### Observed issues

- [ ] **Critical — trip tabs are clipped.** The first tab appears to show only `t` beside its count instead of “Packing List”. Diagnose the actual scroll/width behavior; do not merely shrink the font until labels fit.
- [ ] **Critical — repeated item-creation affordances compete.** The checklist has a global “Add Item” control, another “Add Item” control in each section header, and a dashed quick-add row inside sections. Their distinct purposes are not visually clear.
- [ ] **High — cramped section headers.** “General Items (No Category)” wraps to multiple lines while its count and “Add Item” action are squeezed into the same row. Section controls wrap awkwardly and compete with the title.
- [ ] **High — too many nested surfaces.** The section container, inner item card, borders, and dashed quick-add container create several boxed layers with similar visual weight. The content reads as a stack of generic cards rather than one coherent checklist.
- [ ] **High — typography is too small and low-contrast for the task.** Filter labels, item metadata, section counts, and actions appear tiny or visually secondary. A packing list should prioritize item names and completion state.
- [ ] **High — icon-plus-label repetition adds clutter.** Plus icons repeatedly precede “Add Category”, “Add Item”, and “Add item to General Items…”. Other icons add weight to labels without helping users distinguish actions.
- [ ] **High — action hierarchy is unclear.** Invite, overflow actions, global item/category actions, section-specific actions, and quick-add all compete. Only one primary checklist action should dominate at a time.
- [ ] **Medium — terminology is verbose and inconsistent.** “General Items (No Category)”, “Cohort Members”, “Activity Feed”, “Group packing progress”, and “items packed” use different levels of detail. Use concise, consistent language on narrow screens.
- [ ] **Medium — section progress is hard to scan.** Compact `(0/1)` counters are visually detached from the section title and easy to miss. Present them as clear secondary status, e.g. “0 of 1 packed”.
- [ ] **Medium — sticky navigation needs overlap checks.** The screenshot shows the global header over the scrolled trip hero. Verify the top bar never obscures interactive controls during initial load, scroll, tab changes, or dialog dismissal.
- [ ] **Medium — bottom navigation competes with the checklist viewport.** Confirm the last checklist item and its actions can scroll fully above the fixed bottom bar, including on devices with a home-indicator safe area.

## 2. Design direction

Keep Cohort’s “Trailhead Field Notes” identity, but make the event page feel like a purposeful mobile utility rather than a collection of desktop cards scaled down.

- [ ] Establish one explicit hierarchy: **trip identity → overall readiness → checklist navigation → filters → sections → items**.
- [ ] Use typography, spacing, and surface contrast for hierarchy; do not rely on more borders, badges, icons, or decorative details.
- [ ] Reserve the dark evergreen treatment for the trip identity area and selected/primary states. Keep the checklist canvas calm and light.
- [ ] Use one primary action per context. Make secondary actions quiet and put infrequent actions in the overflow menu.
- [ ] Use icon-only buttons only for universally recognizable compact actions (for example, overflow or delete), with an accessible name and a minimum 44 × 44 px hit area. Prefer concise text where the action is not self-evident.
- [ ] Avoid icon-plus-label pairs repeated in every section. Remove decorative icons when adjacent text already communicates the meaning.
- [ ] Reuse the established design tokens in `src/app/globals.css`; do not introduce a parallel set of one-off colors, radii, or shadows.
- [ ] Preserve the current data model, permissions, Clerk session handling, Supabase Realtime updates, server actions, item metadata, and completed-trip lock behavior.

## 3. Implementation checklist

### P0 — Fix usability defects and mobile information architecture

- [ ] Diagnose and fix the clipped event tabs. At 320–430 px, active and inactive labels must remain readable and selectable. Prefer concise mobile labels (e.g. **List**, **People**, **Activity**) with desktop labels retained where useful. Counts must never push a label out of view.
- [ ] Make tab behavior deterministic: no stale horizontal scroll position after switching tabs, no active tab partially off-screen, and no content wider than the viewport.
- [ ] Simplify the checklist action model. Decide which action owns each task:
  - [ ] One clear global entry point for adding an unsectioned item.
  - [ ] One clear entry point for adding an item to a specific section.
  - [ ] One clear entry point for adding a category.
  - [ ] Remove or redesign redundant entry points; retain quick-add only if its speed benefit and distinction from the detailed item form are clear.
- [ ] Redesign the section header as a responsive grid, not a single crowded flex row. The title gets the flexible area; progress and actions must keep their own space and never overlap or wrap into broken two-line controls.
- [ ] Shorten the uncategorized section title to **General items** in the interface. Do not change stored data solely to achieve the shorter label.
- [ ] Verify that the sticky top bar and fixed bottom navigation do not cover buttons, tabs, checklist rows, error alerts, or dialog content. Add appropriate scroll offsets and safe-area padding where needed.

### P1 — Rebuild checklist visual hierarchy

- [ ] Increase item title prominence and readability. Target 15–16 px or larger for primary item names, with comfortable line height and wrapping for long names.
- [ ] Establish a consistent type scale for page title, section title, item name, supporting metadata, count, and controls. Avoid using 11–12 px text for frequently read labels or primary actions.
- [ ] Remove nested “card inside card” styling. Use a section container with simple separated rows/dividers; make checklist rows visually part of the section instead of independent competing panels.
- [ ] Redesign each section header with a predictable layout:
  - [ ] Section title on the first line.
  - [ ] A concise progress label or count adjacent to the title or on a clearly aligned second line.
  - [ ] Secondary actions aligned to a stable trailing edge, using compact accessible controls on mobile.
- [ ] Make item completion state obvious without reducing the contrast of the whole row too heavily. Checkboxes should be easy to hit; completed titles should remain readable.
- [ ] Reduce redundant decorative icons. Keep only icons that improve recognition, status comprehension, or action discovery.
- [ ] Normalize section and item spacing. Use consistent vertical rhythm and avoid large empty gaps between controls and the first item.
- [ ] Refine the filter segmented control: consistent 44 px minimum control height, readable labels, clear selected state, and usable behavior at narrow widths.
- [ ] Align buttons consistently. Avoid “Add Item” wrapping onto two lines or separating its icon and label. If a compact icon-only action is used, add a meaningful `aria-label` and visible focus state.
- [ ] Use a consistent presentation for section progress, overall progress, and member counts. Labels should be short, understandable, and visually subordinate to the task content.
- [ ] Verify long trip names, long section names, long item names, long destinations, missing dates, zero items, and large counts.

### P2 — Polish interaction and accessibility

- [ ] Add clear pressed, hover (where applicable), focus-visible, disabled, loading, and success/error states to redesigned controls.
- [ ] Ensure each icon-only button has an accessible name; decorative icons are hidden from assistive technology.
- [ ] Verify tab roles, `aria-selected`, keyboard navigation, focus visibility, and tab-panel associations. Keep labels visible; do not use clipped text as a substitute for responsive design.
- [ ] Keep all frequent mobile actions within reachable, sufficiently large touch targets; separate destructive delete controls from completion and edit interactions.
- [ ] Check that action error messages are not hidden behind the top bar or bottom navigation and do not obscure the primary task.
- [ ] Ensure the completed/locked trip state has the same improved layout without exposing disabled controls as if they were actionable.
- [ ] Respect `prefers-reduced-motion` and maintain sufficient contrast for muted text, borders, and selected/disabled states.

## 4. Suggested component-level work

- [ ] `src/app/events/[id]/event-view.tsx`: event header, progress block, secondary tabs, filter/action toolbar, category/section headers, and mobile-safe spacing.
- [ ] `src/components/ui/tabs.tsx`: responsive label strategy, active-tab visibility, count sizing, tab focus and overflow behavior. Check other pages using this shared component before introducing route-specific variants.
- [ ] `src/components/ui/checklist-row.tsx`: hierarchy, border/surface treatment, title size, metadata density, checkbox sizing, and compact delete affordance.
- [ ] `src/components/layout/app-shell.tsx`: mobile top-bar height/behavior, fixed bottom navigation safe area, and content clearance.
- [ ] `src/app/globals.css`: only if reusable tokens/utilities are required; avoid adding a second design system.

## 5. Acceptance criteria

- [ ] At 320, 360, 375, 390, and 424 px viewport widths, no event tab label, count, title, or action is clipped, overlapped, or unintentionally truncated.
- [ ] At 424 × 876, the checklist screen has a clear primary action, one obvious way to add an item to each scope, section titles and progress that scan in one glance, and no redundant row of similar boxed surfaces.
- [ ] Item titles are comfortably readable without zooming; controls stay usable with one hand and do not require precise taps.
- [ ] The last item/action can be scrolled clear of the bottom navigation and safe-area inset.
- [ ] At 768 px and desktop widths, the mobile solution adapts cleanly without unnecessarily constraining the wider layout.
- [ ] Adding, editing, completing, assigning, and deleting items still works. Category actions, invite generation/revocation, templates, realtime updates, filters, activity, archive, completion lock, and error recovery remain functional.
- [ ] Keyboard-only interaction and screen-reader labels are checked for tabs, checkbox, add, edit, delete, invite, and overflow actions.
- [ ] Capture before/after screenshots at 320, 375/390, and 424 px and at one desktop width. Review both the page top and a scrolled checklist position.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. Record results in the PR before it is marked ready for review.

## 6. Reference guidance

Use these as usability constraints and inspiration, not as templates to copy:

- [Apple Human Interface Guidelines — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): use short, clear action labels; avoid overusing prominent controls; ensure sufficiently large hit regions.
- [Apple Human Interface Guidelines — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): labels should clearly identify navigation destinations and stay short enough to scan.
- [Android Developers — Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns): keep secondary navigation distinct from primary actions and move infrequent actions into menus.
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): make deliberate design choices, critique visual hierarchy, and avoid generic component styling.

---

**Definition of done:** every P0 item is completed before visual polish is considered done; P1/P2 items and acceptance checks are completed before the PR is moved out of draft.
