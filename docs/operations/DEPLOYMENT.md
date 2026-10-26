# Outing & Packing Checklist — Deployment & Operations Guide

## Overview
This application is built with **Next.js 16 (Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Clerk Authentication (Google OAuth)**, and **Supabase (PostgreSQL with RLS & Realtime)**.

---

## 1. Environment Configuration

The application requires the following environment variables across all staging and production deployments.

| Variable Name | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public (Client & Server) | Clerk publishable API key for frontend auth state |
| `CLERK_SECRET_KEY` | Server-Only (Private) | Privileged key for Clerk backend auth and profile retrieval |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | `/sign-up` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Supabase project REST & Realtime endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Supabase anon key for client-side RLS and Realtime subscriptions |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only (Private) | Privileged Supabase key for server actions and migrations |

> [!CAUTION]
> Never expose `CLERK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client components or public environment variable configurations.

---

## 2. Database Migration Procedure

1. Connect to your Supabase PostgreSQL database via CLI, Dashboard SQL Editor, or CI/CD migration pipeline.
2. Execute the auditable migration script located at:
   ```
   supabase/migrations/20261024000000_outing_checklist_schema.sql
   ```
3. This creates:
   - 10 core tables (`profiles`, `events`, `event_members`, `event_invites`, `checklist_sections`, `checklist_items`, `checklist_templates`, `template_sections`, `template_items`, `activity_events`).
   - Row Level Security (RLS) policies on all tables.
   - Database triggers `prevent_reopening_completed_event()` and `check_event_not_locked()`.

---

## 3. AWS Amplify Hosting Deployment

AWS Amplify Hosting natively supports Next.js App Router applications with Server-Side Rendering (SSR).

### Build Specification (`amplify.yml`)
The repository includes [`amplify.yml`](../../amplify.yml):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run typecheck
        - npm run test
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
```

### Steps to Deploy:
1. In the **AWS Amplify Console**, select **Host Web App** and connect your GitHub repository (`cohort-3-codev`).
2. Select the branch to deploy (`master` for production).
3. In **App Settings > Environment variables**, add all variables specified in Section 1.
4. Set Node.js version to `20.x` or `22.x` in **App Settings > Build settings > Build image settings**.
5. Trigger a deployment. The build pipeline runs typechecking, unit tests, and the Turbopack production build.

---

## 4. Vercel Deployment (Alternative)

1. Import the repository into the **Vercel Dashboard**.
2. Framework preset will automatically detect **Next.js**.
3. In **Project Settings > Environment Variables**, supply the required keys from Section 1.
4. Deploy. Vercel automatically deploys with edge middleware (`src/proxy.ts`) and Partial Prerendering.

---

## 5. Security & Invariant Verification

- **Google OAuth Only**: Email/password and arbitrary sign-ins are disallowed; Clerk configuration enforces Google OAuth only.
- **Server Authorization Boundary**: Every server action verifies identity via `auth()` and checks event membership with `assertEventMembership()` before performing queries.
- **Permanent Completion Lock**:
  - Reopening is permanently disallowed for this MVP.
  - Adding, editing, deleting, or reordering sections/items on completed outings throws `EVENT_LOCKED` at both application and database trigger layers.
- **Invite Code Safety**:
  - High-entropy 8-character base32 codes.
  - In-memory sliding-window rate limiter prevents enumeration (max 10 attempts per minute).
  - Unauthenticated access reveals no outing details.

---

## 6. Rollback & Disaster Recovery

1. **Git Rollback**:
   - Every phase is preserved in an immutable feature branch:
     - `feature/01-ui-ux-design-system`
     - `feature/02-data-model-security`
     - `feature/03-app-foundation-auth`
     - `feature/04-events-and-invitations`
     - `feature/05-checklist-templates-and-activity`
     - `feature/06-release-and-deployment`
   - In case of a production defect, revert the merge commit on `master` with `git revert -m 1 <commit-hash>`.
2. **Database Rollback**:
   - If schema migration fails, drop the created tables in reverse dependency order:
     `activity_events`, `template_items`, `template_sections`, `checklist_templates`, `checklist_items`, `checklist_sections`, `event_invites`, `event_members`, `events`, `profiles`.
