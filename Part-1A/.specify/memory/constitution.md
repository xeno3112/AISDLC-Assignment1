<!--
Sync Impact Report
Version change: 1.0.0 -> 2.0.0 (major lifecycle compatibility change).
Modified principles: None; amended the lifecycle in Architecture and Product Constraints.
Reason: The project owner approved explicitly reopening Resolved tickets to Open so staff can
correct an inactive or ineligible assignee before work resumes.
Compatibility impact: Reopening now requires a separate Open -> In Progress action; systems or
tests that previously reopened directly to In Progress must adopt the intermediate Open state.
Approval: Project owner approval received during planning on 2026-11-06.
Follow-up: The feature specification, plan, data model and API contract were aligned. The
implementation task list and lifecycle tests must preserve the new transition.
Original adoption date remains TODO(RATIFICATION_DATE).
-->

# Support Ticket / Issue Desk Constitution

## Core Principles

### I. Approved, Measurable Requirements
Every critical workflow MUST trace to an approved specification and measurable acceptance
criteria before implementation begins. Specifications MUST define observable behavior, validation,
error cases, and acceptance tests. Plans and task lists MUST preserve those links. This prevents
implementation decisions from silently replacing user-approved behavior.

### II. Modular React and Express Architecture
The frontend MUST use React and the backend MUST use Node.js with Express. Code MUST separate
reusable UI components, HTTP routing and handling, business logic, and persistence behind clear
module boundaries. APIs MUST use appropriate REST methods and status codes with consistent,
documented request and response schemas. State management MUST remain maintainable, and solutions
MUST favor the simplest design that meets approved requirements.

### III. Explicit, Validated Ticket Lifecycle
Ticket behavior MUST follow the state machine and assignment rules in Architecture and Product
Constraints. Invalid transitions, missing required data, and unauthorized actions MUST be rejected
with stable, actionable error responses. Resolution, closure, and archival MUST each preserve the
required notes or explicit confirmation. These rules make ticket progress predictable and testable.

### IV. Testable, Secure, Accessible Delivery
Requirements MUST drive deterministic unit and API contract tests. Critical business logic MUST
achieve at least 90% branch coverage, and 100% of mandatory tests MUST pass. ESLint MUST report
zero syntax or lint errors; security scans MUST have zero unresolved critical or high-severity
findings. User-facing functionality MUST target WCAG 2.2 AA and provide responsive layouts, semantic
HTML, accessible controls, clear validation, loading states, and actionable error feedback.

### V. Reproducible Evidence and Human Acceptance
Every mandatory validation run MUST produce auditable, structured gate results and preserve its
supporting evidence. Genuine failures MAY trigger at most three automated repair attempts per
validation cycle; every repair MUST rerun the same gates without weakening approved requirements or
tests. Automated success MUST NOT be treated as human approval. Final acceptance requires all
mandatory gates to pass and an actual, recorded human ACCEPT decision.

## Architecture and Product Constraints

- The application MUST support ticket creation, viewing, filtering, assignment, status and progress
  updates, resolution notes, explicit closure confirmation, and explicit archival confirmation.
- A new ticket MUST start in Open. The only permitted transitions are:
  - Open -> In Progress
  - In Progress -> Open
  - In Progress -> Resolved
  - Resolved -> Open, when explicitly reopened, so assignment may be corrected before work resumes
  - Resolved -> Closed, after explicit closure confirmation
  - Closed -> Archived, after explicit archive confirmation
  Archived is terminal. Any transition not listed here MUST fail with HTTP 409.
- An Open ticket MAY be unassigned. A ticket in In Progress MUST have exactly one assignee.
  Assignment, reassignment, and unassignment are permitted only while a ticket is Open or In
  Progress. An assignee MUST be an active user with the eligible role defined by the approved
  specification. Invalid or ineligible assignments MUST be rejected; the specification MUST define
  the role and authorization rules before implementation.
- Moving a ticket to Resolved MUST require a non-empty resolution note. Closure and archival MUST
  each require a distinct affirmative user confirmation; a status update alone is not confirmation.
  The API contract MUST define how each confirmation is represented and tested.
- Request validation MUST occur on the server. APIs MUST return a consistent error envelope with a
  stable machine-readable code and actionable message; field-level validation errors MUST identify
  invalid fields. Malformed or invalid requests MUST return 400, missing resources 404, and
  lifecycle or assignment conflicts 409. Authentication and authorization failures MUST use 401 or
  403 as applicable. Unexpected errors MUST return a sanitized 500 response without stack traces,
  secrets, or internal implementation details.
- User-controlled data MUST be validated and safely rendered. Persistence operations MUST be
  parameterized where applicable. Implementations MUST prevent injection, cross-site scripting,
  and hardcoded secrets, and MUST use secure error handling.
