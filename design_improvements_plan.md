# Design Improvements Plan: cohort UI Overhaul

Branch: `feature/08-ui-overhaul` · Worktree: `../cohort_individual-ui-overhaul`
Source: `/impeccable critique` (dual-agent: design review + detector), 2026-10-24

---

## 1. Critique Summary

**Design Health Score: 22/40 (Acceptable).** The base is solid, but users won't be happy until significant improvements land.

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | `ReconnectingBanner` is never rendered. Only the "connected" state shows. |
| 2 | Match system / real world | 2 | Event, Outing and Trip are used interchangeably. Activity feed entries don't say who did what. |
| 3 | User control & freedom | 1 | Deleting an item, deleting a template and revoking an invite all happen instantly, with no confirm and no undo. |
| 4 | Consistency & standards | 2 | The "New Item" button and the FAB both create an *event*. The two tab styles differ. Colors mix tokens and arbitrary `var()` values. |
| 5 | Error prevention | 2 | "Complete" is styled as a destructive red action. |
| 6 | Recognition over recall | 2 | Dashboard cards hide progress even though it's already fetched. Dates show as raw ISO strings. |
| 7 | Flexibility & efficiency | 1 | Every item goes through a 4-field modal. There is no quick-add and no "my items" view. |
| 8 | Aesthetic & minimalist | 3 | Clean but flat. Every card has the same weight, and badges add noise. |
| 9 | Error recovery | 2 | One generic error box at the top of the page, far from where the error happened. |
| 10 | Help & docs | 2 | Invite codes and locking are never explained before the user commits. |

**Design specificity verdict: generic.** Only the palette and some placeholder copy say "outdoor trip". Everything else is the default shadcn SaaS look: white `rounded-2xl` cards with hairline border and `shadow-xs`, a system font, pill badges, an icon-in-a-square logo, and muted `text-xs` metadata. Swap the hex values and it could be a CRM.

**Detector:** `impeccable detect src` returned 0 findings. Manual grep found:
- 15× `rounded-2xl/3xl`
- 27× shadows, including on buttons and badges
- Text sizes skewed small: 81 uses of xs/sm against 9 of base
- No font declared anywhere, and no `next/font`
- Clerk hex values duplicated in `layout.tsx:22-23`

The clean detector run and the generic verdict don't conflict. The code avoids the banned patterns, but it has no identity of its own.

### Priority issues
| Sev | Issue |
|-----|-------|
| **P0** | **Undefined tokens.** `--color-canvas-card`, `terracotta-200/600`, `locked-badge` and `locked-ink` don't exist, so the event header, section, template and join cards render transparent and the locked progress bar is invisible. The `touch-target` utility doesn't exist either, so the share button, mobile nav and dialog close are under 44px. |
| **P0** | **Item delete is hover-only** (`opacity-0`, `event-view.tsx:744`). Mobile users can't delete items, and there is no undo anywhere. |
| **P1** | **Shell primary action is mislabelled** ("New Item" creates an event), and the event page has no mobile FAB. |
| **P1** | **The event screen shows 7+ actions before the first checkbox.** Completion is framed as danger ("In accordance with trip completion rules…"). |
| **P2** | **Dashboard cards hide progress and trip dates.** The brand is split between cohort, "Outing Checklist" and "Outing & Packing Checklist". |
| **P2** | **A11y gaps:** tabs aren't a `tablist`, the dialog has no focus trap or focus restore, select labels aren't associated, errors aren't announced, and `ink-subtle` text is about 3:1 contrast. |
| **P3** | **No typographic identity.** Section h3 is `text-base`. The templates meta row has mojibake (`�?�`). |

---

## 2. Direction: "Trailhead Field Notes"

> [!IMPORTANT]
> This is a **redesign**, not a polish. Keep product truth, data, routes, functions and a11y affordances. Treat the current look as evidence only. Choices marked ⚑ are proposals awaiting confirmation (see §7).

**Scene:** A friend group on a phone at the trailhead, the night before or the morning of the trip, asking "what am I bringing, and did someone already pack the stove?" The tool should feel like a **well-kept expedition logbook**: tactile, confident, legible in sunlight, quietly warm.

**Mode:** Operate (dashboard, event, templates). The join page is a small Persuade moment.

**Principles**
1. **The trip has a face.** Each trip leads with its destination, a date countdown and the group's avatars, not a row of metadata.
2. **Typing into a list, not filling out forms.** Adding an item is inline. Details are optional.
3. **The group is first-class.** Activity, assignment and progress always name a person.
4. **Finishing is a memory, not a lock.** Completion becomes "Wrap up trip" with a recap.
5. **One primary action per screen.** Everything else goes into overflow.

