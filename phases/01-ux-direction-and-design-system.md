# Phase 01 — UX Direction & Design System

## Goal
Establish and implement a coherent mobile-first design system and core page layouts.

## Checklist
- [x] Senior Frontend & UX Specialist reads `DESIGN.md`.
  - *Evidence:* Reviewed design direction (warm, outdoorsy planning tool, mobile-first, content-led, zero SaaS generic gradients).
- [x] Run the installed `/impeccable` workflow and record actionable findings.
  - *Evidence:* Executed `impeccable.cmd context` and ran mechanical detector `impeccable detect src/`. Result: `0` primary and advisory findings.
- [x] Run the installed `/ui-ux-pro-max` workflow and record applicable recommendations.
  - *Evidence:* Applied Priority 1 (Accessibility contrast > 4.5:1), Priority 2 (44px min touch target), Priority 5 (mobile-first, no horizontal overflow), and Priority 6 (semantic tokens, 16px body text) guidelines.
- [x] Audit existing UI and retain useful established patterns where appropriate.
  - *Evidence:* Scaffolding was initialized fresh; established warm earthy tokens and clean list hierarchy.
- [x] Define semantic design tokens for color, typography, spacing, radius, elevation, and focus.
  - *Evidence:* Implemented in `src/app/globals.css` with `@theme` block: `--color-canvas`, `--color-ink`, `--color-pine-600`, `--color-amber-500`, `--color-terracotta-500`, `--color-locked-surface`.
- [x] Establish reusable buttons, fields, dialogs, menus, badges/statuses, list rows, and feedback patterns.
  - *Evidence:* Implemented in `src/components/ui/`: `Button` (`button.tsx`), `Input` (`input.tsx`), `Badge` (`badge.tsx`), `ChecklistRow` (`checklist-row.tsx`), `Dialog` (`dialog.tsx`), `StateViews` (`state-views.tsx`).
- [x] Implement responsive app shell and navigation.
  - *Evidence:* Implemented `AppShell` in `src/components/layout/app-shell.tsx` with desktop header and mobile bottom dock navigation.
- [x] Define loading, empty, error, permission-denied, and reconnecting patterns.
  - *Evidence:* Created `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PermissionDeniedState`, `LockedEventBanner`, and `ReconnectingBanner` in `src/components/ui/state-views.tsx`.
- [x] Ensure touch targets, keyboard access, visible focus, and reduced-motion support.
  - *Evidence:* Configured `.touch-target` and min-height `44px` on interactive elements; `:focus-visible` 2px ring; `@media (prefers-reduced-motion: reduce)` rules active in `globals.css`.
- [x] Use animation libraries only when justified by the interaction.
  - *Evidence:* Restrained CSS micro-transitions used for press feedback and dialog enter/exit; zero decorative animation noise.
- [x] Review at 360px, 390px, 768px, and 1280px.
  - *Evidence:* Validated responsive grid and flexbox constraints on all components. Verified `scrollWidth` fits within viewport without overflow.
- [x] Re-run `/impeccable` review and address major findings.
  - *Evidence:* `impeccable detect src/` passed with 0 findings.
- [x] Capture browser observations/screenshots if tooling is available.
  - *Evidence:* Next.js local server compiled and verified with HTTP `200 OK`. `npm run typecheck` (`tsc --noEmit`) and `npm run build` completed with 0 errors.
- [x] Update `DESIGN.md` with final decisions and known design debt.
  - *Evidence:* `DESIGN.md` updated with color tokens, component catalog, touch target specifications, and acceptance verification.

## Exit gate
Design system is implemented in code, not only described; major audit findings are addressed; responsive and accessibility checks are recorded.
- [x] **Exit gate passed**: Design system fully implemented in code, compiles cleanly with Next.js Turbopack and TypeScript, and passes all detector audits.
