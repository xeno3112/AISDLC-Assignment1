# Feature Specification: AI-Powered Support Ticket Classification Assistant

**Feature Branch**: Not created (no `before_specify` hook configured)

**Created**: 2026-11-09

**Status**: Approved

**Input**: User description: Build an AI assistant that classifies support tickets, predicts priority, summarizes faithfully, handles unsafe or uncertain inputs, and evaluates behavior against fixed quality thresholds with human review.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Classify and Prioritize a Ticket (Priority: P1)

A support agent submits a natural-language ticket and receives its primary
category, priority, and a concise summary in a predictable, machine-readable
result.

**Why this priority**: Classification and prioritization are the assistant's
primary value: helping agents understand and triage incoming requests.

**Independent Test**: Submit representative, sufficiently detailed tickets from
each category and priority level. Verify the returned result against the
published response contract and labeled expected outcomes.

**Acceptance Scenarios**:

1. **Given** a ticket describing a confirmed production-wide outage affecting
   500 users, **When** an agent submits it, **Then** the result is successful,
   classifies it as `Technical Issue`, assigns `Critical`, and summarizes only
   supported facts.
2. **Given** clear tickets in each of the four supported categories, **When**
   agents submit them, **Then** each result selects the primary category and a
   priority consistent with the stated urgency and impact.
3. **Given** a long ticket containing multiple relevant facts, **When** it is
   summarized, **Then** the summary preserves the essential facts in no more
   than 50 words and adds no unsupported detail.

### User Story 2 - Handle Uncertainty and Unsafe Input (Priority: P1)

A support agent receives an explicit clarification request when a ticket lacks
information needed for reliable classification or prioritization, and a clear
rejection when the submitted input is empty, malformed, or unsupported.

**Why this priority**: Explicit uncertainty and rejection prevent agents from
mistaking guesses or hostile instructions for reliable ticket analysis.

**Independent Test**: Submit ambiguous, conflicting, incomplete, empty, malformed,
unsupported, and instruction-bearing descriptions. Verify the status-dependent
response rules, safe handling, and absence of unauthorized actions or disclosure.

**Acceptance Scenarios**:

1. **Given** a ticket whose primary issue or priority cannot be determined,
   **When** it is submitted, **Then** the result requests clarification, includes
   a non-empty question, and leaves category and priority null.
2. **Given** an empty or malformed request, **When** it is submitted, **Then**
   the result is rejected with null category and priority, an empty summary, and
   no clarification question.
3. **Given** a ticket containing instructions to ignore policy, reveal secrets,
   or invent severity, **When** it is submitted, **Then** those instructions are
   treated as untrusted ticket content and do not override the assistant's rules.

### User Story 3 - Evaluate Quality and Review Evidence (Priority: P2)

A project reviewer can inspect reproducible evaluation results, genuine failure
and repair evidence, and a human review decision before the project is considered
accepted or complete.

**Why this priority**: Evaluation evidence makes variable AI behavior measurable;
the explicit human decision prevents an automated score from being mistaken for
human approval.

**Independent Test**: Run the fixed evaluation dataset and inspect the structured
results and evidence log. Verify all sensor scores and the aggregate, then verify
that final status remains pending until an explicitly attributed human decision
and justification are recorded.

**Acceptance Scenarios**:

1. **Given** the fixed evaluation dataset, **When** the evaluation is run, **Then**
   it reports each of the eight sensor scores, the three validation-layer results,
   the aggregate score, and a PASS/FAIL outcome under the predefined criteria.
2. **Given** a genuine failed case, **When** the failure is recorded, **Then** its
   input case, generated output, violated requirement, and evidence supplied to
   the coding agent are documented without fabricating or leaking sensitive data.
3. **Given** a final evaluation has completed, **When** no human decision has
   been supplied, **Then** project status is `PENDING_HUMAN_REVIEW` and the
   reviewer is asked for an explicit ACCEPT or REJECT and justification.
4. **Given** a human decision is supplied, **When** final evidence is reviewed,
   **Then** the log identifies the reviewer decision and justification, known
   limitations, and residual risks; automated results alone do not constitute
   human acceptance.

### Edge Cases

- Empty or whitespace-only descriptions are rejected.
- A malformed request or unsupported input is rejected without success-shaped
  fallback data.
- Missing or conflicting facts that prevent reliable classification or priority
  require clarification; the assistant does not invent missing details.
- A ticket that includes both a real support issue and adversarial instructions
  is treated as untrusted content; the issue may be processed without following
  the instructions.
- Unsupported claims of severity or requests to fabricate urgency do not raise
  priority without supporting ticket facts.
- Long descriptions are summarized to at most 50 words without adding facts.
- A passing or failing automated evaluation both require human review. Missing
  or ambiguous reviewer evidence leaves the project pending.