### Visual system ⚑
| Layer | Current | Proposed |
|---|---|---|
| Display type | system-ui bold | **Fraunces** (variable, soft optical sizes) for trip titles and headers, via `next/font` |
| UI/body type | system-ui | **Inter Tight** or **Geist** at 16px base, tabular figures for counts and dates |
| Mono | default | **JetBrains Mono** for invite codes and quantities |
| Scale | 7 ad-hoc steps, xs-heavy | Modular 1.25 scale: 13 / 15 / 16 / 20 / 25 / 31 / 39. Metadata never goes below 13px. |
| Ground | `#FAF8F5` + white cards | Parchment canvas, with "paper" panels separated by **ruled dividers** and tonal fills instead of shadow and border on every card |
| Color | Pine primary, amber/terracotta/slate status | Keep the hues but re-tune them in OKLCH. Pine stays the single action color, amber means "needs attention", and slate stays "locked". Add a **topo-line** accent pattern (SVG, about 4% opacity) only on trip hero headers. |
| Radius | 2xl everywhere | 6px controls, 10px panels, full radius only for avatars |
| Elevation | shadows on buttons and badges | No shadow on buttons or badges. One elevation level for sheets and popovers. |
| Iconography | lucide, Compass logo tile | lucide at 1.5 stroke. A custom wordmark "cohort" with a small cairn glyph replaces the Compass tile. |
| Motion | none / broken `animate-in` | 150–220ms ease-out-quart. Check-off has a stroke-draw plus row settle. Progress fills animate. Everything respects `prefers-reduced-motion`. |

---

## 3. Implementation Phases

### Phase 0: Foundation fixes (P0, do first, no visual change in direction yet)
- [ ] `globals.css @theme`: define `canvas-card`, `terracotta-200/600`, `locked-badge`, `locked-ink`.
- [ ] Add `@utility touch-target { min-width:44px; min-height:44px; display:inline-flex; align-items:center; justify-content:center }`.
- [ ] Replace all `bg-[var(--color-…)]` and `text-[var(--color-…)]` arbitrary classes with token classes. Remove stray `emerald-*` and `zinc-*` colors.
- [ ] Fix the mojibake separator in `templates-view.tsx`.
- [ ] Install `tw-animate-css`, or remove the `animate-in` classes from `dialog.tsx`.
- [ ] Source the Clerk `appearance` colors from one shared token module.
- **Exit:** every surface renders as DESIGN.md intended.

### Phase 1: Design tokens & typography
- [ ] Add Fraunces, the UI face and JetBrains Mono through `next/font` in `layout.tsx`, exposed as `--font-display/sans/mono` in `@theme`. Read `node_modules/next/dist/docs` for the font API first (see AGENTS.md).
- [ ] Re-express the palette in OKLCH. Raise `ink-subtle` to at least 4.5:1, or limit it to non-text uses.
- [ ] Define the type-scale tokens and the radius, elevation and motion tokens.
- [ ] Rewrite DESIGN.md to the new system and remove its inaccurate claims ("focus trap", "zero design debt").

### Phase 2: Primitives (`src/components/ui`)
- [ ] **Button:** drop shadows. Make `sm` 40px with a 44px hit area through padding. Add a `quiet` variant. `destructive` is reserved for real deletion.
- [ ] **Dialog:** add a real focus trap, restore focus on close, use `useId` for the title id, add an enter/exit transition, and keep the bottom-sheet drag handle on mobile.
- [ ] **New `Tabs`:** `role=tablist/tab/tabpanel`, arrow-key navigation, one style used everywhere, scrollable at 360px.
- [ ] **New `Menu`** (overflow ⋯), **`Toast`** (with Undo action, `aria-live`), **`Select`** (labelled), **`Progress`** (labelled, animated), **`AvatarStack`** (uses `image_url`), and **`InlineAlert`** (replaces the 5 duplicated error boxes, shown next to its source).
- [ ] **Badge:** quieter. Text plus dot, no shadow. Status only, never role.
- [ ] **ChecklistRow:** delete and edit actions are always reachable (trailing ⋯ on mobile, swipe optional). Fix the keyboard semantics of the root `onClick`. Add the check-draw animation. Show the assignee avatar and name without truncating it to 80px.

### Phase 3: App shell & brand
- [ ] One name everywhere: **cohort** (wordmark, `<title>`, auth pages). One noun: **Trip** (replaces Event and Outing in all UI copy).
- [ ] **Contextual primary action:** "New trip" on the dashboard, "Add item" on a trip (focuses quick-add), hidden on templates. The mobile FAB follows the same rule and appears on the event page.
- [ ] Remove the duplicate h1. Bottom nav gets real 44px targets.

