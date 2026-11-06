# Research: Internal Issue Tracker

**Feature**: [spec.md](./spec.md)  
**Planning date**: 2026-11-06

## Decisions

### Runtime and dependency baseline

**Decision**: Use Node.js 24 LTS as the baseline for development, test and deployment. Use the compatible current stable React/Vite, Express 5, Mongoose, Vitest, React Testing Library and Supertest releases selected at implementation time; pin them in `package-lock.json`.

**Rationale**: The requested stack is compatible with a current LTS Node release. Pinning the actual package versions and lockfile makes installs reproducible while avoiding a stale fixed-version recommendation. The research snapshot found React/react-dom 19.3.1, Vite 8.3.6, `@vitejs/plugin-react` 6.2.1, Express 5.3.0, Mongoose 9.12.0, Vitest 5.1.0, Supertest 7.3.1 and React Testing Library 16.3.3; these are registry snapshots, not permanent pins.

**Alternatives considered**: Node 26 LTS is compatible as a newer runtime; Node 22 LTS is also viable. Recheck each package's engine constraints and the MongoDB driver/server compatibility when locking dependencies.

### React with Vite

**Decision**: Use React with Vite's React/TypeScript setup. Organize the client around the application shell, ticket feature, lookups, shared accessible controls and a single typed API-client boundary.

**Rationale**: Vite provides the development server and production build path. Feature-oriented modules keep ticket UI and API concerns separated without a large component framework or extra state-management layer.

**Alternatives considered**: A flat component tree is initially smaller but mixes data access and UI concerns. A larger front-end framework or state library is not justified for the specified workflows; introduce one only if implementation evidence shows a need.

### Node.js with Express REST

**Decision**: Use Express 5 in a modular monolith. Separate Express app construction from the process entry point. Within ticket, staff and department modules, keep routes, request schemas, handlers, business services and Mongoose persistence boundaries understandable and cohesive.

**Rationale**: Express 5 is appropriate for a new Node service and its app factory can be tested without opening a listening port. A modular monolith avoids service-to-service complexity for one internal application.

**Alternatives considered**: Express 4 is viable for an existing legacy service but none is present in this workspace. Microservices add deployment and failure modes without a requirement.

### MongoDB with Mongoose

**Decision**: Use MongoDB with Mongoose schemas for tickets, departments and staff. Define field bounds/enums/defaults, timestamps, and indexes tied to list/filter queries. Map Mongoose validation and MongoDB duplicate-key errors explicitly into the API envelope.

**Rationale**: Mongoose provides model validation and document mapping; MongoDB indexes support the stated status/assignee/priority queries. A unique index is enforced by MongoDB and duplicate-key errors must be handled distinctly; Mongoose's `unique` option is not a validator.

**Alternatives considered**: Broad speculative indexing increases write and storage costs. Mongoose validation alone cannot enforce cross-request lifecycle concurrency or uniqueness semantics.

### Atomic lifecycle operations

**Decision**: Put the allowed transition matrix and eligibility checks in the ticket service. Apply a conditional update filtered by ticket ID and expected current status, with required assignment conditions, and write the status/note/timestamp together. A failed condition is a conflict and leaves the document unchanged.

**Rationale**: A conditional single-document update prevents two stale requests from both applying a transition and avoids a read-then-save race. It also satisfies the no-partial-update requirement for lifecycle changes. Closure and archival remain separate operations with explicit confirmation.

**Alternatives considered**: Read-modify-save may be appropriate for complex middleware or documents, but can race without an explicit concurrency guard. A multi-document transaction is not needed for a single-ticket transition; use one only if later requirements add cross-document atomic workflows.

### REST interface contract

**Decision**: Maintain OpenAPI 3.1.1 at `contracts/openapi.yaml` as the shared description of routes, payloads, response shapes and status codes. Use server-side Zod schemas for runtime request validation, generated/checked TypeScript client types, and contract validation in the harness.

**Rationale**: The API is a first-party interface between two separately structured application areas. A versioned contract and route-level tests make the interface explicit, while runtime validation prevents invalid payloads from reaching persistence.

