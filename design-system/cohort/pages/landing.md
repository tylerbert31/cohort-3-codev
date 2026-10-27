# Landing Page Specification: WanderList

## 1. Page Purpose
- Enable unauthenticated visitors to explore the platform, understand the core value proposition of collaborative trip packing, interact with a live tactile field notes preview, enter invite codes, and sign in without being force-redirected.

## 2. Information Architecture & Section Hierarchy
1. **Top Navigation Header:**
   - Brand lockup: `WanderList` wordmark with Compass icon.
   - Desktop anchor links: Features, Interactive Demo, How It Works, Templates.
   - Secondary action: "Have an Invite Code?"
   - Primary actions: "Sign In" (modal trigger) and "Start a Trip" button.
2. **Hero Section (Pattern: Hero + Interactive Preview + Dual CTA):**
   - Eyebrow pill: "Trailhead Field Notes · Group Expedition Coordination"
   - Headline: "No more forgotten stoves. Coordinate group expedition gear without the chaos."
   - Subhead: "A tactile, dependable packing coordinator for camping trips, alpine treks, and group adventures. Know who's hauling what, assign shared essentials, and wrap up every expedition into a permanent field log."
   - Primary CTA: "Plan Your Trip — Free" (opens Google Sign-In)
   - Secondary CTA: "Join with Code" (scrolls / focuses invite code input)
   - Trust indicators: "Zero bloated spreadsheets · 1-click Google Sign-in · Real-time sync"
3. **Interactive Trailhead Preview Card (Tactile Field Log Demo):**
   - Live interactive widget representing an active expedition ("High Sierra 4-Day Ridge Traverse").
   - Lets visitors toggle real packing items, see progress update live, and view member assignments.
   - Proves value instantly without requiring an account.
4. **Quick Code Entry Strip:**
   - Direct 8-character input for users arriving from a group text or email with an invite code.
   - Validates format and navigates immediately to `/join/[code]`.
5. **Feature Bento Grid (4 Core Capabilities):**
   - 01: Collaborative Gear Assignment (Prevent duplicate bulky gear, ensure shared essentials covered)
   - 02: Frictionless 8-Character Invites (No account pre-requisites to receive invites)
   - 03: Field-Tested Templates (Weekend Backpacking, Alpine Mountaineering, Desert Campout)
   - 04: Permanent Logbook Archive (Locked historical record of past adventures)
6. **How It Works (3-Step Visual Progression):**
   - Step 1: Draft Your Outing
   - Step 2: Split the Load
   - Step 3: Depart Prepared & Wrap Up
7. **Trailhead Field Testimonials (Social Proof):**
   - Verified feedback quotes from outdoor leaders and camping organizers.
8. **Final Call to Action:**
   - Clean, high-contrast banner inviting users to organize their next adventure.
9. **Accessible Footer:**
   - Brand info, quick links, keyboard accessibility note, and copyright.

## 3. UI/UX Pro Max Rules Applied
- Minimum 44px touch targets on all interactive elements.
- WCAG AA contrast (ink: `#211D18` on `#FAF8F5` is 13.5:1; pine: `#23523B` on `#FFFFFF` is 7.2:1).
- No emojis for structural icons; consistent Lucide SVG stroke width.
- Keyboard accessible tab order, visible focus rings, and proper ARIA landmarks.
