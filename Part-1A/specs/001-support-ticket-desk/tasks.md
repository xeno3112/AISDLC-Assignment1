# Tasks: Internal Issue Tracker

**Input**: Design documents from `specs/001-support-ticket-desk/`

**Prerequisites**: Approved `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md`.

**Tests**: Required by the specification and constitution: deterministic unit and API contract tests, at least 90% branch coverage for critical business logic, and 100% of mandatory tests passing.

**Organization**: Tasks are grouped by approved user story. Every task uses the required checklist format and names the file to create or update.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Part-1A npm workspace, React/Vite client, Express service, and shared quality configuration.

- [X] T001 Create the npm workspace root scripts and Node.js 24 engine requirement in `package.json`.
- [X] T002 [P] Initialize the React 19/Vite 8 TypeScript workspace and its dev/build scripts in `src/frontend/package.json`.
- [X] T003 [P] Initialize the Express 5/Mongoose 9 TypeScript workspace and its dev/start scripts in `src/backend/package.json`.
- [X] T004 Configure shared TypeScript strictness and workspace type-check scripts in `tsconfig.base.json`.
- [X] T005 Configure ESLint for TypeScript, React, and the security plugin in `eslint.config.js`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish database safety, the Express app boundary, the API contract workflow, mandatory gates, and auditable evidence. These tasks block all story implementation.

- [X] T006 Define validated environment configuration for MongoDB, server port, and same-origin/CORS settings in `src/backend/src/config/env.ts`.
- [X] T007 Implement an isolated MongoDB connection lifecycle and reject any test database URI that is not explicitly test-scoped in `src/backend/src/config/database.ts`.
- [X] T008 Create an Express app factory without listen side effects and mount versioned API routers in `src/backend/src/app.ts`.
- [X] T009 Implement request IDs, not-found handling, sanitized error envelopes, stable status/code mapping, and secret-safe diagnostics in `src/backend/src/middleware/error-handler.ts`.
- [X] T010 Configure OpenAPI validation and generated/checked frontend TypeScript types from `specs/001-support-ticket-desk/contracts/openapi.yaml` in `src/frontend/package.json`.
- [X] T011 Configure the combined lint, security/SAST, unit, API-contract, and OpenAPI validation gates with explicit per-gate and overall results in `.harness/run-harness.sh`.
- [X] T012 Record every harness run's unique ID, timestamp, implementation reference, commands, output, exit codes, findings, and evidence paths in `evidence/harness-results/README.md`.
- [X] T013 Create the initial/final evidence snapshot guidance and chronological log starter with no-repair-cycle handling in `evidence/harness-log.md`.
- [X] T014 Create the initial-generation and final-generation snapshot instructions in `evidence/initial-generation/README.md` and `evidence/final-generation/README.md`.
- [X] T015 Implement the backend listen/shutdown entry point and explicit startup failure handling in `src/backend/src/server.ts`.

**Checkpoint**: Root scripts, runtime configuration, Express app factory, error envelope, OpenAPI tooling, harness, and evidence locations are available before story implementation.

---

## Phase 3: User Story 1 - Submit and find a service ticket (Priority: P1) — MVP

**Goal**: Staff can create a valid unassigned Open ticket and find it in the Open queue; invalid input is rejected with actionable field errors.

**Independent Test**: Create a ticket with a valid title, description, active department, and priority; verify its unique reference and Open status in the Open view and after reload. Submit blank, whitespace-only, and over-limit values and confirm no ticket is persisted.

### Tests for User Story 1

- [X] T016 [P] [US1] Test `POST /tickets`, `GET /tickets?view=open`, and `GET /tickets/{ticketRef}` success and error schemas against `contracts/openapi.yaml` in `tests/contract/api/ticket-api.test.ts`.
- [X] T017 [P] [US1] Test ticket and department schema defaults, required fields, bounds, enums, and active-department validation in `tests/unit/backend/ticket-api-schemas.test.ts` and `tests/unit/backend/models.test.ts`.
- [X] T018 [P] [US1] Test accessible ticket-form submission, field errors, loading/error states, and Open-list rendering in `tests/unit/frontend/ticket-intake.test.tsx`.

### Implementation for User Story 1