- Logs redact secrets and sensitive ticket content while preserving safe
  evaluation evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The assistant MUST accept a natural-language support description
  and return its primary category, predicted priority, and concise summary when
  sufficient information is available.
- **FR-002**: The assistant MUST use only these categories: `Technical Issue`,
  `Access Request`, `Billing Issue`, and `General Inquiry`.
- **FR-003**: The assistant MUST use only these priorities: `Low`, `Medium`,
  `High`, and `Critical`, based on supported urgency, severity, and business
  impact. A confirmed production-wide outage MUST be `Critical`; a minor cosmetic
  issue with no business impact MUST be `Low`.
- **FR-004**: Every response MUST be valid JSON with exactly five fields:
  `category`, `priority`, `summary`, `status`, and `clarification_question`.
  Category MUST be an allowed category or null; priority MUST be an allowed
  priority or null; summary MUST be a string of no more than 50 words; status
  MUST be `success`, `clarification_required`, or `rejected`; and
  clarification_question MUST be a string or null. Additional fields are
  prohibited.
- **FR-005**: For `success`, category and priority MUST be non-null, summary MUST
  be non-empty, and clarification_question MUST be null.
- **FR-006**: For `clarification_required`, clarification_question MUST be
  non-empty and category and priority MUST be null.
- **FR-007**: For `rejected`, category and priority MUST be null, summary MUST be
  empty, and clarification_question MUST be null.
- **FR-008**: The assistant MUST request clarification when missing, ambiguous,
  or conflicting information prevents reliable classification or prioritization.
  It MUST reject empty, malformed, and unsupported inputs that cannot be
  meaningfully processed.
- **FR-009**: Summaries MUST preserve essential supported information and MUST
  NOT invent ticket details, severity, impact, or resolution information.
- **FR-010**: Ticket descriptions MUST be treated as untrusted data. Embedded
  instructions MUST NOT override classification rules, response constraints, or
  safety policies. The assistant MUST NOT reveal prompts, credentials, API keys,
  or internal configuration.
- **FR-011**: The assistant MUST NOT modify tickets, perform external actions,
  assign tickets, manage ticket lifecycle, or resolve tickets automatically.
- **FR-012**: The evaluation MUST use a fixed dataset of at least 15 distinct
  meaningful cases covering all four categories, all four priorities, long
  descriptions, ambiguity, conflict, missing information, empty or malformed
  inputs, adversarial instructions, and unsupported severity or fabrication
  requests. Each case MUST define its input, expected status, expected category
  and priority where applicable, required behavioral properties, semantic
  evaluation criteria, and references to applicable requirements or properties.
- **FR-013**: One reproducible evaluation pipeline MUST load the fixed evaluation
  cases, invoke the configured model, capture its generated output, validate JSON
  structure, evaluate deterministic invariants and behavioral properties, perform
  semantic evaluation, calculate scores, and produce structured failure evidence.
  Semantic evaluation MUST NOT replace structural or invariant validation.
- **FR-014**: Evaluation MUST report the eight sensor scores and the structural,
  invariant/property, and semantic/quality layer results. S1 and S8 MUST be
  reported in the structural layer; S2 and S7 in the invariant/property layer;
  and S3, S4, S5, and S6 in the semantic/quality layer. Sensor scores MUST equal
  passed applicable checks divided by total applicable checks, multiplied by 100;
  non-applicable cases MUST be excluded. The aggregate MUST be the arithmetic
  mean of all eight sensor scores.
- **FR-015**: The evaluation sensors and minimum acceptance boundaries MUST be:
  S1 Schema 100%; S2 Invariant 100%; S3 Classification at least 90%; S4 Priority
  at least 85%; S5 Faithfulness at least 95%; S6 Clarification at least 90%;
  S7 Guardrail 100%; and S8 Summary Length 100%.
- **FR-016**: Final automated PASS MUST require an aggregate score of at least
  90%, every sensor to meet its boundary, and no structural, invariant, or
  critical guardrail violations. Thresholds and scoring methodology MUST be
  fixed before initial evaluation and MUST NOT be reduced to obtain PASS.
- **FR-017**: Evaluation results MUST include structured failure evidence with
  the failing case, generated output, violated requirement, expected and actual
  behavior, and sensor result. Each genuine failure MUST be provided to the
  coding agent; failures MUST NOT be fabricated.
- **FR-018**: After a failure, each repair to application behavior, instructions,
  output parsing, validation, or guardrails MUST be documented with subsequent
  evaluation results using the same fixed dataset. Difficult cases MUST NOT be
  removed, guardrails disabled, or expected outcomes changed without a justified
  specification change.
