# Research Notes

## Decision: separate frontend and backend packages backed by MongoDB

The project will use a React + Vite frontend and a Node.js + Express API running as sibling packages in the same repository. The frontend handles ticket entry, validation feedback, and display of classification results. The backend validates input, calls the configured LLM, evaluates output against the JSON contract and guardrails, and persists evaluation evidence when needed.

### Rationale
- This matches the mandated architecture for the constitution: React + TypeScript on the frontend and Node.js + Express + TypeScript on the backend.
- A split application keeps UI concerns distinct from transport, AI orchestration, schema validation, and evaluation logic.
- MongoDB with Mongoose is explicitly approved in the planning input and fits the need for flexible document storage for evaluation cases, logs, and human-review metadata without forcing a complex relational model.

### Alternatives considered
- Single monolithic app: rejected because it would blend UI, API handling, AI validation, and evaluation logic, reducing testability and traceability.
- PostgreSQL: considered but rejected because the specification and user requirements explicitly selected MongoDB with Mongoose.
- Serverless-only API: rejected as a poor fit for local iterative evaluation work and the requirement for transparent review evidence.

## Decision: strict response contract enforced before acceptance

Every ticket classification result must conform to the five-field JSON response contract before it is returned to the frontend or logged as success.

### Rationale
- The constitution requires explicit REST and data contracts plus validation before results are accepted.
- The spec defines exact allowed categories, priorities, statuses, and invariants; a schema layer creates a guardrail against malformed or untrusted LLM output.
- Returning nulls for category/priority and empty summary on rejection is required by the feature spec and prevents success-shaped fallbacks.

### Alternatives considered
- Allowing partial or free-form model output: rejected because it would make the UI and tests brittle and violate FR-004 through FR-007.
- Accepting raw model output and fixing it in UI: rejected because validation must happen at both the API boundary and the LLM boundary.

## Decision: evaluation harness as a separate JavaScript layer under `.harness/`

The project will include a dedicated JavaScript evaluation runner and individual sensor files under `.harness/`, with evidence stored in `evidence/`.

### Rationale
- The constitution mandates separate JavaScript sensor files and a single runner, plus the final human-review gate.
- This design makes the evaluation pipeline reproducible and reviewable while keeping the code modular.
- The harness can validate structural JSON, invariant behavior, semantic quality, and the required human-review decision separately.

### Alternatives considered
- Embedding all checks into backend code: rejected because it would not satisfy the mandated evaluation architecture and is harder to review.
- Using a Python-based harness: rejected because the constitution explicitly requires JavaScript sensor files under `.harness/`.

## Decision: support tickets are treated as untrusted input and shaped into safe outputs

The model is permitted only to classify and summarize ticket text; it cannot invent facts, change the ticket, or act on the ticket lifecycle.

### Rationale
- The spec explicitly forbids embedded instructions from overriding rules and prohibits automatic actions beyond classification and summarization.
- This respects the constitution’s safe AI behavior requirements and reduces the chance of unsafe or unsupported output being treated as truth.

### Alternatives considered
- Letting the model decide whether to follow embedded instructions: rejected because it enables prompt-injection risk and invalid behavior.
- Allowing any free-form ticket updates or resolution actions: rejected as out of scope and contrary to FR-011 and the constitution.

## Decision: accessible, testable UI with clear states for success, clarifying questions, and rejection

The frontend will use a single ticket-entry form and a result panel that explicitly distinguishes success, clarification-required, and rejected states.

### Rationale
- The feature spec requires clear status semantics and accessibility for the support agent workflow.
- A clear UI state model helps both the user and any QA process when verifying the result contract, error states, and classification outcomes.

### Alternatives considered
- Ambiguous single-state result cards: rejected because they obscure whether the call was successful, clarification-required, or rejected.
- Inline-only error messages without dedicated result states: rejected because the specification requires explicit statuses and a machine-readable contract.

## Decision: evidence log and human review remain part of the application lifecycle

