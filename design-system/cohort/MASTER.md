# Design System: cohort ("Trailhead Field Notes")

## 1. Visual Direction & Archetype
- **Archetype:** Trailhead Field Notes — Tactile, warm, dependable, outdoor expedition coordinator.
- **Metaphor:** A weathered, durable field logbook resting on a trailhead tailgate or camp prep table.
- **Stack:** Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS v4, Lucide Icons, Clerk Auth, Supabase.

## 2. Typography Tokens
- **Display & Headings (Serif):** `Fraunces` via `next/font/google` (`var(--font-fraunces)` / `font-serif`).
- **Body & Controls (Sans):** `Inter` via `next/font/google` (`var(--font-inter)` / `font-sans`).
- **Numeric & Codes (Mono):** Tabular figures (`tnum 1`, `font-mono`) for invite codes, counts, dates, and percentages.
- **Scale:**
  - Hero Display: 2.25rem - 3.25rem (36px - 52px), line-height 1.15
  - Heading 1: 1.875rem - 2.25rem (30px - 36px), line-height 1.2
  - Heading 2: 1.5rem - 1.75rem (24px - 28px), line-height 1.25
  - Heading 3: 1.25rem (20px), line-height 1.3
  - Body Large: 1.125rem (18px), line-height 1.6
  - Body Regular: 1rem (16px), line-height 1.5 (prevents iOS auto-zoom)
  - Small / Caption: 0.875rem (14px) and 0.75rem (12px)

## 3. Color Tokens & Contrast Ratios
- **Canvas / Ground:** `#FAF8F5` (`--color-canvas`) — Warm parchment ground.
- **Cards / Surfaces:** `#FFFFFF` (`--color-canvas-card`) — Crisp field note cards with `#DCD4C7` border (`--color-canvas-border`).
- **Subtle Surface:** `#F3EFE9` (`--color-canvas-subtle`) — Recessed groupings.
- **Muted Surface:** `#EBE5DB` (`--color-canvas-muted`) — Dividers & subtle borders.
- **Primary Ink:** `#211D18` (`--color-ink`) — Deep earthy charcoal neutral (> 7:1 WCAG AAA contrast on canvas).
- **Muted Ink:** `#6E6659` (`--color-ink-muted`) — Secondary explanatory copy (> 4.5:1 WCAG AA contrast).
- **Subtle Ink:** `#7A7265` (`--color-ink-subtle`) — Tertiary metadata (> 4.5:1 WCAG AA contrast on light canvas).
- **Pine (Primary Action):**
  - `#2C6348` (Pine 500)
  - `#23523B` (Pine 600) — Primary brand button & active states (> 4.5:1 against white text).
  - `#1A3E2C` (Pine 700) — Hover state.
  - `#F1F6F3` (Pine 50) — Subtle pill tint.
- **Amber (Attention & Invites):**
  - `#C6771F` (Amber 500)
  - `#FDF9F0` (Amber 50)
- **Terracotta (Destructive & Alerts):**
  - `#C14F33` (Terracotta 500)
  - `#FDF5F2` (Terracotta 50)
- **Locked Slate (Historical Records):**
  - `#636A73` (Locked Badge)
  - `#F1F3F5` (Locked Surface)

## 4. Spacing, Rhythm & Touch Targets
- **Base Grid:** 4px / 8px incremental spacing scale.
- **Touch Targets:** Minimum 44px × 44px on all interactive elements (`min-h-[44px]` / `@utility touch-target`).
- **Touch Spacing:** Minimum 8px gap between adjacent touch targets.
- **Max Width:** Container standard `max-w-5xl` for marketing/landing, `max-w-4xl` for app views.

## 5. Accessibility & Motion Rules
- **Focus Indicators:** 2px solid `#23523B` outline with 2px offset (`focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:outline-none`).
- **Icons:** Strict vector SVG icons via `lucide-react`. Zero emoji used for functional UI.
- **Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` override disabling all animations.
- **Screen Reader Support:** Semantic landmarks (`header`, `main`, `nav`, `section`, `footer`), explicit `aria-label` attributes on icon-only buttons, and descriptive heading hierarchies.
