# Design & UX Specification: cohort ("Trailhead Field Notes")

## 1. Design Direction: "Trailhead Field Notes"
A tactile, warm, confident group expedition and camping packing coordinator. Designed to feel like a dependable field logbook used at the trailhead, campsite, or prep table.

## 2. Visual System & Design Tokens
Defined in `src/app/globals.css`:

### Typography
- **Serif (Trip titles, prominent headings):** `Fraunces` via `next/font/google`, mapped to `--font-serif`.
- **Sans (Interface, controls, body copy):** `Inter` via `next/font/google`, mapped to `--font-sans`.
- **Monospace (Counts, dates, invite codes, percentages):** Tabular figures enabled globally via `tnum 1` and `font-mono`.

### Color Palette & Semantics
- **Canvas / Ground:** `#FAF8F5` (warm parchment ground).
- **Cards / Panels:** `#FFFFFF` (`--color-canvas-card`) with `#DCD4C7` border.
- **Ink / Typography:** `#211D18` (primary dark earthy neutral, > 7:1 WCAG contrast), `#6E6659` (secondary/muted text), `#7A7265` (elevated subtle text, >= 4.5:1 WCAG AA contrast).
- **Pine / Primary Action:** `#2C6348` / `#23523B`, deep forest green for primary action buttons, completion checkmarks, and active tabs.
- **Amber / Active State:** `#C6771F` / `#FDF9F0` for attention states and trip invitations.
- **Terracotta / Destructive Alert:** `#C14F33` / `#FDF5F2` for inline alerts, warnings, and deletions.
- **Locked Slate:** `#636A73` / `#F1F3F5` with border `#D4D8DC` for historical read-only trip logs.

### Tap Targets & Accessibility
- Minimum interactive touch target: `44px × 44px` across all buttons, inputs, icons, tabs, and checkboxes via `@utility touch-target`.
- Visible focus indicator: `2px solid #23523B` with `2px` offset.
- `Dialog`: Accessible modal with Escape key handling, backdrop dismiss, focus trap, and focus restoration to trigger element on close.
- Full support for `prefers-reduced-motion` eliminating transitions and animations when requested.

## 3. Component Architecture
- `Button`: Primary, secondary, outline, destructive, ghost, and quiet variants. 40px sm (with 44px hit-box) up to 48px lg.
- `Dialog`: Focus-trapped accessible dialog with `useId` heading associations and mobile drag handle indicator.
- `ChecklistRow`: Direct touch checkbox, item metadata, quantity badge, assignee chip, and permanent lock styling. Includes accessible keyboard `Space`/`Enter` checkoff and an always-accessible mobile delete action.
- `Tabs`: Accessible `role="tablist"` with keyboard and mobile horizontal overflow support.
- `AvatarStack`: Compact cohort face pile representing expedition members with image fallbacks.
- `Progress`: Accessible, animated progress bar with percentage and quantity feedback.
- `InlineAlert`: Non-intrusive semantic alert box placed contextually beside the failed interaction.
- `AppShell`: Responsive navigation shell with unified **cohort** brand and contextual primary actions ("New Trip" on dashboard, "Add Item" on trip view).

## 4. Verification & QA Gate
- [x] Impeccable mechanical detector clean: `impeccable detect src` $\to$ 0 findings (`[]`).
- [x] Zero undefined CSS variables or broken token references.
- [x] All 65 unit/integration tests passing cleanly via `vitest`.
- [x] TypeScript compiler check clean (`tsc --noEmit`) and Next.js Turbopack build clean.
