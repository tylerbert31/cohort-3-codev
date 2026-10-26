# Goal

Build a polished, secure, mobile-first web application for planning outings and coordinating shared packing/checklist tasks.

The product should make it easy for a group to create a private event, invite participants through a reusable invite code/link, organize what needs to be brought, assign responsibility, and see meaningful progress without a cluttered interface.

## Product principles
- **Mobile first:** the primary experience must be comfortable on a phone, including one-handed interactions and narrow viewports.
- **Private by default:** events and their content are visible only to authorized participants.
- **Fast collaboration:** checklist changes should feel immediate; use Supabase Realtime where appropriate.
- **Clear ownership:** items can have optional assignees and quantities.
- **Low-friction reuse:** users can save personal templates and reuse them for future events.
- **Trustworthy lifecycle:** archive/restore is supported; completed events are permanently locked against further edits.
- **Purposeful visual design:** avoid generic AI-generated SaaS layouts, excessive cards, unnecessary gradients, oversized hero sections, decorative noise, and motion without a clear purpose.
- **Accessible and resilient:** keyboard support, visible focus, understandable empty/error/loading states, and reduced-motion support.

## MVP scope
- Clerk authentication with Google OAuth as the only sign-in method.
- Store the Clerk user ID, first name, last name, and profile-image URL in Supabase.
- Create and manage private events.
- Invite participants using a reusable invite code/link with secure membership checks.
- Group checklist items into sections/categories.
- Checklist items support optional quantities and optional assignees.
- Shared checklist state with live updates where useful.
- Archive and restore events.
- Personal templates that users can save and reuse.
- Important activity feed for meaningful event/checklist changes.
- Completed events become permanently read-only/locked.
- Mobile-first responsive interface.
- Deploy primarily to AWS Amplify.

## Technical direction
- Next.js with TypeScript.
- Clerk for authentication; Google OAuth only.
- Supabase PostgreSQL and Realtime.
- Prefer Next.js Server Actions for mutations, organized under `src/server/actions/`.
- TanStack React Query for client-side server state where it adds value; use the latest stable version compatible with the chosen Next.js version.
- Framer Motion for restrained UI transitions; GSAP/ScrollTrigger and Lenis only where a specific page interaction benefits from them. Do not add all animation tools indiscriminately.
- Supabase MCP is available and should be used for schema inspection and database work when appropriate.
- AWS Amplify is the primary deployment target.

## Definition of done
The MVP is not done until the phase checklist is complete, database authorization is verified, automated checks pass, and a browser QA pass covers mobile and desktop critical paths.
