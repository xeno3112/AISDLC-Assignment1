# Implementation Plan: Internal Issue Tracker

**Branch**: `main` (feature: `001-support-ticket-desk`) | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-support-ticket-desk/spec.md`; requested stack: React with Vite, Node.js with Express, REST, MongoDB with Mongoose, Vitest and React Testing Library for the frontend, and a suitable Node.js backend test framework.

## Summary

Build a responsive internal ticket-management web application that supports ticket intake, open/assigned/archived views, combined filtering, eligible assignment, lifecycle updates, resolution notes, and separately confirmed closure and archival. Use a TypeScript modular monolith with a React/Vite client and an Express REST service backed by MongoDB/Mongoose. Keep the OpenAPI contract as the interface reference, validate requests on the server, and enforce ticket transitions atomically. Use Vitest for frontend and backend tests, React Testing Library for user-facing behavior, and Supertest for the HTTP contract. Application authentication, individual permissions, notifications, and collaboration remain out of scope.

The user selected a lifecycle refinement during planning: explicitly reopening a Resolved ticket returns it to Open, so a staff member can reassign an inactive or ineligible assignee before moving the ticket to In Progress. The specification has been updated accordingly, and the project owner approved a corresponding major constitution amendment to version 2.0.0; the gates below are evaluated against that amended constitution.

## Technical Context

**Language/Version**: TypeScript for frontend and backend; Node.js 24 LTS baseline.

**Primary Dependencies**: React 19, Vite 8, Express 5, Mongoose 9, Zod for server request validation, Vitest 5 with `@vitest/coverage-v8`, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, Supertest, TypeScript, `openapi-typescript`, ESLint and `eslint-plugin-security`. Pin compatible releases in the root npm lockfile; verify package engine requirements when dependencies are selected.

**Storage**: MongoDB 8.0 baseline, accessed through Mongoose. Development and test databases MUST be separate. Tests use an isolated disposable MongoDB database.

**Testing**: Vitest for frontend component and backend unit/integration suites; React Testing Library and `user-event` for UI behavior; Supertest for API contract tests; OpenAPI document validation; ESLint and an ESLint security plugin through the required harness.

**Target Platform**: Current supported desktop browsers and mobile Safari/Chrome browsers per NFR-003; Node.js service on a privately reachable internal deployment.

**Project Type**: Responsive web application with a REST backend.

**Performance Goals**: At least 95% of list and filter actions display matching results within 2 seconds for up to 2,000 tickets (NFR-004).

**Constraints**: Responsive behavior at 320-1,920 CSS pixels; WCAG 2.2 AA; all business validation on the server; no authentication or per-person permissions; only active support/operations staff may be assigned; all error responses use a stable sanitized envelope; lifecycle writes must not persist invalid or partial transitions.

**Scale/Scope**: One internal application, a supplied department catalog and staff roster, ticket lists of up to 2,000 records for the stated performance goal, and the five lifecycle states Open, In Progress, Resolved, Closed and Archived.

## Constitution Check

### Pre-Design Gate

| Constitution requirement | Plan response | Gate |
|---|---|---|
| Approved, measurable requirements (Principle I) | The plan traces the user journeys and technical behavior to the acceptance scenarios, FR-001-FR-015, NFR-001-NFR-005 and SC-001-SC-005 in `spec.md`. | PASS |
| React + Node.js/Express; modular boundaries (Principle II) | React/Vite frontend and Express REST backend are separated into `src/frontend` and `src/backend`; routes, validation, business rules and persistence have distinct responsibilities. | PASS |
| Explicit, validated lifecycle (Principle III) | The approved state machine, eligible-assignee rules, mandatory resolution note, explicit reopen, and separate closure/archive confirmations are represented in the specification and API contract. | PASS |
| Testable, secure, accessible delivery (Principle IV) | Plan includes server validation, safe text rendering, WCAG 2.2 AA, responsive browser testing, deterministic unit/contract tests, at least 90% branch coverage for critical business logic, ESLint, and a SAST gate. | PASS |
| Reproducible evidence and human acceptance (Principle V) | The required harness, structured evidence, bounded repair cycle and pending human review are included in the planned project structure and validation approach. | PASS |
| Required Part-1A layout | The source, tests, harness, evidence and package-root layout below follows the constitution's mandatory structure. | PASS |
| No authentication / internal exposure | Authentication is explicitly excluded by the spec. Deployment MUST restrict reachability through the internal operating environment; the app does not claim user identity or per-person authorization. This deployment boundary remains an operational dependency. | PASS WITH DEPENDENCY |

No constitution deviation is proposed. All mandatory gates must pass before human review; automated success does not imply acceptance.

## Architecture and Key Decisions

1. **Modular monolith, not microservices.** One frontend and one backend share the feature domain and are built/tested from the Part-1A root. This is the simplest arrangement that satisfies the mandated React/Express boundaries.
2. **OpenAPI contract first for the REST surface.** `contracts/openapi.yaml` records endpoints, request/response schemas, validation errors and lifecycle conflicts. Frontend types are generated or checked from the document; server-side Zod schemas enforce runtime constraints. Contract tests and OpenAPI validation guard against drift.
3. **Server owns lifecycle and eligibility.** The client may guide users but cannot bypass server-side checks. An update service validates each transition and performs a conditional, single-document atomic update using the expected source status and any required assignee condition. Concurrent stale transitions return 409 without a partial write.
4. **Separate write actions for confirmation-sensitive operations.** Lifecycle actions use explicit transition actions. Closure and archival have separate routes that require `confirmed: true`; neither can be achieved by a generic status patch.
5. **Assigned view is global, not user-specific.** With authentication and identity out of scope, Assigned means all non-archived tickets with an assignee, as specified by FR-003. Status, priority and assignee filters further narrow the selected view.
6. **Department and staff catalogs are read-only in the app.** The deployment supplies active departments and staff records outside the application. The app exposes only the lookup data it needs; it does not add administration or identity-management screens.
7. **No activity stream or collaboration layer.** Persist the current ticket state and current resolution note; do not add comments, notifications, or audit-history features absent from the initial scope.
8. **Same-origin production routing.** Serve the client and route `/api` to Express through the internal deployment boundary. In development, Vite proxies `/api` to the backend. If the deployment uses separate origins, allow only explicitly configured origins; do not use wildcard CORS.

## Project Structure

### Documentation (this feature)

```text
specs/001-support-ticket-desk/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md                         # created by /speckit-tasks, not by planning
```

### Source Code (Part-1A root)

```text
Part-1A/
├── package.json                     # root scripts and npm workspaces
├── package-lock.json
├── tsconfig.base.json
├── src/
│   ├── frontend/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── app/                  # app shell, route composition
│   │       ├── api/                  # typed REST client, generated contract types
│   │       ├── components/           # shared accessible controls and feedback
│   │       ├── features/
│   │       │   ├── tickets/          # list, detail, intake, lifecycle actions
│   │       │   └── lookups/          # department and staff choices
│   │       └── styles/
│   └── backend/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── app.ts                # Express construction, no listen side effect
│           ├── server.ts             # config, DB connection, listen and shutdown
│           ├── config/
│           ├── middleware/           # request IDs, not-found and error mapping
│           ├── models/               # Mongoose Ticket, Department and StaffMember
│           └── modules/
│               ├── tickets/          # routes, request schemas, controller, service
│               ├── departments/      # read-only lookup
│               └── staff/            # read-only eligibility/assignee lookup
├── tests/
│   ├── unit/
│   │   ├── frontend/
│   │   └── backend/
│   └── contract/
│       └── api/                      # OpenAPI validation and Supertest scenarios
├── .harness/
│   ├── lint/
│   ├── security/
│   ├── test/
│   └── run-harness.sh
└── evidence/
    ├── initial-generation/          # First complete implementation and its baseline gate results
    ├── final-generation/            # Final implementation reference and post-repair gate results
    ├── harness-results/             # Structured output for every harness run, including repairs
    └── harness-log.md                # Chronological index linking evidence and run history
