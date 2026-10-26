# Documentation Index

Project documentation is grouped by purpose. Keep `README.md` and `AGENTS.md` at the repository root; the former is the onboarding guide and the latter contains repository-wide coding instructions.

## Product
- [Goal](product/goal.md) — product goals and experience principles.
- [Product Requirements Document](product/PRD.md) — requirements and scope.
- [Product Overview](product/PRODUCT.md) — product definition and constraints.

## Architecture and data
- [Architecture](architecture/ARCHITECTURE.md) — application stack and architectural boundaries.
- [Database and authorization](architecture/DATABASE.md) — schema, data ownership, and security rules.

## Design and UX
- [Design specification](design/DESIGN.md) — visual direction and interface principles.
- [Mobile event-page UX checklist](design/MOBILE_EVENT_PAGE_UX_CHECKLIST.md) — implementation and validation checklist.
- [Design improvements plan](design/design_improvements_plan.md) — detailed UI overhaul plan.

## Planning and implementation
- [Implementation plan](planning/IMPLEMENTATION_PLAN.md) — phase sequence and execution guidance.
- [Antigravity orchestration prompt](planning/ANTIGRAVITY_PROMPT.md) — instructions for implementation workflows.

The active phase checklists remain in the root-level [`phases/`](../phases/) directory. Archived phase checklist drafts are retained under [`archive/phase-checklist-drafts/`](archive/phase-checklist-drafts/) for reference and should not replace the active checklists.

## Operations
- [Deployment and operations guide](operations/DEPLOYMENT.md) — environment, deployment, and troubleshooting.

When a product or engineering decision changes, update the relevant document in the same pull request. Prefer the active `phases/` checklists over archived drafts when tracking current implementation status.