- [X] T019 [P] [US1] Define the Ticket schema in `src/backend/src/models/ticket.model.ts`; preserve `_id` 'Generated once; used to derive the unique human-readable reference `TKT-<24 uppercase hex characters>`.', `title` 'Trimmed; 1-120 characters after trimming; whitespace-only is invalid.', `description` 'Trimmed; 1-5,000 characters after trimming; whitespace-only is invalid. Rendered as plain text.', `departmentId` 'Must reference an active Department.', `priority` 'Low, Normal, High, Urgent.', `status` 'Open, In Progress, Resolved, Closed, Archived; defaults to Open.', `assigneeId` 'Optional while Open; a new or replacement assignment must target an active staff member with role `support` or `operations`. An existing assignment may become inactive and remain visible until corrected. Required and eligible while In Progress. Retain the prior assignee when reopening Resolved to Open; it may be corrected while Open.', `resolutionNote` 'Required and non-empty after trimming to transition In Progress -> Resolved; editable while Resolved; read-only once Closed; retained in Archived.', `createdAt` 'Set on creation; immutable.', and `updatedAt` 'Set on create and every successful state/note/assignment update.'
- [X] T020 [P] [US1] Define the read-only Department schema in `src/backend/src/models/department.model.ts`; preserve `_id` 'Stable identifier used by tickets and API payloads.', `name` 'Non-empty display label.', and `active` 'Only active departments are offered for new tickets.'
- [X] T021 [US1] Implement trimmed intake validation and creation rules in `src/backend/src/modules/tickets/ticket.schemas.ts`, accepting only `title`, `description`, `departmentId`, and `priority` and rejecting unknown fields.
- [X] T022 [US1] Implement ticket creation, unique `TKT-<24 uppercase hex characters>` reference serialization, Open-queue retrieval, and ticket detail retrieval in `src/backend/src/modules/tickets/ticket.service.ts` and `src/backend/src/modules/tickets/ticket-list.service.ts`.
- [X] T023 [US1] Implement `POST /tickets`, `GET /tickets`, and `GET /tickets/{ticketRef}` with field-level 400 errors, missing-resource 404 errors, and explicit persistence-failure responses in `src/backend/src/modules/tickets/ticket.routes.ts`.
- [X] T024 [US1] Implement active department lookup retrieval for the intake form in `src/backend/src/modules/departments/department.routes.ts`.
- [X] T025 [US1] Implement the typed frontend API client for department lookup, ticket creation, Open-list retrieval, and detail retrieval in `src/frontend/src/api/tickets.ts`.
- [X] T026 [P] [US1] Implement the accessible ticket-intake form with department and priority choices, field-level server feedback, and plain-text inputs in `src/frontend/src/features/tickets/TicketForm.tsx`.
- [X] T027 [P] [US1] Implement the responsive Open queue and empty/loading/error states with reference, title, department, priority, status, and assignee display in `src/frontend/src/features/tickets/TicketListPage.tsx`.
- [X] T028 [US1] Wire ticket intake and Open-list navigation into the application shell and ensure a successful creation is visible after reload in `src/frontend/src/app/App.tsx`.
- [X] T029 [US1] Verify creation and retrieval persistence through the real Express app and isolated MongoDB database in `tests/contract/api/ticket-integration.test.ts`.

**Checkpoint**: US1 independently supports valid ticket intake, Open queue visibility, persisted retrieval, and rejection of invalid input.

---

## Phase 4: User Story 2 - Triage and update assigned work (Priority: P1)

**Goal**: Staff can see Open and Assigned queues, combine and clear filters, assign eligible staff, and move work between Open and In Progress without violating assignment invariants.

**Independent Test**: With mixed-status, priority, and assignee records, verify Open/Assigned view membership and AND-combined filters. Assign an active support/operations member, start work, return it to Open, and reject inactive/ineligible assignments and unassigned In Progress transitions.

### Tests for User Story 2

- [X] T030 [P] [US2] Test Open, Assigned, and all-ticket queue membership, combined filters, pagination, and empty results against `contracts/openapi.yaml` in `tests/contract/api/ticket-integration.test.ts`, `tests/contract/api/ticket-api.test.ts`, and `tests/unit/backend/ticket-list.test.ts`.
- [X] T031 [P] [US2] Test assignment eligibility, reassignment, unassignment, and atomic Open/In Progress transitions in `tests/unit/backend/ticket-lifecycle-api.test.ts` and `tests/contract/api/ticket-integration.test.ts`.
- [X] T032 [P] [US2] Test combined filter interactions, clear-all behavior, assignment controls, and transition conflict feedback in `tests/unit/frontend/ticket-triage.test.tsx`.

### Implementation for User Story 2