```

**Structure Decision**: The constitution mandates the `Part-1A/src/frontend`, `Part-1A/src/backend`, root `package.json`, top-level unit/contract test directories, `.harness/` and `evidence/`. npm workspaces provide a single install and root-level commands while keeping frontend/backend dependencies and runtime boundaries explicit. The Express app factory is separate from the server entry point so Supertest can exercise it without binding a fixed port.

**Generation Evidence Plan**:

- `evidence/initial-generation/` MUST preserve the first complete generated implementation reference, generation timestamp, approved spec/task references, and the initial harness summary/results before any automated repair. It is an evidence snapshot, not an additional code-generation phase.
- `evidence/final-generation/` MUST preserve the final implementation reference, generation/finalization timestamp, final harness summary/results, known limitations, and the pending human-review package after all repairs and revalidation. It is the final evidence snapshot, not an additional code-generation phase.
- The complete structured output for every run remains under `evidence/harness-results/`; the two generation folders hold the corresponding initial/final summaries and pointers or copies of their run artifacts. `evidence/harness-log.md` links the initial snapshot, every run and repair, and the final snapshot chronologically. Historical evidence MUST NOT be overwritten.

## API and Component Design

The REST contract is in [contracts/openapi.yaml](./contracts/openapi.yaml). It covers:

- `GET /api/v1/departments` and `GET /api/v1/staff` for deployment-supplied lookup data.
- `POST /api/v1/tickets`, `GET /api/v1/tickets`, and `GET /api/v1/tickets/{ticketRef}` for intake and retrieval.
- `PATCH /api/v1/tickets/{ticketRef}/assignee` for assignment changes allowed in Open or In Progress.
- `POST /api/v1/tickets/{ticketRef}/transitions` for start, return-to-open, resolve and explicit reopen actions. Reopening Resolved moves to Open; assignment can then be corrected before starting work.
- `PATCH /api/v1/tickets/{ticketRef}/resolution` for revising a note while Resolved.
- `POST /api/v1/tickets/{ticketRef}/close` and `/archive` for separate confirmed actions.

Core UI components are:

- **AppShell**: responsive navigation to Open, Assigned and Archived views; provides landmark structure and consistent status feedback.
- **TicketListPage**: view tabs, combined filters, result count, loading/error/empty states, and responsive ticket rows/cards.
- **TicketFilters**: labelled status, priority and assignee controls; filters combine with AND semantics and have a clear-all action.
- **TicketForm**: accessible title, description, department and priority fields with field-specific server validation feedback.
- **TicketDetailPage**: ticket facts, current owner and status; links to permitted actions only.
- **AssignmentControl**: limits new/replacement assignments to active eligible staff and permits unassignment only while Open.
- **LifecycleActions**: controls allowed by the current state; server conflicts are shown without optimistic success.
- **ResolutionNoteEditor**: requires a non-empty note to resolve; allows edits only while Resolved.
- **ConfirmationDialog**: distinct close/archive confirmation with keyboard focus management; cancel sends no mutation request.
- **Feedback components**: accessible loading, error, success and no-results states using semantic live regions where appropriate.

## Error Handling and Security

All API errors use the stable envelope `{ "error": { "code": "...", "message": "...", "fields": {}, "requestId": "..." } }`. `fields` is present for field-level validation errors and omitted when not applicable.

| HTTP status | Use |
|---|---|
| 400 | Malformed JSON, invalid query/path/body, missing required note or affirmative confirmation |
| 404 | Unknown ticket reference, department, or staff record |
| 409 | Invalid lifecycle transition, ineligible assignment, or attempt to unassign an In Progress ticket |
| 500 | Unexpected failure with a sanitized message and request ID only |

Validation runs on the server before persistence. Only allow-listed fields are accepted; Mongoose query operators and arbitrary update documents are never accepted from clients. Render ticket text as text, not HTML. Map Mongoose validation and duplicate-key failures to stable API errors. Central Express error middleware logs diagnostics without secrets and never returns stack traces. No 401/403 authentication flows are added because authentication and per-person permissions are excluded.

The service MUST NOT be exposed to an untrusted public network without an approved network boundary. Since there is no application authentication, network-level access restriction is a deployment prerequisite, not a feature implemented by this app.

## Testing and Validation Strategy

- **Frontend unit/component tests**: Vitest in a DOM environment, React Testing Library and `user-event`. Cover ticket form validation/submission, loading/empty/error/success states, combined filters, accessible names and keyboard interactions, lifecycle controls, and confirmation cancel/confirm behavior.
- **Backend unit tests**: Vitest for transition rules, assignment eligibility, request normalization, response/error mapping and boundary cases. Assert that disallowed transitions cannot reach persistence.
- **API contract/integration tests**: Supertest against the Express app factory and an isolated MongoDB test database. Validate OpenAPI syntax and exercise each route's success, 400, 404, 409 and sanitized 500 behavior as applicable; test server-side validation, persistence across reads, and conditional lifecycle writes.
- **Branch coverage**: Enforce at least 90% branch coverage for critical ticket-domain services and validation modules, as required by the constitution. Set explicit include/exclude scopes so generated code, test code and bootstrap code cannot inflate the result. All mandatory tests pass.
- **Browser and responsive checks**: Verify primary workflows on supported desktop and mobile browsers and at 320 CSS pixels; run keyboard and screen-reader-oriented checks, then record WCAG 2.2 AA evaluation evidence. DOM component tests alone do not prove responsive layout.
- **Performance check**: Seed 2,000 tickets; measure list/filter actions and verify the NFR-004 2-second p95 target. Add indexes only for observed list/filter access patterns and recheck the measured query.
- **Security and lint gates**: ESLint must report zero errors; an ESLint security plugin runs as a separate SAST gate. Review user-input handling, safe rendering, secret handling and sanitized errors. No unresolved critical or high SAST findings.
- **Harness and evidence**: `./.harness/run-harness.sh` runs lint, security/SAST, unit and API contract gates, continues independent gates where practical, and emits explicit per-gate and overall results. Each run has a unique ID, timestamp and commit/version reference; structured output preserves commands, stdout/stderr, exit codes, failed assertions, findings and evidence paths in `evidence/harness-results/`. The first complete implementation and its baseline result are also recorded under `evidence/initial-generation/`; the final implementation and final result are recorded under `evidence/final-generation/`. These are evidence snapshots, not separate generation phases. `evidence/harness-log.md` links both snapshots and every intervening run/repair chronologically.
- **Bounded repair and human review**: At most three repair attempts per genuine failure cycle. Each attempt records root cause separately from hypotheses and reruns the same gates without weakening requirements/tests. After automated validation, a human receives the implementation, evidence, security findings and limitations; review remains PENDING until an explicit ACCEPT/REJECT with justification, reviewer ID and timestamp is recorded.

## Constitution Check (Post-Design)

| Gate | Design evidence | Result |
|---|---|---|
| Spec-to-design traceability | API, data model, UI, errors and tests cover FR-001-FR-015 and NFR-001-NFR-005; measurable outcomes SC-001-SC-005 are in the validation strategy. | PASS |
| Required architecture | React/Vite, Node.js/Express, REST and MongoDB/Mongoose are explicit; modular boundaries are represented in the tree. | PASS |
| Lifecycle integrity | Each permitted state change is named; reopening returns to Open; closure/archive require distinct affirmative calls; writes are conditional and atomic. | PASS |
| Server validation and error contract | OpenAPI plus runtime validation, stable error codes, required statuses, safe error middleware, and no partial writes are designed. | PASS |
| Secure handling | User content is validated and safely rendered; client cannot submit arbitrary update paths; internal network restriction is an explicit deployment prerequisite. | PASS WITH DEPENDENCY |
| Tests, coverage, lint and SAST | Deterministic unit/API tests, >=90% critical branch coverage, mandatory lint/security gates, and all-mandatory-tests pass requirement are explicit. | PASS |
| Accessibility and performance | WCAG 2.2 AA, mobile/desktop browser coverage, 320-1,920 CSS pixel widths and 2-second p95 at 2,000 tickets are verifiable. | PASS |
| Harness, evidence, repairs, human acceptance | Required harness command, structured run results, evidence log, max-three repair attempts, and pending human decision are planned. | PASS |
| Required project structure | Source, tests, harness, evidence and root package paths match the constitution. | PASS |

No unresolved design-time `NEEDS CLARIFICATION` remains. Open operational questions from the specification (catalog ownership, retention policy and network boundary) are preserved as assumptions/dependencies rather than silently expanded into application features.

## Complexity Tracking

No constitution violations or unjustified architectural layers are proposed.