### Phase 4: Dashboard (`src/app/page.tsx`)
- [ ] **Trip cards** show title in display type, destination, dates formatted with `Intl.DateTimeFormat` ("Oct 12–14") plus a countdown ("in 9 days"), an avatar stack, and progress from `completedItemCount/itemCount`. Drop "Created" and the Owner badge.
- [ ] Upcoming trips go first. Archived and completed trips go in a collapsed "Past trips" section instead of tabs.
- [ ] **First-run empty state:** one primary "Plan a trip" action, with "Have a code? Join" as a text link. Short explainer: "Invite your group, split the gear, check it off together."

### Phase 5: Trip page (`events/[id]/event-view.tsx`), the core overhaul
- [ ] **Split the 1150-line file** into `TripHero`, `ChecklistPanel`, `SectionBlock`, `QuickAdd`, `MembersPanel`, `ActivityPanel` and `dialogs/*`.
- [ ] **TripHero:** title, dates and countdown, topo accent, avatar stack with "+ Invite", one progress meter ("23 of 41 packed"), and a ⋯ menu holding Save as template, Apply template, Archive and Wrap up trip.
- [ ] **Default filter "Mine / All / Unassigned"** answers "what am I bringing?"
- [ ] **QuickAdd:** an inline input at the end of each section. Enter adds the item. Parse `2x tent @sam` for quantity and assignee, with an optional "details" disclosure for notes. Keep the modal only for editing.
- [ ] Section headings at 20px display type with a count and mini progress. Rename "New section" to "Add group" ⚑.
- [ ] **Delete with Undo toast** (5s) for items. Templates and invite revoke get the same treatment, or a confirm.
- [ ] **Activity** reads "Sam packed *Stove (×1)* · 2m ago" (actor + item + relative time), grouped by day.
- [ ] **Realtime status:** render `ReconnectingBanner`. Announce sync state politely through `aria-live`.
- [ ] **Wrap up trip:** a positive pine CTA. The dialog explains in plain language that the list becomes read-only, then shows a **recap card** (who packed what, totals, dates) instead of the legal-sounding warning.
- [ ] Locked trips use slate, with a calm "Wrapped up on Oct 14" banner and a visible progress bar.

### Phase 6: Templates, Join, Auth
- [ ] **Templates:** cards show the section/item preview in a ruled list, with delete in ⋯ plus Undo. Offer "Start from template" right inside the empty state of a new trip.
- [ ] **Join** (`join-card.tsx`): show the **trip name, dates, organizer avatar and member count**, not "CODE: XXXX". Use the official multicolor Google logo. Errors say what to do ("This code has expired. Ask Sam for a new link.").
- [ ] **Auth:** the wordmark and a one-line pitch in display type, with the Clerk card restyled to the new tokens.

### Phase 7: Verify & document
- [ ] Run `impeccable detect --json src` once.
- [ ] Take one batched screenshot pass at 360 / 390 / 768 / 1280 for the dashboard, trip (active and locked), templates, join and sign-in. Fix in one batch, then do at most one confirmation round.
- [ ] Keyboard-only walkthrough of create trip → add items → assign → check off → wrap up.
- [ ] Run `tsc --noEmit`, `next build` and the vitest suite.
- [ ] Re-run `/impeccable critique`. Target **≥ 32/40** and a "product-specific" verdict.

---

## 4. File Impact Map
| File | Phases |
|---|---|
| `src/app/globals.css` | 0, 1 |
| `src/app/layout.tsx` | 0, 1, 3 |
| `src/components/ui/*` (+ new `tabs`, `menu`, `toast`, `select`, `progress`, `avatar-stack`, `inline-alert`) | 2 |
| `src/components/layout/app-shell.tsx` | 3 |
| `src/app/page.tsx` | 4 |
| `src/app/events/[id]/event-view.tsx` → `src/components/trip/*` | 5 |
| `src/app/templates/templates-view.tsx`, `src/app/join/[code]/join-card.tsx`, `src/app/(auth)/*` | 6 |
| `DESIGN.md`, new `PRODUCT.md` | 1, 7 |

> [!WARNING]
> Renaming Event to Trip applies to **UI copy only**. Database tables, server actions and routes (`/events/[id]`) stay unchanged unless you approve a route rename separately.

## 5. Out of Scope
Backend schema changes, new features beyond quick-add parsing and the "Mine" filter, and dark mode (it can come after the token rewrite).

## 6. Success Criteria
- 0 undefined tokens, and every interactive target ≥ 44px.
- Adding 10 items takes under 60s on mobile with no modal.
- Every destructive action has a confirm or an undo.
- WCAG AA contrast across all text. Tabs, dialogs and menus pass a keyboard and screen-reader walkthrough.
- Critique score ≥ 32/40.

## 7. Open Decisions ⚑
1. Typeface pairing (Fraunces + Inter Tight vs. a more utilitarian grotesk-only system).
2. Canonical noun: Trip vs. Outing vs. Event.
3. Whether to run `/impeccable init` to capture PRODUCT.md before Phase 1. Recommended, because the redesign flow expects it.
