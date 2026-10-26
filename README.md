# WanderList

**Plan together. Pack smarter. Make room for the good part.**

WanderList is a mobile-first group-trip planning and shared packing checklist web app. Create trips, invite people, organize gear into categories, assign items, track packing progress together, and reuse checklists as templates.

This repository contains the Next.js application, Supabase SQL migrations, and project planning documentation.

## Contents

- [Product capabilities](#product-capabilities)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [External services](#external-services)
- [Environment variables](#environment-variables)
- [Run locally](#run-locally)
- [Supabase database setup and migrations](#supabase-database-setup-and-migrations)
- [Clerk authentication setup](#clerk-authentication-setup)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Project planning documents](#project-planning-documents)

## Product capabilities

- **Trips and invitations:** create a trip workspace, invite other travelers with a join code, and coordinate in one shared place.
- **Shared checklist:** add gear items, group them into categories, track completion, and optionally add notes, quantities, deadlines, and assignees.
- **Ownership and collaboration:** distinguish trip owners and participants and see who is bringing each item.
- **Live updates:** use Supabase Realtime where supported by the app to keep shared trip activity up to date.
- **Templates:** save and reuse checklist structures for future trips.
- **Activity history:** review activity associated with a trip.
- **Trip lifecycle:** archive trips or wrap up a completed trip. Completed trips are permanently locked by database-level protections.
- **Responsive UI:** layouts and interactions are designed for mobile first, with desktop support.

## Technology stack

| Area | Technology |
| --- | --- |
| Web framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Authentication | Clerk, with Google sign-in configured in Clerk |
| Database | Supabase Postgres |
| Client data | Supabase JavaScript client, TanStack Query |
| Realtime | Supabase Realtime |
| Tests | Vitest |
| Code quality | ESLint, TypeScript |

## Prerequisites

Install the following before starting:

- Node.js compatible with the installed Next.js version (Node.js 20.9+ is the Next.js 16 minimum; use a current supported LTS release).
- npm.
- A Git client.
- A [Supabase](https://supabase.com/) project.
- A [Clerk](https://clerk.com/) application configured with Google as a sign-in provider.
- Supabase CLI for applying migrations.

## External services

### Supabase

Create a Supabase project and keep its project URL, publishable/anonymous key, and service-role key available. This app uses Supabase Postgres for application data. The privileged server-side client is defined in `src/server/db/supabase-admin.ts`; the browser-safe client is defined in `src/lib/supabase/client.ts`.

### Clerk

Create a Clerk application and configure Google sign-in. Copy the Clerk publishable and secret keys from the Clerk dashboard. Set the local development URL to `http://localhost:3000` as appropriate for your Clerk configuration.

In Clerk, ensure the application’s sign-in and sign-up flows allow Google OAuth and that the configured redirect URLs are compatible with your local origin. Production origins must be configured separately when deploying.

## Environment variables

Create a file named `.env.local` in the repository root. Do not commit it.

| Variable | Required | Used for | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Public Clerk frontend configuration | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Yes | Server-side Clerk authentication | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by browser and server clients | Supabase Dashboard → Project Connect / API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser-safe Supabase client key; database access must be protected by database policies | Supabase Dashboard → API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged server-side database operations and Clerk profile synchronization | Supabase Dashboard → API settings; treat as a secret |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical base URL used to construct metadata URLs | Use `http://localhost:3000` locally and your public HTTPS origin in production |

Example local file:

```dotenv
# Clerk — public key is safe for the browser; secret key is server-only.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_your_key
CLERK_SECRET_KEY=sk_test_replace_with_your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace_with_your_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=replace_with_your_service_role_key

# Site metadata base URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use the exact current key formats and values shown in your provider dashboards. Never paste real keys into source files, README examples, issue reports, screenshots, or commits.

**Security reminders**

- Variables prefixed with `NEXT_PUBLIC_` are exposed to browser bundles. Only use them for values intended to be public.
- `CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must remain server-only. Never import the privileged Supabase client into a client component or expose the service-role key to the browser.
- The service-role key bypasses normal Supabase row-level security protections. Keep privileged operations on trusted server paths and validate the current user and authorization for every mutation.
- Do not use placeholder keys for real development. The application may fall back to placeholder Supabase values in some code paths, but that is not a working configuration.
- Restart the development server after changing environment variables.

## Run locally

1. Clone the repository and enter its directory:

   ```bash
   git clone https://github.com/tylerbert31/cohort-3-codev.git
   cd cohort-3-codev
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` from the [environment variable example](#environment-variables) and fill in real Clerk and Supabase values.

4. Configure Supabase and apply the database migrations using the instructions below.

5. Configure Clerk Google sign-in and local redirect settings using the instructions below.

6. Start the Next.js development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

For a production-like local check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Run these checks after the local environment and database are configured. The build may need valid provider configuration for routes that initialize authentication or database clients.

## Supabase database setup and migrations

SQL migration files live in `supabase/migrations/`. They are versioned and should be applied in timestamp order. The current migration set includes the initial application schema/security rules and the optional checklist-item deadline field.

### 1. Install or run the Supabase CLI

Follow the official [Supabase CLI installation guide](https://supabase.com/docs/guides/cli). If you do not have the CLI installed globally, you can generally invoke it through `npx`:

```bash
npx supabase --version
```

### 2. Initialize local Supabase CLI configuration if needed

This repository contains SQL migrations. If the checkout does not include `supabase/config.toml`, initialize the CLI configuration before using project-linking or migration commands:

```bash
npx supabase init
```

If prompted about existing files, preserve the existing `supabase/migrations/` directory. Review any generated configuration changes before committing them.

### 3. Link this checkout to your Supabase project

Find the project reference in your Supabase project URL or dashboard. Then run:

```bash
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
```

The CLI may ask for the database password. This is the database password for your Supabase project, not the service-role API key. Avoid putting passwords directly into shell history.

### 4. Review migration files

Before applying migrations, inspect the SQL files in `supabase/migrations/`. In particular, confirm that they target the intended project and understand the schema/security changes.

```text
supabase/
  migrations/
    20261024000000_outing_checklist_schema.sql
    20261024000001_add_deadline_to_checklist_items.sql
```

### 5. Check and apply migrations

Check which migrations are applied remotely:

```bash
npx supabase migration list
```

Push pending migrations to the linked project:

```bash
npx supabase db push
```

This modifies the linked database. Confirm that the linked project is the correct development/staging/production project before proceeding. Back up important databases and review SQL changes before applying them to production.

### Optional: run a local Supabase stack

If Docker is installed and you want a local Postgres/Auth/Studio stack, follow the [Supabase local development guide](https://supabase.com/docs/guides/local-development). After the CLI configuration is initialized, start the stack:

```bash
npx supabase start
npx supabase migration list
npx supabase db reset
```

`db reset` resets the local development database and reapplies migrations; it is destructive to local data. Do not use it against a production database.

### Migration workflow for future changes

1. Create a new migration rather than editing an already-applied migration:

   ```bash
   npx supabase migration new describe_the_change
   ```

2. Add the SQL to the newly generated timestamped file under `supabase/migrations/`.
3. Review the SQL and test it against a disposable/local database.
4. Apply locally and verify the schema.
5. For the linked remote development project, run `npx supabase db push`.
6. Commit the migration file alongside the application changes.
7. Do not edit or reorder historical migrations that have already been applied to shared environments. Create a follow-up migration instead.

## Clerk authentication setup

1. Create a Clerk application.
2. Enable Google as a social sign-in provider and complete any required Google OAuth configuration in Clerk.
3. Copy the publishable and secret keys into `.env.local`.
4. Configure sign-in/sign-up and allowed redirect URLs for `http://localhost:3000`.
5. Start the app and test sign-in, sign-out, trip creation, invitation joining, and a page refresh after authentication.
6. When deploying, configure the production origin and provider settings independently; do not reuse development-only keys or redirect URLs in production.

The app stores a profile mapping associated with the Clerk user ID in Supabase. Review the migration SQL before using a database that contains real user data.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server on `0.0.0.0` |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run the Vitest test suite once |

## Project structure

```text
src/
  app/                 Next.js routes, layouts, pages, and route-specific UI
  components/          Shared layout, landing, dashboard, and UI components
  lib/                 Browser clients, query providers, and shared utilities
  server/              Server-side database operations and privileged clients
  types/               TypeScript database and domain types
supabase/
  migrations/          Ordered SQL schema and database changes
docs/
  product/              Product goals, PRD, and product overview
  architecture/         Architecture and database design
  design/               Design specifications and UX checklists
  planning/             Implementation plan and Antigravity prompt
  operations/           Deployment and operations guide
  archive/              Legacy phase checklist drafts retained for history
phases/                 Current implementation phase checklists
```

Project documentation is organized under [`docs/`](docs/README.md). Keep `README.md` and `AGENTS.md` at the repository root for onboarding and repository-wide agent instructions.

## Security notes

- Never commit `.env.local`, provider secrets, access tokens, database passwords, or real user data.
- Use a dedicated Supabase development project while building features.
- Treat `SUPABASE_SERVICE_ROLE_KEY` as highly sensitive. Its use must stay on server-side code paths.
- Validate authorization on every server-side mutation; do not assume a user is allowed to change a trip merely because they know its ID.
- Apply and review database security policies/triggers before exposing data to users.
- Keep dependency versions and lockfiles aligned; use `npm ci` in CI when a committed npm lockfile is present.

## Troubleshooting

### The app loads but Supabase queries fail

- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Confirm that the migrations have been applied to the same Supabase project.
- Inspect browser and server logs for missing tables, policy errors, or incorrect project URLs.

### Clerk sign-in fails or redirects incorrectly

- Confirm both Clerk keys are set correctly.
- Confirm Google sign-in is enabled in Clerk.
- Check the configured local redirect URLs and restart `npm run dev` after changing environment variables.

### A migration command cannot find Supabase configuration

- Confirm `supabase/config.toml` exists.
- If it does not, run `npx supabase init` and preserve the existing migrations folder before linking the project.

### Environment changes do not take effect

Stop and restart the development server after editing `.env.local`. Do not expect Next.js to reload environment values in an already running process.

## Project planning documents

The project planning/implementation documents and phase checklists provide additional product and engineering context. When changing product scope or database behavior, update the relevant documents as part of the same work.

---

**Brand:** WanderList  
**Repository:** [tylerbert31/cohort-3-codev](https://github.com/tylerbert31/cohort-3-codev)