- The mandatory implementation structure under `Part-1A/` is:

  ```text
  Part-1A/
  ├── .specify/
  │   ├── memory/constitution.md
  │   ├── scripts/
  │   └── templates/
  ├── specs/001-support-ticket-desk/
  │   ├── spec.md
  │   ├── plan.md
  │   ├── tasks.md
  │   └── contracts/
  ├── src/
  │   ├── frontend/
  │   └── backend/
  ├── tests/
  │   ├── unit/
  │   └── contract/
  ├── .harness/
  │   ├── lint/
  │   ├── security/
  │   ├── test/
  │   └── run-harness.sh
  ├── evidence/
  │   ├── initial-generation/
  │   ├── final-generation/
  │   ├── harness-results/
  │   └── harness-log.md
  └── package.json
  ```

  Planning and implementation MUST create and verify this structure at the appropriate stages;
  constitution generation MUST NOT create it. Spec Kit configuration and generated specifications
  MUST be preserved. Scripts that are required to run MUST be executable, not documentation-only
  placeholders.

## Spec Kit Workflow and Quality Enforcement

- `/speckit-specify` MUST define ticket workflows, assignment and lifecycle rules, validation,
  security, accessibility, API contracts, and measurable acceptance criteria. No critical workflow
  may proceed to implementation without approved criteria.
- `/speckit-plan` MUST design the React/Express module boundaries, required project structure,
  contracts, test strategy, harness, evidence locations, bounded repair loop, and human review.
- `/speckit-tasks` MUST create dependency-ordered tasks for application behavior, unit and API
  contract tests, all harness gates, evidence generation, repair and revalidation, and human review.
- `/speckit-implement` MUST execute approved tasks, run mandatory checks, preserve evidence, and
  prepare a review package. It MUST NOT weaken requirements, tests, or gates to obtain a pass.
- The executable harness MUST provide one documented command that runs ESLint syntax/lint,
  security/SAST (such as Semgrep or an ESLint security plugin), unit tests, and API contract tests.
  From the `Part-1A/` root, that command MUST be `./.harness/run-harness.sh`.
  It MUST report explicit PASS or FAIL results for every gate and the overall run, and acceptance
  MUST be blocked if any mandatory gate fails. Independent gates MUST continue after a failure when
  practical, without masking it.
- Each harness execution MUST have a unique run identifier, timestamp, and implementation version
  or commit reference. It MUST capture commands, stdout, stderr, exit codes, failed assertions,
  security findings, and evidence paths in structured results. Logs MUST exclude secrets and
  sensitive information.
- Self-healing MUST use only failures from actual harness executions. The recorded evidence supplied
  to the coding agent MUST state the failed test or rule, expected and observed behavior, diagnostic
  output, and evidence location. Each repair MUST record the confirmed root cause separately from
  hypotheses, attempt number, modified files, change reference, same-gate revalidation results, and
  whether the original failure was resolved. After three unsuccessful repair attempts, the failure
  MUST be escalated; checks MUST NOT be bypassed. If no genuine failure occurs, the log MUST say no
  repair cycle was necessary.
- `evidence/harness-log.md` MUST be chronological and auditable. It MUST record initial agent and
  generation timestamp, approved criteria and tasks, initial implementation reference and evidence;
  every run and gate result; genuine failure evidence and the exact information supplied to the
  coding agent; linked repair and revalidation history; final implementation, results, evidence,
  limitations, and human review. Initial evidence MUST be preserved before repairs, historical
  failures MUST NOT be overwritten, and each repair MUST link to its triggering failure and
  subsequent run.
- Human review MUST occur after automated validation. Final review MUST present the implementation,
  harness and test evidence, security findings, and known limitations. The decision MUST remain
  PENDING until a human provides an explicit ACCEPT or REJECT with justification, reviewer
  identifier, and review timestamp. Automated checks MUST NOT create or imply a human decision.

## Governance

This constitution governs specification, planning, implementation, testing, automated validation,
self-healing, evidence generation, and final human review. If a practice conflicts with this
constitution, the conflict MUST be resolved before the affected work proceeds.

Amendments MUST document the reason, affected principles, compatibility impact, and required
follow-up changes to specifications, plans, tasks, tests, or harnesses. The amended constitution
MUST be reviewed and approved by the project owner. Versioning follows semantic versioning:
MAJOR for incompatible governance changes, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications and non-semantic corrections. Compliance MUST be checked
at specification, planning, implementation, and final human review; deviations require explicit
approval and MUST NOT waive a mandatory quality gate.

**Version**: 2.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-11-06