The project will maintain logs under `evidence/` and keep the project in `PENDING_HUMAN_REVIEW` until a reviewer explicitly supplies ACCEPT or REJECT with justification.

### Rationale
- The constitution requires explicit human review even after a passing evaluation.
- This directly addresses the requirement to separate automated scores from a real human decision, reducing the risk of false acceptance.

### Alternatives considered
- Auto-marking PASS after a good harness run: rejected because it violates the constitution and the feature specification.
- Treating a model or tool output as review: rejected because the decision must be attributable to a human reviewer.

## Decision: Gemini generateContent API with Gemini 3.8 Flash

The classification service uses Google's Gemini `generateContent` API (`POST /v1beta/models/{model}:generateContent`) with `gemini-3.8-flash` as its default model. It sends system instructions separately from ticket content, requests JSON output with `responseMimeType: application/json`, and validates the returned text against the application's Zod contract before returning it.

### Rationale
- The user selected Google Gemini for the implementation.
- Google's model documentation lists `gemini-3.8-flash` as a stable model with structured-output capability.
- Node.js 20 provides native `fetch` and abort-signal timeouts, so the API can be called without adding an SDK dependency.
- The API key, model name, API base URL, and request timeout are configurable through backend environment variables; credentials and ticket content are not included in application logs.

### Sources
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini 3.8 Flash model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [Generate content API reference](https://ai.google.dev/api/generate-content)
- [Structured outputs guide](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API key guidance](https://ai.google.dev/gemini-api/docs/api-key)

## Repair research: constrain classifier output and keep local validation

### Decision

Use the Gemini `generateContent` structured-output JSON schema facility in addition to `responseMimeType: application/json`, and continue parsing and validating every response with the existing Zod classification schema. Keep status-dependent invariants and the 50-word limit enforced locally unless the provider's supported schema subset can express them reliably; they must never depend solely on generation constraints.

### Rationale

- The official Gemini structured-output guide documents JSON Schema constrained output for structured classification.
- The GenerateContent API exposes output-format configuration. The request should use the current documented JSON-schema field supported by the selected model/API version rather than assuming JSON MIME alone enforces the five-field result.
- Generation constraints reduce avoidable formatting/enum errors but cannot establish that the classification is grounded, that a summary is faithful, or that a conflict merits clarification. Local schema validation and semantic evaluation remain necessary.
- The live evaluation records `InvalidClassificationOutputError` for the long case but does not retain safe diagnostics identifying parse versus schema failure. Instrument these distinct stages before attributing the failure to truncation, timeout, or model behavior.

### Alternatives considered

- Prompt-only JSON instructions: rejected as insufficient evidence of schema conformance; this is the current weaker behavior.
- Remove or relax Zod validation: rejected because model output remains untrusted and the exact API contract must be enforced locally.
- Persist raw model responses for diagnosis: rejected because logs must not contain ticket text or sensitive content. Persist only stable error codes, schema issue codes/paths, hashes, and existing safe output metadata.
- Increase the model timeout preemptively: rejected because the run recorded an invalid classification output, not a timeout. Change timeout only if measured latency or new diagnostics demonstrate a timeout problem.

### Follow-up from the linked repair run

The first re-evaluation after structured output recorded `gemini_request_timeout`
for `ambiguous-impact` under the configured 10,000 ms request limit. This is
distinct from the earlier `long-description` schema-invalid output. Raise the
default and local evaluation timeout to 30,000 ms based on that measured
timeout; keep timeouts explicit and do not add retries or success-shaped
fallbacks.

The classification request also uses a fixed generation seed (`0`) as a
best-effort repeatability setting. This does not make remote model evaluation
fully deterministic; preserve each run's timestamped outcomes and settings.

### Validation

Add request-shape tests asserting Gemini receives the JSON schema and response MIME type; add tests asserting parse and contract failures are distinguishable without leaking response values. Run these before the same fixed dataset re-evaluation.
