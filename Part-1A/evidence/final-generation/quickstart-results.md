# Quickstart Execution Results

- Date: 2026-11-06
- Implementation reference: Uncommitted working tree; no commit is available.
- MongoDB: disposable `mongo:8.0` container; ping succeeded.
- Full harness record: [harness-20261106T022849Z-1d60769a](../harness-results/harness-20261106T022849Z-1d60769a.json)

## Commands and results

| Quickstart command/check | Result | Output/measurement |
|---|---|---|
| `npm ci` | PASS | Clean install; 0 vulnerabilities. npm noted two install scripts were not allow-listed; installation completed successfully. |
| `npm run typecheck` | PASS | Frontend and backend TypeScript checks completed. |
| `npm run build` | PASS | Backend compiled and Vite produced the frontend build. |
| `npm run test:frontend` | PASS | 3 files, 15 tests passed. |
| `npm test` | PASS | 12 files, 73 tests passed. |
| `npm run openapi:check --workspace=@support-ticket-desk/frontend` | PASS | Contract type check completed. |
| `npm run test:contract` | PASS | 10 API contract tests passed. |
| `npm run test:integration` | PASS | 2 API/MongoDB integration tests passed against an isolated test database. |
| `npm run lint` | PASS | ESLint completed with zero errors. |
| `npm run security` | PASS | Security lint and secret-pattern scan passed. |
| `./.harness/run-harness.sh` | PASS | All eight gates passed; see the linked structured result. |

## Performance check

The harness seeded 2,000 deterministic tickets and issued 100 MongoDB-backed
API list/filter actions across Open, Assigned, Archived, and combined filters.
All 100 completed in under 2 seconds; p95 was **16.77 ms** and the maximum was
**42.79 ms** in this local disposable environment. These are local results, not
a production capacity guarantee.

## Local application smoke check

The frontend and backend development workspaces were started separately. The
first backend smoke check returned HTTP 404 because the server entry point
mounted an empty router; it was corrected to mount the versioned API router.
After the repair, `GET /api/v1/departments` returned HTTP 200 from both the
backend port and Vite proxy. The development catalog was empty, and the
integrated browser's lookup request did not settle, so the interactive ticket
workflow could not be completed in that browser session.

The integrated Chromium session reported no horizontal overflow at 320, 1,280,
or 1,920 CSS pixels and focused the skip link on the first Tab. Other browsers,
screen-reader testing, WCAG 2.2 AA evaluation, and the 10-person staff usability
study were unavailable; see
[accessibility-browser-results.md](./accessibility-browser-results.md). These
limitations do not change the passing automated component, contract, and
integration tests.
