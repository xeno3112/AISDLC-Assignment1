# Data Model

## Core entities

### TicketSubmission
Represents the input provided by a support agent for classification.

| Field | Type | Notes |
|---|---|---|
| description | string | Required, user-provided text. Empty or whitespace-only values are rejected. |
| source | string | Optional client or integration identifier; not required for baseline release. |
| createdAt | datetime | Server timestamp when the submission is received. |

Validation rules:
- `description` must be a non-empty string after trimming whitespace.
- The backend must reject malformed payloads and unsupported input patterns before invoking the model.
- The data is treated as untrusted and must never override system rules.

### ClassificationResult
Represents the exact machine-readable classification response returned by the API.

| Field | Type | Notes |
|---|---|---|
| category | enum/null | Allowed values: `Technical Issue`, `Access Request`, `Billing Issue`, `General Inquiry` or `null`. |
| priority | enum/null | Allowed values: `Low`, `Medium`, `High`, `Critical` or `null`. |
| summary | string | Maximum 50 words; must be empty for rejected responses. |
| status | enum | One of `success`, `clarification_required`, `rejected`. |
| clarification_question | string/null | Required when status is `clarification_required`; null otherwise. |

Validation rules:
- `status = success` requires non-null `category`, non-null `priority`, non-empty `summary`, and `clarification_question = null`.
- `status = clarification_required` requires non-empty `clarification_question`, `category = null`, and `priority = null`.
- `status = rejected` requires empty `summary`, `category = null`, `priority = null`, and `clarification_question = null`.
- Additional keys are prohibited.

### EvaluationCase
Represents a fixed, reproducible test case used by the harness.

| Field | Type | Notes |
|---|---|---|
| id | string | Stable identifier for the case. |
| input | string | Ticket text or malformed input. |
| expectedStatus | enum | `success`, `clarification_required`, or `rejected`. |
| expectedCategory | enum/null | Category expected for successful or clarifying cases. |
| expectedPriority | enum/null | Priority expected for successful or clarifying cases. |
| requiredBehavior | string[] | Behavioral checks to enforce. |
| semanticCriteria | string[] | Quality expectations such as faithfulness or safe summarization. |
| requirementRefs | string[] | Requirement tags like `FR-001`, `FR-004`, `FR-015`. |

Validation rules:
- The dataset must contain at least 15 cases covering normal, boundary, ambiguous, malformed, and adversarial inputs.
- The case set must remain fixed before initial evaluation and must not be silently pruned.

### SensorResult
Represents the output of a single evaluation sensor.

| Field | Type | Notes |
|---|---|---|
| name | string | Example: `S1 Schema`, `S2 Invariant`, `S3 Classification`. |
| passed | number | Number of passed checks for that sensor. |
| applicable | number | Number of applicable checks. |
| score | number | Pass percentage for the sensor. |
| threshold | number | Required minimum score as a percentage. |
| status | enum | `pass` or `fail`. |
| evidence | string[] | Failure details or observations. |

### SafeModelFailureDiagnostic
Represents a non-content diagnostic for an LLM classification failure. It is
used to distinguish transport/completion, JSON parsing, and response-contract
failures in tests and evaluation evidence without retaining raw model output.

| Field | Type | Notes |
|---|---|---|
| stage | enum | `provider`, `parse`, or `schema`. |
| code | string | Stable machine-readable error code; never an exception message containing model data. |
| issuePaths | string[] | Optional schema field paths, such as `summary`; excludes rejected values and ticket content. |
| outputSha256 | string/null | Optional hash of returned text for correlation; the text itself is not persisted. |

Validation rules:
- Diagnostic values MUST NOT include ticket text, raw model output, credentials,
  or Zod issue input values.
- Diagnostics supplement, and MUST NOT weaken or bypass, classification
  contract validation.

### HumanReviewDecision
Represents the human review result recorded after the final evaluation.

| Field | Type | Notes |
|---|---|---|
| reviewer | string | Human reviewer identity or attribution. |
| decision | enum | `ACCEPT` or `REJECT`. |
| justification | string | Non-empty reason for the decision. |
| knownLimitations | string | Known residual limitations or risks. |
| residualRisks | string | Remaining risks or unaddressed concerns. |
| timestamp | datetime | When the review was recorded. |

Validation rules:
- The decision must be explicitly attributable to a human reviewer.
- Missing decision or justification must fail the human-review validation sensor.
- Automation alone is never treated as acceptance.

## Relationships
- One `TicketSubmission` produces one `ClassificationResult`.
- One `EvaluationCase` can be evaluated by many `SensorResult` records in a run.
- One evaluation run aggregates many `SensorResult` records and one `HumanReviewDecision`.
- A failed model invocation may produce one `SafeModelFailureDiagnostic` linked
  to its evaluation case; it does not produce a success-shaped classification.
- `HumanReviewDecision` is a final gating artifact, not a replacement for the automated evaluation results.

## State transitions

### Classification states
- `draft`: client has not yet submitted the ticket.
- `submitted`: request has been received.
- `success`: model output validated and returned to the user.
- `clarification_required`: incomplete or ambiguous ticket; user must answer a question.
- `rejected`: empty, malformed, or unsupported input; no success-shaped fallback is returned.
- `pending_review`: final evaluation is complete but no human ACCEPT/REJECT is yet recorded.

### Review states
- `evaluated`: automated results exist.
- `pending_human_review`: automated evaluation is complete, but the human decision is missing.
- `accepted`: reviewer explicitly ACCEPTs the project after evaluation review.
- `rejected`: reviewer explicitly REJECTs the project or specific change set.
