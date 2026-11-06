# Validation Results

Each JSON file in this directory is an immutable record for one validation run.
Records include a unique run ID, UTC timestamps, implementation reference,
scope, commands, stdout/stderr, exit codes, findings, and evidence paths. Do
not include credentials, environment-variable values, or other sensitive data.

`recordKind: "scoped-validation"` records checks that are not the complete
mandatory harness. Such records must set `harnessExecuted` to `false`, list
unrun gates, and must not imply final acceptance. The complete application gate
is `./.harness/run-harness.sh`; its first complete baseline and final re-run
belong in the initial-generation and final-generation evidence respectively.

## Recorded Runs

| Run ID | Scope | Result | Record |
|---|---|---|---|
| `backend-foundation-20261106T011912Z` | Backend setup and data models | `PASS_SCOPED`; acceptance not evaluated | [JSON result](./backend-foundation-20261106T011912Z.json) |
| `ticket-api-implementation-20261106T014300Z` | Backend REST API and MongoDB integration | `PASS_SCOPED`; acceptance not evaluated | [JSON result](./ticket-api-implementation-20261106T014300Z.json) |
| `ticket-api-verification-20261106T014938Z` | Refreshed backend REST API verification | `PASS_SCOPED`; acceptance not evaluated | [JSON result](./ticket-api-verification-20261106T014938Z.json) |
| `harness-20261106T021632Z-3c60238b` | Initial complete implementation baseline | `FAIL`; branch coverage 75.25% | [JSON result](./harness-20261106T021632Z-3c60238b.json) |
| `harness-20261106T022849Z-1d60769a` | Final complete implementation validation | `PASS`; all eight gates passed | [JSON result](./harness-20261106T022849Z-1d60769a.json) |
