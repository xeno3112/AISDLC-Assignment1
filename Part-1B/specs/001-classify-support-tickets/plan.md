# Implementation Plan: AI-Powered Support Ticket Classification Assistant

**Branch**: `main` | **Date**: `2026-11-09` | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `./spec.md`

## Summary

Repair the current live-evaluation failures without changing the fixed dataset, expected outcomes, sensor thresholds, or five-field response contract. Constrain Gemini output with the supported structured JSON schema, retain Zod as the authoritative semantic/invariant validator, clarify category and contradiction handling in the classifier instructions, and improve safe failure diagnostics so the next run identifies whether invalid output arose during transport, JSON parsing, or schema validation. Verify with focused regression tests and a linked re-evaluation; preserve every prior run and request a new human review after that run.

## Targeted Repair Design

### Evidence and scope

The latest evaluation is `2026-11-09T05-56-54-497Z-a4e02c2c` (93.44%, automated FAIL). The concrete misses are:

- `long-description`: `InvalidClassificationOutputError`, causing failures in S1-S8 where applicable. The evidence does not preserve the provider text or validation issue, so the exact contract violation is not yet known.
- `access-critical-agent-lockout`: the safe recorded output category was `Technical Issue`; the expected category is `Access Request`.
- `ambiguous-impact`: the safe recorded output was `success` / `Technical Issue` / `Medium`; the expected behavior is clarification with null category and priority.

Do not treat the long-input issue as a timeout: the run records `InvalidClassificationOutputError`, while its configured timeout was 10,000 ms. First expose a safe diagnostic reason, then address the confirmed cause. Do not copy prompts, ticket contents, raw model output, or credentials into persistent evidence.

The first linked repair re-evaluation then recorded an actual `gemini_request_timeout` on `ambiguous-impact` at the previous 10,000 ms limit. Set the default and local evaluation timeout to 30,000 ms; retain explicit timeout diagnostics and do not add retries or weaken score gates.

### Planned changes

1. **Constrain generation at the provider boundary.** Keep the existing Gemini `generateContent` integration and JSON MIME request, and add Gemini's supported JSON-schema response configuration for the exact five fields and allowed enums/nulls. Keep status-dependent rules, the 50-word limit, and all cross-field invariants in `classificationResultSchema`; provider schema support is not a replacement for local validation. Verify the selected model accepts the schema before relying on it.
2. **Make failure diagnosis useful and safe.** Distinguish provider/finish-reason, JSON parse, and Zod contract failures with stable internal error codes. For validation errors, retain only safe structured metadata such as issue codes and field paths, not error input values or raw model output. Propagate the code to evaluation evidence while preserving the public API's existing explicit error behavior.
3. **Clarify category and uncertainty policy.** Define Access Request as the primary category when the requested outcome is restoring/changing user, administrator, or agent permissions; reserve Technical Issue for a malfunction in the system or access mechanism itself. Explicitly require clarification when the ticket contains materially conflicting impact facts, even if a plausible category/priority can otherwise be guessed. Preserve the existing prompt-injection and unsupported-claims rules.
4. **Add targeted regressions.** Test that the Gemini request includes the structured schema; malformed and schema-invalid responses produce distinct safe diagnostic codes; access restoration maps to Access Request; conflicting availability/impact facts request clarification; and priority follows stated business impact. Reuse existing fixed cases; do not edit their inputs or expected labels.
5. **Validate and re-evaluate.** Run affected backend/provider tests, harness tests, lint, and build. Then run the unchanged 23-case dataset with `--repair-of 2026-11-09T05-56-54-497Z-a4e02c2c`. Require all original sensor thresholds and the aggregate gate; preserve old evidence and append the new run. Request a new human decision for that run regardless of automated outcome.

### Out of scope

