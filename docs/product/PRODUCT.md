# Product Overview: WanderList

## 1. Product Truth
- **Name:** WanderList
- **Core Purpose:** A collaborative expedition and group trip packing coordinator. Enables friends, campers, travelers, and groups to organize gear, split packing responsibilities, track group prep in real-time, and preserve memories of past adventures.
- **Audience:** Friends, outdoors lovers, festival-goers, camping groups, and family trip planners who need clear coordination without bloated project-management tooling.
- **Key Metaphor:** "Trailhead Field Notes" — tactile, organized, dependable, warm logbook feel.
- **Key Terminology:**
  - **Trip:** An adventure or gathering (replaces "event" and "outing" in user-facing UI).
  - **Packing List / Gear:** Organized items grouped into sections/categories.
  - **Members:** The people invited to collaborate on a trip.
  - **Wrap Up / Completed:** When packing is finished and the trip departs, locking the list into a permanent logbook record.

## 2. Surfaces & Modes
- **Dashboard (`/`):** Operate — Overview of upcoming trips, quick jump into packing, past completed logs.
- **Trip View (`/events/[id]`):** Operate — Real-time collaborative packing list, gear assignment, member roster, activity log, trip completion.
- **Join Flow (`/join/[code]`):** Persuade/Onboard — Welcoming invitation screen with organizer face and trip context.
- **Templates (`/templates`):** Operate — Reusable packing checklists (e.g. "Weekend Backpacking", "Beach Campout").

## 3. Constraints & Invariants
- Clerk Google OAuth authentication only.
- Strict Supabase row-level security and server actions.
- Real-time updates with graceful reconnecting status.
- Once a trip is wrapped up/completed, it is permanently read-only (historical log).
- 44px minimum tap targets, WCAG AA contrast, and full keyboard navigation.