**Alternatives considered**: Handwritten frontend/backend types alone can drift. A code-first contract generator can be chosen later, but should replace—not duplicate—the source-of-truth contract.

### Frontend tests

**Decision**: Use Vitest, React Testing Library and `user-event`; query controls by accessible role/name or label. Cover loading, empty, success, validation and error states, the main user workflows, and keyboard interaction.

**Rationale**: These tools focus tests on user-visible behavior and exercise normal interaction patterns. Accessible queries reinforce WCAG expectations.

**Alternatives considered**: Low-level event dispatch is reserved for interactions not represented by `user-event`; test IDs are not the default. DOM tests cannot prove actual responsive layout, so browser checks remain necessary.

### Backend and API tests

**Decision**: Use Vitest in Node mode for backend unit/integration tests and Supertest for HTTP-level API tests against the Express app factory. Use a dedicated disposable MongoDB test database, seeded and cleared predictably; do not mock persistence in tests intended to validate the route-to-database path.

**Rationale**: This reuses the requested Vitest toolchain while exercising Express and the actual MongoDB behavior. A transition/error decision matrix supports deterministic coverage. Enforce at least 90% branch coverage for critical business logic, not generated code or bootstrap code.

**Alternatives considered**: `node:test` or Jest are viable separate Node runners, but would add a second test configuration for little benefit. Repository mocks remain useful in focused service tests but do not replace integration tests.

### Security and presentation

**Decision**: Validate allow-listed request fields server-side, safely render user text, map expected failures to stable error codes and sanitize unexpected errors. Run ESLint with a security plugin as a separate mandatory SAST gate. Keep the backend behind a network-level internal access boundary because application authentication is excluded.

**Rationale**: This aligns with the constitution's validation, injection/XSS prevention, zero unresolved critical/high findings, no secrets, and sanitized error requirements while respecting the approved no-auth scope.

**Alternatives considered**: Public deployment without authentication or a documented trusted network boundary is unacceptable. Wildcard CORS and rendering user-supplied HTML are unnecessary and unsafe.

## Assumptions and Remaining Operational Questions

- Node.js 24 LTS is the planning baseline; verify the exact stable versions and engine requirements when creating the lockfile.
- MongoDB 8.0 is the planning baseline; select and pin the exact local/CI server image with the implementation and test it against the chosen Mongoose release.
- Local development and API tests have a MongoDB service available. The test database is isolated from development data, and the test runner fails fast if its URI is not a dedicated test database.
- Staff and department records are supplied externally; application setup must document the required initial records, but this feature does not add catalog administration.
- The Assigned view is global because there is no authenticated current user.
- Network-level access control and archive retention remain deployment/business decisions from the specification; they do not block the module design but must be resolved before production exposure/retention operations.

## Sources

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [React package metadata](https://registry.npmjs.org/react/latest), [Vite package metadata](https://registry.npmjs.org/vite/latest), [Express package metadata](https://registry.npmjs.org/express/latest), [Mongoose package metadata](https://registry.npmjs.org/mongoose/latest), [Vitest package metadata](https://registry.npmjs.org/vitest/latest), [Supertest package metadata](https://registry.npmjs.org/supertest/latest)
- [Express 5 API](https://expressjs.com/en/5x/api/), [Express migration guide](https://expressjs.com/en/guide/migrating-5/), [Express error handling](https://expressjs.com/en/guide/error-handling/)
- [Mongoose validation](https://mongoosejs.com/docs/validation.html), [Mongoose schemas and indexes](https://mongoosejs.com/docs/guide.html), [Mongoose `findOneAndUpdate`](https://mongoosejs.com/docs/tutorials/findoneandupdate.html), [MongoDB indexes](https://www.mongodb.com/docs/manual/indexes/)
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Testing Library queries](https://testing-library.com/docs/queries/about/), [user-event](https://testing-library.com/docs/user-event/intro/)
- [Vitest coverage](https://vitest.dev/guide/coverage.html)