- No threshold reductions, sensor changes that mask failures, dataset pruning, or edits to expected outcomes to improve scores.
- No change to public API response fields or external API contract.
- No automatic retry, fallback classification, or automatic acceptance.
- Do not add automatic retries or change timeout beyond the evidence-based 30,000 ms default; the long-description failure was an output-validation failure, while the subsequent run explicitly recorded a timeout.

## Technical Context

**Language/Version**: Node.js 20 LTS; TypeScript backend and JavaScript (`.harness/`) evaluation tooling; React 18/Vite 5 frontend (unchanged by this repair)

**Primary Dependencies**: Gemini `generateContent` REST API, Zod response validation, Express/TypeScript, Node.js test runner, TypeScript, React, Vite

**Storage**: Append-only run evidence in ignored `evidence/` files; no new persistent application storage

**Testing**: Node.js tests for backend/provider and `.harness/`; existing lint/build; live Gemini evaluation on the unchanged fixed dataset

**Target Platform**: Web application for support desk operators on desktop and tablet browsers (local development and browser-based testing)

**Project Type**: web-application

**Performance Goals**: Use the evidence-based 30,000 ms model timeout and preserve reproducible, timestamped evaluation evidence

**Constraints**: Fixed dataset, expectations, thresholds, API contract, and safety requirements remain unchanged; no secrets, raw model output, or ticket text in logs; local Zod validation remains authoritative; human review required after every final run

**Scale/Scope**: Three existing regression cases within the 23-case fixed evaluation set; classifier/provider diagnostics and evaluation evidence only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Typed, Modular Architecture): Pass. Changes remain within the existing TypeScript LLM/classification modules and JavaScript evaluation harness; no frontend change is planned.
- Principle II (Explicit REST and Data Contracts): Pass. The public five-field API result remains unchanged. Gemini structured generation supplements, but does not replace, local Zod validation.
- Principle III (Safe, Grounded AI Behavior): Pass. Contradictions trigger clarification; input remains untrusted; diagnostics exclude raw ticket/output content and secrets.
- Principle IV (Accessible, Responsive User Experience): Pass. No UI change is required.
- Principle V (Measurable, Traceable Quality): Pass. Existing fixed cases, sensor boundaries, and all historical evidence remain; a linked re-evaluation and explicit human review are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-classify-support-tickets/
├── spec.md              # Feature requirements and acceptance criteria
├── plan.md              # This file
├── research.md          # Research and architecture decisions
├── data-model.md        # Domain and evaluation entity definitions
├── quickstart.md        # Setup, run, and validation guide
├── contracts/           # REST contract artifacts
│   └── support-ticket-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Generated during implementation planning
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── routes/
│   ├── config/
│   ├── controllers/
│   ├── domain/
│   │   ├── classification/
│   │   ├── validation/
│   │   └── review/
│   ├── services/
│   │   ├── llm/
│   │   ├── classification/
│   │   └── evaluation/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── app.ts
├── tests/
│   ├── contract/
│   ├── integration/
│   └── unit/
├── package.json
├── tsconfig.json
└── .env.example

frontend/
├── src/
│   ├── components/
│   │   ├── TicketForm/
│   │   ├── ResultCard/
│   │   └── ErrorBanner/
│   ├── hooks/
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── components/
│   └── app/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example

.harness/
├── runner.js
├── evidence.js
├── tests/
└── harness-log-check.js

backend/src/services/
├── classification/classification-service.ts
└── llm/provider.ts

backend/tests/unit/
├── classification-service.test.ts
└── llm-provider.test.ts

evals/
├── dataset.json
└── README.md


evidence/
├── initial-generation/
├── final-generation/
├── harness-log.md
└── eval-results.json
```

**Structure Decision**: Keep the existing sibling frontend/backend structure and make the repair in the classifier, provider, their unit tests, and the evaluation evidence pipeline. The existing [support-ticket-api.yaml](./contracts/support-ticket-api.yaml) remains unchanged because the public API contract does not change.

## Complexity Tracking

No constitution violations require justification beyond the required architecture and evaluation gates already captured in the specification and this plan.
