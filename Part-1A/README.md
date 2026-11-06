# Support Desk

Support Desk is an internal ticket-tracking web application for support and
operations teams. Staff can record service issues, find and assign work, track
progress, document resolutions, and retain completed tickets for reference.

## Features

- Create tickets with a title, description, department, and priority.
- Browse Open, Assigned, and Archived queues; filter by status, priority, and
  assignee, including combined filters and clearable empty states.
- Assign and reassign tickets to active support or operations staff.
- Enforce the ticket lifecycle: Open, In Progress, Resolved, Closed, and
  Archived. Resolution requires a note; closing and archiving use separate
  confirmations.
- Reopen resolved tickets to Open, revise resolution notes while Resolved, and
  view archived tickets as read-only records.
- Preserve saved changes across reloads, provide validation and error feedback,
  and support responsive, keyboard-operable workflows.

Authentication, per-person permissions, comments/collaboration, and
notifications are intentionally outside the initial release. The application
assumes access is restricted by a trusted internal network boundary. Do not
expose this unauthenticated service to a public network.

## Technology

- Frontend: React 19, TypeScript, and Vite 8.
- Backend: Node.js 24, TypeScript, and Express 5.
- Storage: MongoDB 8 with Mongoose 9.
- Validation and tests: Zod, Vitest, React Testing Library, Supertest, and an
  OpenAPI contract.

## Run locally

### Prerequisites

- Node.js 24 LTS and npm.
- MongoDB 8 available locally. Docker can be used to run a disposable local
  MongoDB instance:

  ```sh
  docker run --rm --detach --name support-desk-mongo \
    -p 27017:27017 mongo:8.0
  ```

### Install and start

From the project root:

```sh
npm ci
export MONGODB_URI='mongodb://127.0.0.1:27017/internal_issue_tracker'
export MONGODB_TEST_URI='mongodb://127.0.0.1:27017/internal_issue_tracker_test'
npm run seed:dev --workspace=@support-ticket-desk/backend
npm run dev
```

The seed command creates a sample local department catalog, staff roster, and
tickets in different lifecycle states. It only runs in development mode and
only against a local MongoDB host. The `dev` script starts the Vite frontend
and Express backend; open the Vite URL printed in the terminal (normally
`http://localhost:5173`). The frontend proxies API requests to the backend on
port 3000 by default.

The `MONGODB_TEST_URI` must use a test-scoped database name. Automated
integration tests use the test database, not the development database.

## Validation

Run the combined mandatory gates:

```sh
./.harness/run-harness.sh
```

Individual checks are also available:

```sh
npm run typecheck
npm run build
npm run test:frontend
npm test
npm run test:contract
npm run test:integration
npm run lint
npm run security
```

Integration tests require a reachable test MongoDB. Harness results and
validation evidence are recorded under `evidence/`.

## Spec Kit SDD

This project was developed using Spec Kit's Specification-Driven Development
(SDD) workflow. The feature artifacts in
[`specs/001-support-ticket-desk/`](./specs/001-support-ticket-desk/) are the
source of truth for scope, architecture, API behavior, and implementation
tasks:

- [`spec.md`](./specs/001-support-ticket-desk/spec.md) defines user stories,
  acceptance scenarios, requirements, edge cases, and success criteria.
- [`plan.md`](./specs/001-support-ticket-desk/plan.md) records architecture,
  technical choices, project structure, and validation strategy.
- [`tasks.md`](./specs/001-support-ticket-desk/tasks.md) breaks implementation
  into ordered, traceable tasks.
- `contracts/`, `data-model.md`, `research.md`, and `quickstart.md` specify API,
  data, technical decisions, and local setup/acceptance scenarios.

The workflow is:

1. `/speckit-specify` turns a feature request into an approved specification.
2. Review the specification and clarify unresolved requirements.
3. `/speckit-plan` produces the architecture and implementation plan.
4. Review the plan, then `/speckit-tasks` generates dependency-ordered tasks.
5. `/speckit-implement` executes the tasks and validation gates.
6. `/speckit-converge` compares the implementation with the spec, plan, and
   tasks and appends any verified gaps for another implementation pass.

Spec Kit customization, templates, scripts, and workflow configuration are
under [`.specify/`](./.specify/). Human review and some external browser,
accessibility, and usability evaluations are tracked separately in
[`evidence/final-generation/`](./evidence/final-generation/); automated
validation does not substitute for human acceptance.
