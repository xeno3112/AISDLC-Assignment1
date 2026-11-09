# Tasks: AI-Powered Support Ticket Classification Assistant

**Input**: Design documents from `specs/001-classify-support-tickets/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/support-ticket-api.yaml`

**Tests**: Automated tests are included because the project constitution requires critical logic to have automated tests.

**Organization**: Tasks are grouped by user story. Complete Setup and Foundational tasks first; user stories are then independently testable, subject to the decision gates below.

## Decisions required before implementation

- [x] The user approved the feature specification for implementation on 2026-11-09.
- [x] The user selected Google Gemini; configured default is Gemini 3.8 Flash (`gemini-3.8-flash`), with provider configuration through environment variables.
- [x] Decide the semantic/quality evaluation method and evaluator configuration before Phase 5. **Decision**: a configured Gemini structured judge scores documented S3-S6 criteria with a fixed boolean rubric; schema, invariant, and guardrail sensors remain independent.
- [x] Confirm the intended human-review interaction and persistence before Phase 5. **Decision**: a reviewer records the explicit decision and required details in `evidence/human-review.json`, tied to the current evaluation run ID.

Do not lower sensor thresholds, change dataset expectations to obtain PASS, or log secrets or sensitive ticket text while resolving these decisions.

## Phase 1: Setup

**Purpose**: Initialize the application packages and test/build commands described by `plan.md`.

- [x] T001 Create the root npm workspace manifest and shared `dev`, `test`, `lint`, `build`, and `eval` scripts in `package.json`.
- [x] T002 [P] Create the Node.js 20, Express 4, TypeScript, Mongoose, and test-tool package configuration in `backend/package.json` and `backend/tsconfig.json`.
- [x] T003 [P] Create the React 18, Vite 5, TypeScript, Vitest, and React Testing Library package configuration in `frontend/package.json`, `frontend/tsconfig.json`, and `frontend/vite.config.ts`.
- [x] T004 [P] Add backend and frontend environment-variable examples, excluding real credentials, in `backend/.env.example` and `frontend/.env.example`.
- [x] T005 [P] Configure repository ignores for dependencies, build output, local environment files, and generated artifacts in `.gitignore`.
- [x] T006 Add project-wide lint and formatting configuration compatible with the backend, frontend, and `.harness/` JavaScript files in `eslint.config.js` and `.prettierrc.json`.

---

## Phase 2: Foundational

**Purpose**: Establish shared contracts, API bootstrapping, safe errors, and evidence storage before story implementation.

- [x] T007 Define shared category, priority, status, request, response, and safe-error TypeScript types matching `specs/001-classify-support-tickets/contracts/support-ticket-api.yaml` in `backend/src/domain/classification/types.ts`.
- [x] T008 Implement request/response schema validation and all status-dependent invariants, including exactly five response fields and summaries of no more than 50 words, in `backend/src/domain/validation/classification-schema.ts`.
- [x] T009 Create the Express application, JSON parsing, health route, safe error middleware, and API route registration in `backend/src/app.ts` and `backend/src/api/routes/health.ts`.
- [x] T010 Implement redacting structured logging and environment configuration validation without emitting credentials or sensitive ticket content in `backend/src/config/env.ts` and `backend/src/utils/logger.ts`.
- [x] T011 Implement MongoDB connection configuration and Mongoose schemas for evaluation-run and human-review metadata (not raw sensitive ticket content) in `backend/src/config/database.ts` and `backend/src/models/`.
- [x] T012 Create backend and frontend test setup/configuration and a minimal health/build smoke test in `backend/vitest.config.ts`, `backend/tests/`, `frontend/vitest.config.ts`, and `frontend/tests/`.

**Checkpoint**: Packages build and test independently; the API health route and shared response contract are available to all stories.

---

## Phase 3: User Story 1 - Classify and Prioritize a Ticket (Priority: P1)

**Goal**: Accept a support description and return a validated category, priority, and faithful concise summary.

**Independent Test**: Exercise the documented `POST /tickets/classify` contract with clear examples across all categories and priorities, including a confirmed 500-user production-wide outage and a long description; verify exact response keys, supported values, and summary length.

### Tests for User Story 1

- [x] T013 [P] [US1] Add contract and API integration tests for valid submissions, the five-field result, allowed categories/priorities, and the 50-word summary limit in `backend/tests/contract/tickets-classify.test.ts` and `backend/tests/integration/tickets-classify.test.ts`.
- [x] T014 [P] [US1] Add component and app tests for ticket submission, loading, successful results, and safe API-error display in `frontend/tests/components/TicketForm.test.tsx` and `frontend/tests/app/App.test.tsx`.

