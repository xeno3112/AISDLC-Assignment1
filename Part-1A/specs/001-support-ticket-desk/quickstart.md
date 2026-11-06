# Quickstart: Internal Issue Tracker

This guide describes the expected local setup and checks for the planned application. Run it from the `Part-1A/` project root after implementation has created the package scripts and harness.

## Prerequisites

- Node.js 24 LTS and npm compatible with the lockfile.
- MongoDB 8.0 available locally, or Docker for a disposable local service.
- A department catalog and staff roster containing stable IDs, department names, staff display names, active state and role (`support`, `operations` or `other`).
- No external authentication provider is required. Do not expose this unauthenticated service outside a trusted internal network boundary.

## Start a local MongoDB service

If MongoDB is not already running locally, Docker can start a disposable development instance:

```sh
docker run --rm --detach --name internal-issue-tracker-mongo \
  -p 27017:27017 mongo:8.0
```

Configure separate development and test databases. Use only a disposable test database for automated tests:

```sh
export MONGODB_URI='mongodb://127.0.0.1:27017/internal_issue_tracker'
export MONGODB_TEST_URI='mongodb://127.0.0.1:27017/internal_issue_tracker_test'
```

Test startup must fail if `MONGODB_TEST_URI` points to a non-test database.
Department and staff catalogs are deployment-supplied and maintained outside
the application; there are no catalog-management endpoints. For local
development only, the backend provides an idempotent seed command with sample
department and staff records plus example tickets across the ticket lifecycle.
It refuses to run outside development mode or against a non-local MongoDB host.
Production catalogs must still be loaded using the deployment's approved
database provisioning procedure.

## Install and start

```sh
npm ci
npm run seed:dev --workspace=@support-ticket-desk/backend
npm run dev
```

Seed the fake data after installing dependencies (the seed script uses the
backend workspace's `tsx` development dependency). It is safe to rerun: the
same sample records are updated instead of duplicated. Expected result: the
local development database contains departments, assignable staff and sample
tickets in Open, In Progress, Resolved, Closed and Archived states; Vite
serves the responsive frontend; `/api` requests are proxied to Express; the
backend connects to the configured MongoDB database and reports connection
failures explicitly.

## Run automated validation

```sh
npm run typecheck
npm run build
npm run test:frontend
npm run openapi:check --workspace=@support-ticket-desk/frontend
npm test
npm run test:contract
npm run test:integration
npm run lint
npm run security
./.harness/run-harness.sh
```

The harness is the mandatory combined gate. It runs lint, security/SAST, unit tests and API contract tests, reports PASS/FAIL for each and overall, and records structured evidence under `evidence/harness-results/`. A missing MongoDB test service, missing tool or failing gate is a failure, not a skipped pass.

## End-to-end acceptance scenarios

1. Create a ticket with valid title, description, active department and priority. Verify an Open ticket is returned with a unique reference and is still present after reload.
2. Attempt creation with whitespace-only or overlong text and verify field-specific validation errors and no persisted ticket.
3. Open the Open queue and then the Assigned queue. Apply status, priority and assignee filters together; verify all matching criteria are combined and clearing filters restores the view.
4. Assign an active support/operations staff member to an Open ticket and start it. Verify an unassigned ticket cannot enter In Progress.
5. Return the ticket to Open, explicitly unassign it, then verify assignment can be changed and it cannot be started again until an eligible assignee is selected.
6. Resolve an In Progress ticket with a non-empty note. Verify resolution without a note is rejected; revise the note while Resolved.
7. Explicitly reopen a Resolved ticket and verify it becomes Open. Change an inactive/ineligible assignee to an eligible staff member before starting.
8. Close the Resolved ticket only after explicit confirmation; canceling leaves it Resolved. Archive the Closed ticket only after a separate confirmation; canceling leaves it Closed.
9. Verify an Archived ticket is visible in the Archived view, retains the note and cannot be changed.
10. At 320 CSS pixels and supported desktop widths, complete the primary workflows without horizontal page scrolling; verify keyboard operation and record the WCAG 2.2 AA review.
11. Seed 2,000 tickets and measure list/filter actions; at least 95% must show matching results within 2 seconds under the agreed normal test conditions.

See [contracts/openapi.yaml](./contracts/openapi.yaml) for request/response and error details and [data-model.md](./data-model.md) for entities and lifecycle constraints. Record manual browser, accessibility and performance evidence using the locations and run identifiers defined in the constitution.
