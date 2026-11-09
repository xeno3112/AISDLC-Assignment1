# Support Ticket Classifier

A web app that classifies a support-ticket description into a category and
priority, and returns a short summary. It uses a React frontend, an Express API,
and Google's Gemini model. The API can also ask for clarification or reject an
unsupported request instead of guessing.

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Gemini API key for live ticket classification

MongoDB is not required to run the current app. Although a MongoDB URI is
available in the backend configuration, the current application does not
connect to a database.

## Run locally

Run these commands from this directory (`Part-1B`).

1. Install the project dependencies:

   ```bash
   npm ci
   ```

2. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and set `GEMINI_API_KEY` to a valid Gemini API key.
   The example file includes the default API port (`3000`), model, and timeout.
   Without a valid key, the app can start, but classification requests will fail.

3. (Optional) Create the frontend environment file:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   The default `/api/v1` path is routed by Vite to the backend at
   `http://localhost:3000`, so no frontend configuration is needed for a
   standard local run.

4. Start the backend in a terminal:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:3000`. To check that it is running, open
   `http://localhost:3000/api/v1/health`; it should return `{"status":"ok"}`.

5. In a second terminal, from this same project directory, start the frontend:

   ```bash
   npm run dev --workspace frontend
   ```

   Open the local URL printed by Vite (typically `http://localhost:5173`) and
   submit a support-ticket description.

Both servers must remain running while you use the app. If the frontend cannot
reach the API, verify that `http://localhost:3000/api/v1/health` returns
`{"status":"ok"}` and restart the frontend dev server after changing its
environment file.

## Useful commands

Run these from the project directory:

```bash
npm run build   # Build the backend and frontend
npm test        # Run the test suites
npm run lint    # Lint the project
npm run eval    # Run the fixed evaluation dataset (requires Gemini API key)
```

The evaluation uses synthetic ticket examples. Automated evaluation results are
not a human acceptance decision; see [evals/README.md](evals/README.md) for the
evaluation and review process.

## Request diagnostics and privacy

The browser console records request IDs and response status. Backend
diagnostics are appended as JSON Lines to `backend/logs/application.log`; the
backend adds an `x-request-id` response header so a browser entry can be
matched to its backend request. These diagnostics intentionally omit raw ticket
text, LLM prompts, generated summaries/questions, API keys, and provider
response bodies. Check the browser developer console and
`backend/logs/application.log` when troubleshooting a failed classification;
share only the request ID and diagnostic code, never ticket content or
credentials. The log directory is created automatically and excluded from Git.

For every live classification request, the backend also logs a runtime sensor
record for the response schema, status invariant, deterministic disclosure and
lifecycle guardrail, and 50-word summary limit. The record is correlated by the
same request ID and contains only sensor states and safe metadata. Expected-label
and semantic-quality checks remain in the fixed synthetic `npm run eval` run;
they cannot be honestly inferred from an arbitrary user ticket.

## Project layout

- `backend/` — Express API, classification logic, and Gemini integration
- `frontend/` — React and Vite user interface
- `evals/` — Fixed synthetic evaluation dataset and evaluation guidance
- `.harness/` — Evaluation harness and related checks
- `evidence/` — Evaluation and review evidence