### Implementation for User Story 1

- [x] T015 [US1] Implement the configurable LLM provider adapter with timeout and explicit provider failures in `backend/src/services/llm/provider.ts` and `backend/src/services/llm/`.
- [x] T016 [US1] Implement the classification prompt and model orchestration for the four allowed categories, four priorities, grounded summaries, and no ticket lifecycle actions in `backend/src/services/classification/classification-service.ts`.
- [x] T017 [US1] Validate all model output against `backend/src/domain/validation/classification-schema.ts`; reject invalid model output with explicit safe errors rather than success-shaped fallback data in `backend/src/services/classification/classification-service.ts`.
- [x] T018 [US1] Implement `POST /api/v1/tickets/classify` with request validation, classification service invocation, and contract-defined status codes in `backend/src/api/routes/tickets.ts` and `backend/src/app.ts`.
- [x] T019 [US1] Implement accessible ticket form, API client, result card, and error banner for success results in `frontend/src/components/TicketForm/`, `frontend/src/components/ResultCard/`, `frontend/src/components/ErrorBanner/`, `frontend/src/services/api.ts`, and `frontend/src/App.tsx`.
- [x] T020 [US1] Run the focused backend and frontend tests and correct defects in the related files under `backend/tests/` and `frontend/tests/`.

**Checkpoint**: A support agent can independently submit a ticket and receive only a schema-valid, grounded classification result.

---

## Phase 4: User Story 2 - Handle Uncertainty and Unsafe Input (Priority: P1)

**Goal**: Clarify uncertain tickets, reject malformed or unsupported requests, and treat ticket text as untrusted data.

**Independent Test**: Submit ambiguous, conflicting, incomplete, empty, malformed, unsupported, and instruction-bearing descriptions; verify clarification/rejection contract invariants, safe errors, and no unauthorized action or disclosure.

### Tests for User Story 2

- [x] T021 [P] [US2] Add API tests for whitespace-only and malformed requests, clarification-required results, conflicting/missing facts, adversarial instructions, and unsupported severity claims in `backend/tests/integration/ticket-safety.test.ts`.
- [x] T022 [P] [US2] Add UI tests for clarification-required and rejected responses, including null category/priority and empty rejected summary rendering, in `frontend/tests/components/ResultCard.test.tsx` and `frontend/tests/app/App.test.tsx`.

### Implementation for User Story 2

- [x] T023 [US2] Implement pre-model validation for empty, whitespace-only, malformed, and unsupported request bodies with explicit contract-compliant errors in `backend/src/domain/validation/ticket-submission.ts` and `backend/src/api/routes/tickets.ts`.
- [x] T024 [US2] Update classification orchestration to request clarification when relevant facts are missing, ambiguous, or conflicting, with null category and priority and a non-empty question in `backend/src/services/classification/classification-service.ts`.
- [x] T025 [US2] Add prompt-injection-resistant handling that treats ticket text as untrusted and prevents disclosure, fabricated urgency, and ticket lifecycle actions in `backend/src/services/classification/` and `backend/tests/integration/ticket-safety.test.ts`.
- [x] T026 [US2] Render clarification and rejection states without inventing category, priority, summary, or follow-up behavior in `frontend/src/components/ResultCard/` and `frontend/src/App.tsx`.
- [x] T027 [US2] Run the focused safety, contract, and UI tests and correct defects in `backend/tests/`, `frontend/tests/`, and the corresponding implementation files.

**Checkpoint**: Uncertain or unsafe inputs produce explicit, safe outcomes; ordinary successful classification from US1 remains functional.

---

## Phase 5: User Story 3 - Evaluate Quality and Review Evidence (Priority: P2)

**Goal**: Run the fixed dataset through one evaluation pipeline, report all sensors/layers and evidence, and require explicit human review.

**Independent Test**: Run the unchanged dataset and inspect all eight sensor scores, three layer results, arithmetic-mean aggregate, automated PASS/FAIL, failure/repair evidence, and review state. Verify pending status until an explicitly attributed human decision and non-empty justification are recorded.

### Tests for User Story 3

