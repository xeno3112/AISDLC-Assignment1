# Evaluation dataset and harness

`dataset.json` is the fixed, synthetic evaluation set. It contains distinct success,
clarification, rejection, long-description, conflicting, missing-information,
malformed, empty, adversarial, and unsupported-severity cases. Do not edit or prune
cases to obtain a passing score. The harness hashes the dataset before the run and
verifies that it did not change during evaluation.

The evaluator calls the configured Gemini model for classification and a separate
structured LLM judge for semantic criteria. `EVAL_JUDGE_MODEL` selects the judge;
when unset, `MODEL_NAME` is used. Both use `GEMINI_API_KEY`, `GEMINI_BASE_URL`, and
`MODEL_TIMEOUT_MS` from `backend/.env`. Only this fixed synthetic dataset is sent to
Gemini. Do not add real or sensitive ticket text to the dataset.

Run the harness with:

```bash
npm run eval
```

The live evaluation path requires a valid `GEMINI_API_KEY` and remains blocked if the
backend environment is not configured. The harness logic and the repo unit tests can still
run without a key, but the human review state remains `PENDING_HUMAN_REVIEW` until a real
reviewer records an explicit ACCEPT or REJECT decision.

The result reports eight sensors across three distinct layers:

1. **Structural validation** — S1 validates exact JSON keys, types, enums, and
   schema constraints; S8 enforces the machine-checkable 50-word summary limit.
2. **Property/invariant validation** — S2 checks deterministic, status-dependent
   response invariants such as required or forbidden fields for each status.
3. **Semantic/quality evaluation** — S3–S6 use expected labels and the configured
   structured LLM judge rubric. S7 combines mechanical disclosure/action checks
   with judge evaluation of instruction handling and unsupported claims. The
   judge does not replace S1, S2, or S8.

The aggregate is the arithmetic mean of the eight sensor scores. Automated PASS
requires at least 90% aggregate, every fixed sensor threshold, and no schema,
invariant, or guardrail failure. The harness log checker also verifies
completeness and ensures that ticket inputs and credential-like values were not
copied into results or logs.

Generation evidence contains hashes and non-content metadata only. Model responses
are held in memory for evaluation; summaries, clarification questions, and ticket
text are not written to the evidence files.

## Human review

An automated PASS or FAIL is not a human decision. After every run, review
`evidence/eval-results.json` and append a review object to the JSON array in
`evidence/human-review.json`, using `evidence/human-review.example.json` as the
field template. Keep all earlier review objects; never replace the history with
only the latest decision. Each record must include a human reviewer, an explicit
`ACCEPT` or `REJECT`, a non-empty justification, known limitations, residual
risks, and an ISO timestamp. The evaluation remains `PENDING_HUMAN_REVIEW` until
exactly one valid decision references the current run. A review from an earlier
run is retained but does not carry forward.

For a re-evaluation after a repair, retain the previous `runId` and use:

```bash
npm run eval -- --repair-of <previous-run-id>
```

This records a link to the earlier run and writes safe output metadata under
`evidence/final-generation/`. The first run is written under
`evidence/initial-generation/`.