- [X] T033 [P] [US2] Define the StaffMember schema in `src/backend/src/models/staff-member.model.ts`; preserve `_id` 'Stable identifier used by assignment and filtering.', `displayName` 'Non-empty staff label; returned only as needed for assignment/filter display.', `role` 'support, operations, or other.', and `active` 'Only active support/operations members can receive assignments.'
- [X] T034 [US2] Implement staff lookup so assignable results contain only active support/operations members and all-results include existing assignees for display/filtering in `src/backend/src/modules/staff/staff.routes.ts`.
- [X] T035 [US2] Implement AND-combined status, priority, and assignee filters, Open/Assigned/Archived/all view predicates, stable pagination, and empty result behavior in `src/backend/src/modules/tickets/ticket-list.service.ts`.
- [X] T036 [US2] Implement assignment/reassignment/unassignment checks in `src/backend/src/modules/tickets/ticket-assignment.service.ts` and conditional atomic Open-to-In Progress and In Progress-to-Open transitions in `src/backend/src/modules/tickets/ticket-lifecycle.service.ts`.
- [X] T037 [US2] Implement the ticket list query parameters and `PATCH /tickets/{ticketRef}/assignee` route with stable 400/404/409 error responses in `src/backend/src/modules/tickets/ticket.routes.ts`.
- [X] T038 [US2] Extend the typed frontend API client for queue filters, pagination, staff lookup, assignee updates, and non-confirmation transitions in `src/frontend/src/api/tickets.ts`.
- [X] T039 [P] [US2] Implement labelled status, priority, and assignee filters with AND semantics and clear-all behavior in `src/frontend/src/features/tickets/TicketFilters.tsx`.
- [X] T040 [P] [US2] Implement eligible assignment selection, reassignment, and Open-only unassignment controls in `src/frontend/src/features/tickets/AssignmentControl.tsx`.
- [X] T041 [US2] Integrate Open/Assigned queue tabs, filter state, assignment controls, and start/return-to-open actions in `src/frontend/src/features/tickets/TicketListPage.tsx`.
- [X] T042 [US2] Verify route-to-MongoDB queue/filter/assignment behavior, including inactive/ineligible assignees and failed conditional updates, in `tests/contract/api/ticket-integration.test.ts` and `tests/unit/backend/ticket-lifecycle-api.test.ts`.

**Checkpoint**: US2 independently demonstrates queue selection, combined filters, eligible assignment, and safe active-work transitions.

---

## Phase 5: User Story 3 - Resolve, close and archive tickets (Priority: P2)

**Goal**: Staff can resolve with a note, revise notes while Resolved, explicitly reopen to Open, close and archive only after separate confirmations, and view archived tickets read-only.

**Independent Test**: Move an assigned ticket through In Progress → Resolved → Closed → Archived; verify note validation/editability, reopen to Open and reassign before restarting, cancellation leaves state unchanged, and Archived is read-only.

### Tests for User Story 3

- [X] T043 [P] [US3] Test resolve, reopen, close, archive, required confirmation bodies, invalid transitions, and archived read-only behavior against `contracts/openapi.yaml` in `tests/contract/api/ticket-api.test.ts` and `tests/contract/api/ticket-integration.test.ts`.
- [X] T044 [P] [US3] Test permitted and rejected transitions, resolution-note validation/editability, assignment preconditions, and concurrent stale updates in `tests/unit/backend/ticket-lifecycle-api.test.ts` and `tests/contract/api/ticket-integration.test.ts`.
- [X] T045 [P] [US3] Test resolution-note requirements, explicit reopen-to-Open, separate close/archive dialogs, cancellation, and archived read-only UI in `tests/unit/frontend/ticket-lifecycle.test.tsx`.

### Implementation for User Story 3