- [x] T028 [P] [US3] Add dataset validation tests for at least 15 distinct cases and coverage of all four categories, all four priorities, long descriptions, ambiguity, conflict, missing information, malformed/empty input, adversarial instructions, and unsupported severity/fabrication requests in `.harness/tests/dataset.test.js`.
- [x] T029 [P] [US3] Add sensor unit tests for applicable-check counts, each sensor boundary, non-applicable-case exclusion, and sensor-to-layer mapping in `.harness/tests/sensors.test.js`.
- [x] T030 [P] [US3] Add score and gate tests for passed/applicable percentage, the arithmetic mean of all eight sensors, unchanged thresholds, and mandatory structural/invariant/critical-guardrail failures in `.harness/tests/scoring.test.js`.
- [x] T031 [P] [US3] Add evidence and human-review tests for required run/failure/repair fields, redaction, pending status, and rejection of missing reviewer attribution or justification in `.harness/tests/evidence.test.js` and `.harness/tests/human-review.test.js`.

### Implementation for User Story 3

- [x] T032 [US3] Create the fixed, traceable dataset with at least 15 meaningful cases and each case's expected status/category/priority, behavioral properties, semantic criteria, and requirement references in `evals/dataset.json`.
- [x] T033 [US3] Implement S1 Schema at 100%, S2 Invariant at 100%, and S8 Summary Length at 100%, excluding non-applicable cases as specified, in `.harness/sensor-schema.js`, `.harness/sensor-invariant.js`, and `.harness/sensor-summary-length.js`.
- [x] T034 [US3] Implement S3 Classification at least 90%, S4 Priority at least 85%, S5 Faithfulness at least 95%, and S6 Clarification at least 90% using the approved semantic evaluator and documented criteria in `.harness/sensor-classification.js`, `.harness/sensor-priority.js`, `.harness/sensor-faithfulness.js`, and `.harness/sensor-clarification.js`.
- [x] T035 [US3] Implement S7 Guardrail at 100% for untrusted instructions, unsupported severity/fabrication requests, prohibited disclosures, and prohibited ticket actions in `.harness/sensor-guardrail.js`.
- [x] T036 [US3] Implement the single runner to load the fixed dataset, invoke the configured model, capture generated outputs for evaluation, run all sensors, report structural/invariant-property/semantic-quality layers, compute all scores and the eight-sensor arithmetic mean, and apply the 90% aggregate plus every sensor boundary and critical-failure gates in `.harness/runner.js`.
- [x] T037 [US3] Implement structured evaluation results, genuine failure evidence, coding-agent evidence, and repair/re-evaluation links in `evidence/eval-results.json` and `.harness/runner.js`, preserving `evidence/initial-generation/` and `evidence/final-generation/`.
- [x] T038 [US3] Implement safe harness logging of model name/version, non-secret configuration, settings, fixed thresholds, scoring method, all three layer results, failures, repairs, and re-evaluations in `evidence/harness-log.md` and `.harness/runner.js`; redact secrets and sensitive ticket content.
- [x] T039 [US3] Implement the mandatory harness-log completeness/redaction check in `.harness/harness-log-check.js` and connect it to `npm run eval` in `package.json`.
- [x] T040 [US3] Implement human-review validation that fails absent a genuinely attributed ACCEPT/REJECT and non-empty justification, while preserving `PENDING_HUMAN_REVIEW` and recording limitations and residual risks in `.harness/sensor-human-review.js` and `backend/src/domain/review/`.
- [x] T041 [US3] Implement the final-evaluation interaction that requests human ACCEPT/REJECT and justification after every final PASS or FAIL without inferring a decision in `.harness/runner.js` and the approved review interface.
- [x] T042 [US3] Run dataset, sensor, scoring, evidence, and human-review tests; then run the same fixed dataset after any repair and link each re-evaluation to its repair in `.harness/tests/`, `evidence/eval-results.json`, and `evidence/harness-log.md`.

**Phase 5 verification note**: All automated test suites pass, and the unchanged fixed dataset has been re-evaluated in timestamped, linked runs. The latest run (`2026-11-09T06-35-01-889Z-bb81dec6`) is an automated FAIL (63.19%) due to Gemini request timeouts on seven cases and a semantic-judge error on one case. Human review ACCEPT is recorded for that exact run; it does not override the automated FAIL.

**Checkpoint**: Evaluation evidence is reproducible and redacted; automated PASS/FAIL is distinct from human acceptance, and review remains pending until explicitly recorded.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Verify documentation, complete integration checks, and keep project status accurate.

