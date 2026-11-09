# Quickstart

## Prerequisites
- Node.js 20 LTS
- npm 10+
- MongoDB 7 or a MongoDB-compatible local instance
- A configured Gemini API key if you want to exercise the live classification route

## Install

```bash
# root workspace
npm install

# frontend
cd frontend && npm install

# backend
cd backend && npm install
```

## Local configuration

Create environment files for the backend and frontend based on the project template:

```bash
# backend/.env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/support-ticket-assistant
MODEL_PROVIDER=gemini
MODEL_NAME=gemini-3.8-flash
GEMINI_API_KEY=replace-with-your-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
MODEL_TIMEOUT_MS=10000
LOG_LEVEL=info

# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Important: the live Gemini classification path is blocked until `backend/.env` contains a real `GEMINI_API_KEY`. The automated tests and harness unit checks still run without a live key, but the project remains `PENDING_HUMAN_REVIEW` until a human reviewer records an explicit ACCEPT or REJECT decision.

## Run the app

```bash
# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev
```

Expected result:
- the frontend is available on the Vite local URL (for example, `http://localhost:5173`)
- the backend listens on `http://localhost:3000`
- the health endpoint returns a successful JSON response from `GET /api/v1/health`

## Validate the feature

1. Submit a ticket describing a major production outage. Confirm the response is `success`, `category=Technical Issue`, `priority=Critical`, and the summary stays under 50 words.
2. Submit an ambiguous request missing critical facts. Confirm the response is `clarification_required` with a non-empty question and null values for `category` and `priority`.
3. Submit an empty or malformed request. Confirm the response is `rejected`, with an empty summary and null values for `category` and `priority`.
4. Submit a ticket containing adversarial instructions. Confirm those instructions are ignored and the root issue still follows the supported classification rules.
5. Run the local automated checks:

```bash
npm run lint
npm run test
npm run build
```

6. If a live Gemini evaluation is required, configure the API key and run:

```bash
npm run eval
```

Expected outcome:
- all automated checks pass without weakening the documented safety or schema constraints
- the harness log records pass/fail evidence without sensitive ticket content
- the project remains `PENDING_HUMAN_REVIEW` until a human ACCEPT or REJECT decision is explicitly recorded

### Evaluation-failure repair validation

For the classifier repair, also verify the three existing fixed cases without
changing their inputs or expected labels:

- `long-description`: receives an exact five-field result accepted by the Zod
  schema; if generation still fails, evidence identifies provider, JSON-parse,
  or schema-validation stage without exposing ticket/output content.
- `access-critical-agent-lockout`: classifies as `Access Request`.
- `ambiguous-impact`: returns `clarification_required` with null category and
  priority and one concise question.

Run the focused backend and harness tests first, then lint and build. Re-evaluate
the unchanged fixed dataset using the latest recorded run as the repair link:

```bash
npm run eval -- --repair-of <latest-run-id>
```

Confirm all eight original sensor thresholds and the aggregate gate; do not
weaken the thresholds or remove the cases. The new evaluation is another
timestamped record: retain earlier run history and generation evidence. Request
an explicit human ACCEPT or REJECT for the new run even if automation passes.

## Troubleshooting

- If the backend fails to start, confirm that `backend/.env` exists and that `MONGODB_URI` points to a reachable MongoDB instance.
- If the frontend cannot reach the API, verify that the Vite frontend is pointing at the same port configured in `backend/.env`.
- If the harness cannot run a live evaluation, confirm that `GEMINI_API_KEY` is populated and the configured model name matches the available provider.
- If the eval status remains pending, review `evidence/eval-results.json` and the harness log; do not treat automated PASS as human acceptance.
