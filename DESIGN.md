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

## Visual constraints
- Mobile-first, responsive, and content-led.
- Strong typographic hierarchy and deliberate spacing.
- Use a restrained, accessible color system with semantic tokens.
- No default purple/blue gradient SaaS aesthetic.
- Avoid excessive rounded cards, glassmorphism, ornamental blobs, random icons, and decorative animation.
- Prefer clear lists, compact grouped sections, useful progress indicators, and contextual actions.
- Do not force desktop table patterns onto mobile screens.
- Do not make the screen feel cramped; use vertical space intentionally.
- Use icons consistently and pair unfamiliar icons with labels.
- Empty states should explain the next useful action.
- Forms need inline validation, clear required/optional labels, and useful error recovery.

## Required views/states
- Sign-in / auth callback and profile-sync loading/error handling.
- Main dashboard with active, archived, and completed event states.
- Create/edit event flow.
- Invite/join flow for code and link.
- Event detail with event header, grouped checklist, progress, assignment/quantity, and participant context.
- Add/edit checklist item.
- Personal templates list, create/edit, and apply flow.
- Activity feed.
- Archive/restore confirmation and feedback.
- Completed event read-only view.
- Permission denied, invalid invite, loading, empty, error, and reconnecting states.

## Interaction and motion
- Prefer immediate feedback, optimistic updates only when rollback/error handling is sound, and accessible pending states.
- Use Framer Motion for small, purposeful transitions where useful.
- Use GSAP/ScrollTrigger or Lenis only if the design includes a specific interaction that genuinely needs them. They are not mandatory on every page; avoid conflicting animation systems and scroll hijacking.
- Respect reduced-motion preferences and provide a usable experience if animation fails or is disabled.
- Keep touch targets comfortable and avoid hover-only actions.

## Accessibility and responsive QA
- Keyboard-operable navigation, menus, dialogs, and forms.
- Visible focus indicators and logical focus order.
- Appropriate accessible names and semantic headings.
- Dialog focus management and escape behavior.
- Check at minimum narrow mobile (~360px), typical mobile (~390px), tablet (~768px), and desktop (~1280px).
- No horizontal overflow or content hidden behind fixed navigation.
- Include contrast and reduced-motion checks.

## Design acceptance gate
The Senior Frontend specialist must not mark design complete until:
- `/impeccable` review has been run and major findings addressed.
- `/ui-ux-pro-max` guidance has been applied.
- Every required view/state has been considered.
- Mobile and desktop screenshots/browser observations have been reviewed.
- Any known design debt is documented.