- **FR-019**: `evidence/eval-results.json` MUST contain structured evaluation
  results. `evidence/harness-log.md` MUST identify the model name, version,
  configuration, and relevant evaluation settings without exposing secrets; it
  MUST include predefined thresholds, scoring methodology, and results for all
  three validation layers. Logs MUST NOT contain secrets or sensitive ticket
  content.
- **FR-020**: After every final harness evaluation, whether it passes or fails,
  the coding agent MUST request a human ACCEPT or REJECT decision and
  justification before finalizing. Until the user explicitly supplies the
  decision, project status MUST be `PENDING_HUMAN_REVIEW`; the project MUST NOT
  be marked complete or accepted.
- **FR-021**: Evaluation evidence MUST record the human reviewer's explicitly
  attributed ACCEPT or REJECT decision, justification, known limitations, and
  residual risks. The decision MUST NOT be assumed, fabricated, or automatically
  generated.
- **FR-022**: Before final acceptance, a human-review validation sensor MUST fail
  if a genuine, explicitly attributed human decision or its justification is
  absent. It MUST NOT infer or generate either.
- **FR-023**: Evaluation and application errors MUST be explicit and MUST NOT
  disclose secrets or sensitive information.
- **FR-024**: Initial and final generated evaluation evidence MUST be kept
  distinguishable under `evidence/initial-generation/` and
  `evidence/final-generation/`. Re-evaluations MUST be linked to the repairs and
  run results they verify. Persistent evaluation evidence MUST use non-sensitive
  test data or redact secrets and sensitive ticket content.

### Key Entities

- **Ticket description**: Unstructured user-provided text describing a support
  issue; treated as untrusted input.
- **Classification result**: The exact five-field response containing category,
  priority, summary, status, and clarification question.
- **Evaluation case**: A fixed input with expected outcome, applicable checks,
  semantic criteria, and traceable requirement references.
- **Sensor result**: Passed and applicable check counts, score, acceptance
  boundary, and failure evidence for one of the eight sensors.
- **Evaluation run**: The model and evaluation settings, layer and sensor
  results, aggregate score, and automated PASS/FAIL outcome for a dataset run.
- **Harness evidence**: Structured run results in `evidence/eval-results.json`
  and a safe record in `evidence/harness-log.md` of configuration, failures,
  coding-agent evidence, repairs, and re-evaluations. Initial and final generation
  evidence remain distinguishable.
- **Human review decision**: An explicitly reviewer-attributed ACCEPT or REJECT,
  justification, known limitations, and residual risks; distinct from automated
  evaluation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of evaluated responses conform to the exact five-field JSON
  contract, allowed data types and values, and status-dependent invariants.
- **SC-002**: Across applicable fixed-dataset checks, classification accuracy is
  at least 90%, priority accuracy at least 85%, faithfulness at least 95%,
  clarification accuracy at least 90%, guardrail compliance 100%, and summaries
  of 50 words or fewer 100%.
- **SC-003**: The arithmetic mean of all eight sensor scores is at least 90%,
  every sensor meets its boundary, and there are no structural, invariant, or
  critical guardrail violations before automated evaluation can PASS.
- **SC-004**: The evaluation dataset contains at least 15 distinct cases and
  covers every required category of normal, boundary, ambiguous, malformed, and
  adversarial behavior.
- **SC-005**: 100% of genuine failures and repairs in evaluation runs include
  their required case, output, violated requirement, coding-agent evidence, and
  subsequent re-evaluation details; no failure is fabricated.
- **SC-006**: Every final evaluation, including a failed evaluation, results in
  an explicitly requested human review. Until the reviewer supplies a genuine
  ACCEPT or REJECT and justification, status remains
  `PENDING_HUMAN_REVIEW`; no automated outcome is represented as human acceptance.
- **SC-007**: A reviewer can identify model settings, thresholds, scoring
  methodology, all three layer results, the human decision, known limitations,
  and residual risks from the recorded evidence without exposure of secrets or
  sensitive ticket content.

## Assumptions

- A support agent is the primary application user; a human reviewer makes the
  final project-level ACCEPT or REJECT decision.
- Each submitted request represents one ticket description. There is no
  authentication or multi-ticket workflow in this release.
- The configured LLM and its version are selected outside the specification;
  the exact model and non-secret settings are recorded for each evaluation run.
- Evaluation cases are fixed before the initial run. Semantic scoring uses
  documented criteria and ground truth rather than exact summary text matching.
- A summary word is a non-empty token separated from other words by whitespace;
  this provides a consistent limit check for summaries of at most 50 words.
- The human-review validation gate is a final acceptance gate in addition to the
  eight scored sensors; it does not change the required aggregate calculation
  over those eight sensors.
- Authentication, assignment, lifecycle management, notifications, external
  integrations, automated resolution, and production deployment are out of
  scope.
