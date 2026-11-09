const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildHarnessLogEntry, buildRunRecord, toSafeOutputEvidence } = require("../evidence.js");
const { SENSOR_THRESHOLDS } = require("../constants.js");
const { checkHarnessEvidence } = require("../harness-log-check.js");
const { validateHumanReview } = require("../sensor-human-review.js");

test("output evidence is traceable without persisting ticket text or generated summary", () => {
  const input = "The customer's private account is unavailable.";
  const summary = "The customer account is unavailable.";
  const safeEvidence = toSafeOutputEvidence(
    { id: "case-safe", input },
    {
      category: "Technical Issue",
      priority: "High",
      summary,
      status: "success",
      clarification_question: null,
    },
  );
  assert.equal(safeEvidence.caseId, "case-safe");
  assert.equal(safeEvidence.summaryWordCount, 5);
  assert.ok(safeEvidence.outputSha256);
  assert.equal(JSON.stringify(safeEvidence).includes(input), false);
  assert.equal(JSON.stringify(safeEvidence).includes(summary), false);
});

test("review remains pending until an attributed current-run decision has all required fields", () => {
  assert.equal(validateHumanReview(null, "run-1").state, "PENDING_HUMAN_REVIEW");
  const incomplete = validateHumanReview({ evaluationRunId: "run-1", decision: "ACCEPT" }, "run-1");
  assert.equal(incomplete.valid, false);
  assert.equal(incomplete.state, "PENDING_HUMAN_REVIEW");

  const accepted = validateHumanReview(
    {
      evaluationRunId: "run-1",
      reviewer: "Human reviewer",
      decision: "ACCEPT",
      justification: "Reviewed the automated evidence.",
      knownLimitations: "The dataset is fixed and synthetic.",
      residualRisks: "Model behavior may vary between runs.",
      timestamp: "2026-11-09T12:00:00.000Z",
    },
    "run-1",
  );
  assert.equal(accepted.valid, true);
  assert.equal(accepted.state, "ACCEPTED");
  assert.equal(
    validateHumanReview({ ...accepted.review, evaluationRunId: "stale-run" }, "run-1").state,
    "PENDING_HUMAN_REVIEW",
  );
});

test("review history retains prior decisions while validating only the current run", () => {
  const priorReview = {
    evaluationRunId: "run-1",
    reviewer: "Human reviewer",
    decision: "REJECT",
    justification: "The earlier result did not meet the review criteria.",
    knownLimitations: "The dataset is fixed and synthetic.",
    residualRisks: "Model behavior may vary between runs.",
    timestamp: "2026-11-09T11:00:00.000Z",
  };
  const currentReview = {
    ...priorReview,
    evaluationRunId: "run-2",
    decision: "ACCEPT",
    justification: "Reviewed the current automated evidence.",
    timestamp: "2026-11-09T12:00:00.000Z",
  };

  assert.equal(validateHumanReview([priorReview, currentReview], "run-2").state, "ACCEPTED");
  assert.equal(validateHumanReview([priorReview], "run-2").state, "PENDING_HUMAN_REVIEW");
  assert.equal(
    validateHumanReview([currentReview, currentReview], "run-2").state,
    "PENDING_HUMAN_REVIEW",
  );
  assert.equal(validateHumanReview(currentReview, "run-2").state, "ACCEPTED");
});