- [X] T046 [US3] Implement the lifecycle transition matrix with conditional atomic writes, requiring a non-empty trimmed resolution note for In Progress-to-Resolved and explicit Resolved-to-Open reopening in `src/backend/src/modules/tickets/ticket-lifecycle.service.ts`.
- [X] T047 [US3] Implement resolution-note editing only while Resolved and return 409 for attempts after closure in `src/backend/src/modules/tickets/ticket-resolution.routes.ts`.
- [X] T048 [US3] Implement separate `POST /tickets/{ticketRef}/close` and `/archive` operations requiring `confirmed: true`, with no state change when confirmation is absent or false, in `src/backend/src/modules/tickets/ticket-lifecycle.routes.ts`.
- [X] T049 [US3] Extend the typed frontend API client for resolution-note updates, lifecycle actions, and separate confirmation requests in `src/frontend/src/api/tickets.ts`.
- [X] T050 [P] [US3] Implement the resolution-note editor with non-empty validation and Resolved-only edit behavior in `src/frontend/src/features/tickets/ResolutionNoteEditor.tsx`.
- [X] T051 [P] [US3] Implement keyboard-accessible close and archive dialogs that send no request on cancellation in `src/frontend/src/components/ConfirmationDialog.tsx`.
- [X] T052 [US3] Implement lifecycle action visibility, explicit reopen-to-Open, read-only Closed/Archived details, and Archived queue navigation in `src/frontend/src/features/tickets/TicketDetailPage.tsx`.
- [X] T053 [US3] Verify persistence, note retention, separate confirmations, cancellation behavior, and terminal Archived state through Supertest and the isolated MongoDB database in `tests/contract/api/ticket-integration.test.ts`.

**Checkpoint**: US3 preserves resolution details, enforces every lifecycle invariant, and keeps closed/archived records read-only as specified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete mandated quality gates, responsive/accessibility/performance verification, and reproducible initial/final evidence.

- [X] T054 [P] Add explicit Vitest branch coverage include/exclude scopes and enforce at least 90% branch coverage for critical ticket services and validation modules in `vitest.config.ts`.
- [X] T055 [P] Add a deterministic 2,000-ticket list/filter benchmark and verify that at least 95% of actions complete within 2 seconds in `.harness/test/ticket-list-performance.ts`.
- [X] T056 [P] Add the browser, viewport, keyboard, screen-reader, and WCAG 2.2 AA verification record template in `evidence/final-generation/accessibility-browser-results.md`.
- [ ] T057 Run the create/filter/status workflows in supported desktop browsers and mobile Safari/Chrome at 320-1,920 CSS pixels; evaluate 10 representative staff against SC-001 (<2 minutes to submit) and SC-002 (<1 minute to locate a ticket), and record browser/viewport versions, timings, WCAG 2.2 AA findings, and defects in `evidence/final-generation/accessibility-browser-results.md`. **Pending:** this environment provided only one Chromium session, no provisioned catalog, no screen reader, and no representative staff participants; partial viewport/keyboard observations are recorded, not substituted for the required evaluation.
- [X] T058 Verify that configuration, errors, database seed data, and harness output contain no secrets or sensitive data and record SAST findings/remediation in `evidence/final-generation/security-review.md`.
- [X] T059 Run the first complete implementation through `./.harness/run-harness.sh` and preserve the implementation reference, timestamp, approved criteria/task references, and baseline gate results before any repair in `evidence/initial-generation/initial-run.json`.
- [X] T060 For each genuine harness failure, record root cause separately from hypotheses, the exact diagnostic supplied to the coding agent, attempt number, modified files, and linked rerun; make at most three repair attempts and rerun the same gates in `evidence/harness-log.md`.
- [X] T061 Run the complete mandatory harness after repairs, verify every gate passes and no critical/high security findings remain, and preserve the final commit/version, timestamp, limitations, and pending human-review package in `evidence/final-generation/final-run.json`.
- [X] T062 Update the chronological harness log with every run, unchanged historical failures, repair links, final results, and explicit “no repair cycle was necessary” when applicable in `evidence/harness-log.md`.
- [X] T063 Execute every runnable scenario in `specs/001-support-ticket-desk/quickstart.md` and preserve the command outputs and measured results in `evidence/final-generation/quickstart-results.md`.
- [X] T064 Prepare a review package with implementation summary, test/harness evidence, security findings, known limitations, and a PENDING decision field for reviewer ID, timestamp, and justification in `evidence/final-generation/human-review.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002 and T003 can run in parallel after T001 establishes the workspace layout.
- **Foundational (Phase 2)**: Depends on Setup. T006-T010 establish shared runtime/API boundaries; T011-T014 establish mandatory validation/evidence. This phase blocks all story work.
- **User Story 1 (Phase 3)**: Depends on Foundational. It establishes ticket intake, the base Ticket/Department records, and Open-list retrieval.
- **User Story 2 (Phase 4)**: Depends on US1's Ticket/Department model, API client, and Open-list surface; it adds StaffMember, filters, assignment, and active-work transitions.
- **User Story 3 (Phase 5)**: Depends on US1 and US2's ticket persistence, assignee eligibility, and transition service; it adds resolution, confirmation, and archival behavior.
- **Polish (Phase 6)**: Depends on all three stories. Initial-generation evidence is captured before any repair; final-generation evidence is captured only after same-gate revalidation.

### User Story Dependencies

- **US1 (P1)**: After Foundational only; no dependency on another story. It is the MVP.
- **US2 (P1)**: After US1 because it extends the ticket list and assignment controls built on the US1 ticket persistence.
- **US3 (P2)**: After US2 because it uses the assignment invariant and shared transition/list surfaces, while adding the terminal lifecycle actions.

### Parallel Opportunities

- Setup: T002 and T003 can proceed in parallel after T001; T004 and T005 can proceed independently once workspace manifests exist.
- Foundational: Environment/database (T006-T007), app/error boundary (T008-T009), and documentation/type generation (T010) can be divided by file after workspace initialization. Evidence tasks T012-T014 are separate from implementation files.
- US1: Contract, backend unit, and frontend tests (T016-T018) are independent. Ticket and Department model work (T019-T020) is parallelizable. Ticket form and queue UI (T026-T027) are independent after the API client contract is available.
- US2: Contract, backend service, and UI tests (T030-T032) are independent. Staff schema (T033) can proceed in parallel with queue-service and UI work after US1. Filter and assignment controls (T039-T040) use distinct files.
- US3: Contract, service, and UI tests (T043-T045) are independent. Resolution editor and confirmation dialog (T050-T051) use distinct files; they integrate after the API client is available.
- Polish: Coverage, performance benchmark, and review-template work (T054-T056) can proceed in parallel. Do not run repair tasks concurrently with evidence capture or final revalidation.

### Dependency Graph

```text
Setup T001
  ├── T002, T003, T004, T005
  └── Foundational T006-T015
        └── US1 T016-T029
              └── US2 T030-T042
                    └── US3 T043-T053
                          └── Polish T054-T064
