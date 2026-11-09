<!--
Sync Impact Report
Version change: 1.1.0 -> 1.2.0
Modified sections: Technical & AI Safety Standards; Development Workflow & Quality Gates.
Modified principles: none.
Added sections: none.
Removed sections: none.
Follow-up TODOs: Implement the required JavaScript harness-log validation check and
the human-review decision validation sensor.
-->

# AI-Powered Support Ticket Classification Assistant Constitution

## Core Principles

### I. Typed, Modular Architecture
The frontend MUST use React with TypeScript. The backend MUST use Node.js with
Express and TypeScript. Code MUST be organized into cohesive modules with clear
responsibilities and separation between presentation, transport, domain logic,
LLM integration, and evaluation. Changes MUST preserve these boundaries. This
keeps the system understandable, independently testable, and maintainable.

### II. Explicit REST and Data Contracts
Backend interfaces MUST be resource-oriented REST APIs using appropriate HTTP
methods and status codes. The AI response MUST conform to a strict JSON schema
that defines required fields, types, and allowed values; schema validation MUST
run before results are accepted or returned. Invalid or incomplete inputs and
outputs MUST produce explicit, appropriate errors or uncertainty outcomes, not
success-shaped fallbacks. Explicit contracts make integrations predictable and
failures diagnosable.

### III. Safe, Grounded AI Behavior
LLM behavior is limited to ticket classification, priority prediction, and
summarization. Summaries MUST preserve essential ticket information and MUST NOT
introduce unsupported facts. Ambiguous or incomplete tickets MUST be represented
with explicit uncertainty or a request for clarification; malformed and
adversarial inputs MUST be rejected or handled within validated boundaries.
Model output MUST be treated as untrusted until validated. These rules prevent
plausible-sounding but unsupported or unsafe results from being treated as facts.

### IV. Accessible, Responsive User Experience
The interface MUST use reusable React components and meet applicable accessibility
requirements, including keyboard access, semantic structure, and accessible
labels. Layouts MUST remain usable across supported viewport sizes. These
requirements make the assistant usable across devices and interaction needs.

### V. Measurable, Traceable Quality
Every AI behavior and quality claim MUST be evaluated against predefined,
measurable acceptance criteria. Evaluation MUST use one automated harness with
structural, invariant/property, and semantic/quality validation layers. Each
sensor MUST have an explicit acceptance threshold, and the aggregate score MUST
be at least 90% while every individual sensor threshold is met. Test cases,
sensors, specifications, and acceptance criteria MUST be traceable to one
another. Evaluation thresholds and guardrails MUST NOT be weakened, and difficult
cases MUST NOT be removed to obtain a passing result.

## Technical & AI Safety Standards

- Evaluation sensors MUST be separate JavaScript (`.js`) files in `.harness/`,
  invoked by one JavaScript evaluation runner.
- `evals/dataset.json` MUST contain at least 15 meaningful cases covering normal,
  boundary, ambiguous, malformed, and adversarial inputs.
- Evaluation results MUST be structured. `evidence/harness-log.md` MUST record
  genuine failures, repairs, and re-evaluation outcomes.
- The harness log MUST identify the model name and version, model configuration,
  and evaluation settings. It MUST record the predefined thresholds, scoring
  methodology, and results separately for structural, invariant/property, and
  semantic/quality validation.
- Every genuine harness failure MUST be recorded with its failing test case,
  generated output, violated requirement, and evidence supplied to the coding
  agent. Failures MUST NOT be fabricated. When evidence contains secrets or
  sensitive ticket data, the log MUST redact those values while retaining a
  safe, useful account of the evidence.
- Each repair MUST identify whether it changed application code, prompts,
  parsers, validators, or guardrails, and MUST include the subsequent
  re-evaluation results.
- A human MUST review the result after the final harness evaluation, regardless
  of whether automated evaluation passes or fails. The coding agent MUST request
  an explicit human ACCEPT or REJECT decision and justification before
  finalizing the project.
- `evidence/harness-log.md` MUST record the human decision, reviewer justification,
  known limitations, and residual risks. The decision MUST be explicitly
  attributable to the human reviewer. Automated results MUST NOT be presented as
  human acceptance, and the decision MUST NOT be assumed, fabricated, or
  automatically generated.
- API keys, secrets, and sensitive information MUST NOT be committed to source
  code or emitted in logs. Logs MUST NOT contain sensitive ticket content.
- Input validation and error handling MUST be applied at API and LLM boundaries.
  Errors MUST be explicit and MUST NOT expose secrets or sensitive data.
- The project MUST prefer simple, maintainable solutions over unnecessary
  complexity.

## Development Workflow & Quality Gates

- Critical logic MUST have automated tests. Changes MUST pass applicable tests,
  syntax checks, linting, and security checks before acceptance.
- The evaluation harness MUST run all three validation layers and report each
  sensor result, its threshold, and the aggregate score. Acceptance requires
  both the 90% aggregate minimum and every sensor-specific threshold.
- A JavaScript validation check in `.harness/` MUST verify that
  `evidence/harness-log.md` contains all mandatory sections and required evidence.
  Missing sections or evidence MUST cause the check to fail and be reported; the
  check MUST NOT imply acceptance when required evidence is absent.
- A JavaScript validation sensor in `.harness/` MUST verify that the log contains
  an explicitly reviewer-attributed ACCEPT or REJECT decision and non-empty
  justification before final acceptance. The sensor MUST fail when the human
  decision or justification is absent and MUST NOT generate or infer either.
- Project status MUST remain `PENDING_HUMAN_REVIEW` after final harness
  evaluation until the user explicitly supplies the human decision. While
  pending, the coding agent MUST request that decision. The project MUST NOT be
  marked complete or accepted before that explicit decision, regardless of
  automated evaluation outcome.
- Sensor thresholds MUST be stated in the acceptance criteria before evaluation;
  passing requires satisfying them without removing cases, disabling guardrails,
  or relaxing thresholds.
- Specifications, evaluation cases, sensors, and acceptance criteria MUST retain
  traceable identifiers or links so reviewers can follow each requirement
  through to its evidence.
- Reviewers MUST verify contract conformance, AI safety boundaries, accessibility,
  test results, and evaluation evidence for relevant changes.

## Governance

This constitution governs project specifications, design, implementation, and
review. Amendments MUST be made through a reviewed change that states its
rationale and impact on existing requirements, evaluation coverage, and
acceptance criteria. Changes MUST preserve traceability and MUST NOT lower
quality thresholds. Evaluation thresholds MUST NOT be weakened.

The version uses semantic versioning: MAJOR for backward-incompatible governance
changes or principle removals/redefinitions; MINOR for new principles or
materially expanded requirements; PATCH for clarifications and non-semantic
wording changes. Compliance MUST be checked during specification, implementation
review, and evaluation review. Any exception requires explicit documentation and
approval; it MUST NOT silently bypass a safety or quality gate.

**Version**: 1.2.0 | **Ratified**: 2026-11-09 | **Last Amended**: 2026-11-09