test("run record and log retain layers, thresholds, failures, repair links, and review state", () => {
  const sensor = {
    name: "S1 Schema",
    passed: 1,
    applicable: 1,
    score: 100,
    threshold: 100,
    status: "pass",
    evidence: [],
  };
  const record = buildRunRecord({
    runId: "run-2",
    generatedAt: "2026-11-09T12:00:00.000Z",
    configuration: {
      provider: "gemini",
      modelName: "model",
      judgeModel: "judge",
      timeoutMs: 10000,
    },
    datasetSha256: "dataset-hash",
    caseCount: 20,
    sensors: [sensor],
    layers: { structural: { score: 100, status: "pass" } },
    gate: {
      status: "PASS",
      aggregateScore: 100,
      sensorBoundariesPassed: true,
      criticalFailure: false,
    },
    humanReview: { state: "PENDING_HUMAN_REVIEW", valid: false, errors: ["review_file_missing"] },
    repairOf: "run-1",
    failures: [
      {
        sensor: "S3 Classification",
        caseId: "case-1",
        reason: "mismatch",
        generationError: "InvalidClassificationOutputError",
        generationDiagnosticCode: "classification_schema_invalid",
      },
    ],
    codingAgentEvidence: {
      status: "recorded",
      reference: "evidence/coding-agent.json",
      sha256: "agent-hash",
    },
  });
  const log = buildHarnessLogEntry(record);
  assert.equal(record.repair.repairsRunId, "run-1");
  assert.equal(record.humanReview.status, "PENDING_HUMAN_REVIEW");
  assert.ok(log.includes("Fixed thresholds:"));
  assert.ok(log.includes("Generation seed: not configured"));
  assert.ok(log.includes("Repair/re-evaluation link: run-1"));
  assert.ok(log.includes("Human-review state: PENDING_HUMAN_REVIEW"));
  assert.ok(log.includes("[diagnostic: classification_schema_invalid]"));
  assert.equal(log.includes("ticket input"), false);
});

test("harness evidence checker rejects credential-like values and ticket text", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harness-evidence-test-"));
  const resultPath = path.join(directory, "eval-results.json");
  const logPath = path.join(directory, "harness-log.md");
  const datasetPath = path.join(directory, "dataset.json");
  const input = "Synthetic ticket that must not appear in evidence.";
  const sensors = Object.entries(SENSOR_THRESHOLDS).map(([name, threshold]) => ({
    name,
    passed: 1,
    applicable: 1,
    score: 100,
    threshold,
    status: "pass",
    evidence: [],
  }));
  const layers = {
    structural: { score: 100, status: "pass" },
    "invariant-property": { score: 100, status: "pass" },
    "semantic-quality": { score: 100, status: "pass" },
  };
  const result = {
    schemaVersion: 1,
    runId: "test-run",
    generatedAt: "2026-11-09T12:00:00.000Z",
    automatedStatus: "PASS",
    aggregateScore: 100,
    sensors,
    layers,
    thresholds: SENSOR_THRESHOLDS,
    settings: {
      dataset: "evals/dataset.json",
      datasetSha256: "dataset-hash",
      caseCount: 1,
      scoringMethod: "arithmetic mean",
    },
    configuration: { modelName: "model", judgeModel: "judge" },
    failures: [],
    history: [],
    repair: { repairsRunId: null },
    codingAgentEvidence: { status: "recorded", reference: "evidence/coding-agent.json" },
    humanReview: {
      status: "PENDING_HUMAN_REVIEW",
      reviewFile: "evidence/human-review.json",
    },
  };
  const log = buildHarnessLogEntry(result);
  try {
    fs.writeFileSync(resultPath, JSON.stringify(result));
    fs.writeFileSync(logPath, log);
    fs.writeFileSync(datasetPath, JSON.stringify({ cases: [{ id: "synthetic", input }] }));
    assert.equal(checkHarnessEvidence({ resultPath, logPath, datasetPath }).valid, true);

    fs.writeFileSync(logPath, `${log}\nGEMINI_API_KEY=not-a-real-key`);
    assert.ok(
      checkHarnessEvidence({ resultPath, logPath, datasetPath }).errors.some((error) =>
        error.includes("credential-like"),
      ),
    );

    fs.writeFileSync(logPath, `${log}\n${input}`);
    assert.ok(
      checkHarnessEvidence({ resultPath, logPath, datasetPath }).errors.some((error) =>
        error.includes("ticket input"),
      ),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
