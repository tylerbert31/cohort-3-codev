# Design & UX Specification

## Required design workflow
Before implementing UI, the Senior Frontend/UX specialist must:
1. Read `goal.md`, `PRD.md`, and this document.
2. Invoke `/impeccable` to audit the current experience or establish the design direction. Use its relevant subcommands/workflow supported by the installed skill; do not invent unsupported commands.
3. Invoke `/ui-ux-pro-max` and use the skill's guidance for layout, typography, colors, interaction patterns, and responsive behavior.
4. Inspect the repository and existing component/design-system conventions before choosing libraries or replacing components.
5. Produce a brief design rationale and page-level implementation plan, then implement it. Do not stop after giving advice or producing a mockup.
6. Re-run the relevant `/impeccable` review after implementation and fix the highest-impact issues.

## Experience direction
Aim for a confident, warm, outdoorsy planning tool: organized and friendly, but not childish or overly themed. The interface should feel purpose-built for coordinating real trips and gatherings, not like a generic admin dashboard.

## Implemented Design System & Tokens
The design system is implemented in `src/app/globals.css` with semantic CSS variables:

### Color Palette
- **Canvas / Background:** `#FAF8F5` (warm parchment ground), with raised cards (`#FFFFFF`) and borders (`#DCD4C7`).
- **Ink / Typography:** `#211D18` (primary dark earthy neutral, providing > 7:1 WCAG contrast), `#6E6659` (secondary/muted text).
- **Pine / Primary Action:** `#2C6348` (hover: `#23523B`), deep forest green for primary buttons, active tabs, and completion checkmarks.
- **Amber / Active State:** `#C6771F` / `#FDF9F0` for active trips and attention status.
- **Terracotta / Destructive Alert:** `#C14F33` / `#FDF5F2` for warnings, deletions, and validation errors.
- **Locked Slate:** `#636A73` / `#F1F3F5` with border `#D4D8DC` for completed and permanently locked events.

### Typography & Spacing
- Standard system-ui stack with optimized font-feature settings.
- Body minimum `16px` on mobile to avoid automatic iOS Safari zoom triggers.
- Minimum interactive touch target: `44px × 44px` across all buttons, inputs, icons, and checkboxes.
- Visible focus indicator: `2px solid #23523B` with `2px` offset.
- Full support for `prefers-reduced-motion` eliminating transitions and animations when requested.

## Component Library (`src/components/ui/` & `src/components/layout/`)
- `Button` (`src/components/ui/button.tsx`): Primary, secondary, outline, destructive, ghost, and loading spinner states.
- `Input` (`src/components/ui/input.tsx`): Form text field with label, required marker, helper text, and inline validation error state.
- `Badge` (`src/components/ui/badge.tsx`): Status badges for active, completed/locked, archived, pending, and neutral.
- `ChecklistRow` (`src/components/ui/checklist-row.tsx`): Mobile-first touch row with `44px` checkbox hit target, quantity chip, assignee badge, strike-through text, and permanent lock enforcement.
- `Dialog` (`src/components/ui/dialog.tsx`): Accessible modal with backdrop blur, escape key dismissal, focus trap, and touch-friendly close button.
- `StateViews` (`src/components/ui/state-views.tsx`): `EmptyState`, `ErrorState`, `LoadingSkeleton`, `PermissionDeniedState`, `LockedEventBanner`, and `ReconnectingBanner`.
- `AppShell` (`src/components/layout/app-shell.tsx`): Responsive shell with desktop header and mobile bottom dock navigation.

## Responsive Breakpoint Verification
Tested and verified across key viewport tiers:
- **Narrow Mobile (~360px):** Single-column stacked layouts, bottom navigation, full-width touch targets. Zero horizontal scroll overflow.
- **Standard Mobile (~390px):** Form padding and metadata chips wrap smoothly.
- **Tablet (~768px):** Dialog switches from bottom drawer to centered modal; header actions expand.
- **Desktop (~1280px):** Contained `max-w-4xl` layout, top navigation bar, balanced margins.

## Design Acceptance Gate
- [x] `/impeccable` mechanical detector executed clean (`impeccable detect src/`: 0 findings).
- [x] `/ui-ux-pro-max` mobile-first and accessibility rules applied.
- [x] Every required view and state implemented in code.
- [x] Responsive layout verified and compiled via `next build` and `tsc --noEmit`.
- [x] Zero design debt remaining for Phase 01.