```

Within each story, acceptance tests and contract tests should be written before the implementation tasks they cover; service/model work precedes routes, and API work precedes UI integration.

## Parallel Example: User Story 1

```text
After Phase 2 is complete, these independent test files can be created together:
- T016: tests/contract/api/ticket-intake.test.ts
- T017: tests/unit/backend/ticket-intake.test.ts
- T018: tests/unit/frontend/ticket-intake.test.tsx

These model files can be implemented in parallel:
- T019: src/backend/src/models/ticket.model.ts
- T020: src/backend/src/models/department.model.ts

After T025 defines the API client, these UI files can proceed in parallel:
- T026: src/frontend/src/features/tickets/TicketForm.tsx
- T027: src/frontend/src/features/tickets/TicketListPage.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases.
2. Complete US1 tests, models, API endpoints, form, and Open queue.
3. Validate ticket creation, unique reference, Open status, invalid-input rejection, reload persistence, and mobile intake independently.
4. Stop for MVP review before proceeding to triage and lifecycle work.

### Incremental Delivery

1. Add US2 after MVP validation; validate queue views, combined filters, eligible assignment, and Open/In Progress transitions.
2. Add US3; validate required notes, reopen-to-Open, confirmation cancellation, closure, archival, and read-only terminal state.
3. Run all browser, accessibility, performance, lint, SAST, unit, API contract, and harness gates.
4. Preserve initial-generation results before repairs; preserve final-generation results after same-gate revalidation; submit for explicit human acceptance.

## Phase 7: Convergence

- [X] T065 CRITICAL: Conduct final human review and record an explicit ACCEPT decision with justification, reviewer identifier, and review timestamp in `evidence/final-generation/human-review.md` per Constitution V. **Reviewer's direction:** accepted the implementation with T066's remaining browser/accessibility/usability evaluations disclosed as pending; review occurred before T066 completion. See `evidence/harness-log.md`.
- [ ] T066 Complete supported-browser and assistive-technology workflows, WCAG 2.2 AA evaluation, and the 10-person submission/search usability study; provision the local catalog to complete create/filter/status workflows, remediate discovered defects, and record browser versions, viewport widths, timings, findings, and defects in `evidence/final-generation/accessibility-browser-results.md` per SC-001/SC-002/SC-005 and NFR-002/NFR-003 (partial). **Progress:** A Chromium walkthrough completed create, filter, assign, lifecycle, confirmation, and archive checks; responsive samples passed at 320, 1,280, and 1,920 CSS pixels. A skip-link routing defect was fixed and regression-tested. Supported-browser/device coverage, screen-reader and formal WCAG evaluation, and the 10-person study remain pending.