- [x] T043 [P] Update setup, local configuration, app execution, evaluation, threshold, evidence, redaction, human-review, and troubleshooting instructions in `specs/001-classify-support-tickets/quickstart.md` and `evals/README.md`.
- [x] T044 [P] Verify the API documentation matches the implemented validation/status behavior and five-field response contract in `specs/001-classify-support-tickets/contracts/support-ticket-api.yaml`.
- [x] T045 Run root lint, test, and build commands and validate every quickstart scenario without weakening the spec in `package.json` and `specs/001-classify-support-tickets/quickstart.md`.
- [x] T046 Verify final evaluation status is `PENDING_HUMAN_REVIEW` unless a real human decision is supplied, and record known limitations/residual risks without representing automated PASS as acceptance in `evidence/eval-results.json` and `evidence/harness-log.md`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No prerequisites. T002–T005 can proceed in parallel; T006 follows package/tool selection.
- **Foundational (Phase 2)**: Depends on Setup. T007–T012 establish the shared boundaries required by all stories.
- **US1 and US2 (Phases 3–4)**: Both depend on Foundational work. They share the classification endpoint and service, so implementation is primarily sequential; their separate frontend/backend tests can be prepared in parallel where files do not overlap.
- **US3 (Phase 5)**: Depends on the classification API from US1 and safe behavior from US2 so the real harness evaluates the implemented application. Dataset and harness unit-test scaffolding can begin after Setup, but model-backed pipeline execution waits for provider/evaluator decisions.
- **Polish (Phase 6)**: Depends on desired user stories and evaluation workflow being complete.

### User story dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on another story.
- **US2 (P1)**: Starts after Foundational; depends on shared response types and the US1 endpoint/service and therefore integrates with US1.
- **US3 (P2)**: Requires the US1/US2 application path to evaluate, plus the provider, semantic-evaluation, and human-review decisions above.

### Parallel opportunities

- Setup package manifests and environment examples (T002–T005) can be prepared concurrently.
- US1 backend contract tests (T013) and frontend tests (T014) can be prepared concurrently.
- US2 API safety tests (T021) and frontend state tests (T022) can be prepared concurrently.
- US3 dataset, sensor, scoring, and evidence test suites (T028–T031) can be developed concurrently once the dataset/evidence contracts are agreed.
- Independent sensor modules (T033–T035) can be implemented in parallel after the dataset format and score-result interface are fixed.
- Quickstart and API-contract documentation updates (T043–T044) can proceed in parallel after behavior stabilizes.

## Parallel Example: User Story 3

After confirming the dataset schema and sensor-result interface, assign independent work:

```text
Task: Implement schema, invariant, and summary-length sensors in
      .harness/sensor-schema.js, .harness/sensor-invariant.js, and
      .harness/sensor-summary-length.js
Task: Implement classification, priority, faithfulness, and clarification
      sensors in their corresponding .harness/sensor-*.js files
Task: Implement the guardrail sensor in .harness/sensor-guardrail.js
Task: Implement dataset and sensor tests in .harness/tests/
```

## Implementation Strategy

### MVP first

1. Complete Setup and Foundational phases.
2. Resolve the provider/model choice.
3. Complete US1 and verify the classification contract with focused tests.
4. **Stop and validate the MVP**: demonstrate classification, grounded summary, schema validation, and UI states without claiming full evaluation acceptance.

### Incremental delivery

1. Add US2; validate ambiguity, rejection, and adversarial behavior independently.
2. Resolve semantic evaluator and human-review workflow decisions.
3. Add US3 dataset, sensors, aggregate gates, evidence, and human review.
4. Complete cross-cutting documentation and quality checks.
5. After every final harness run, request explicit human review; remain pending until supplied.

## Notes

- Every task uses the required `- [ ] Tnnn [P?] [USn?] description with file path` format; `[P]` appears only where the task can be done in parallel, and story labels appear only in story phases.
- S1–S8 boundaries are unchanged from FR-015: S1 Schema 100%; S2 Invariant 100%; S3 Classification at least 90%; S4 Priority at least 85%; S5 Faithfulness at least 95%; S6 Clarification at least 90%; S7 Guardrail 100%; S8 Summary Length 100%.
- The aggregate remains the arithmetic mean of all eight sensor scores; automated PASS still requires at least 90% aggregate, every sensor boundary, and no structural, invariant, or critical guardrail violations.
- `evals/dataset.json` must remain fixed during a run and contain at least 15 distinct cases. Re-evaluation uses that same dataset.
- `evidence/eval-results.json` and `evidence/harness-log.md` must not expose secrets or sensitive ticket content.
- Tasks do not implement production ticket assignment, modification, lifecycle management, or automated resolution.
