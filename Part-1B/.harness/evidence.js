const crypto = require("node:crypto");

const SCORING_METHOD =
  "Arithmetic mean of all eight sensor percentages; pass requires >=90% aggregate, every sensor threshold, and no S1/S2/S7 failure.";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toSafeOutputEvidence(testCase, output) {
  const serializedOutput = output === null ? "" : JSON.stringify(output);
  const summaryWords =
    typeof output?.summary === "string"
      ? output.summary.trim().split(/\s+/).filter(Boolean).length
      : null;
  return {
    caseId: testCase.id,
    inputSha256: sha256(JSON.stringify(testCase.input)),
    outputSha256: serializedOutput ? sha256(serializedOutput) : null,
    status: typeof output?.status === "string" ? output.status : null,
    category: typeof output?.category === "string" ? output.category : null,
    priority: typeof output?.priority === "string" ? output.priority : null,
    summaryWordCount: summaryWords,
    clarificationQuestionPresent:
      typeof output?.clarification_question === "string" &&
      output.clarification_question.trim().length > 0,
  };
}

function buildFailureEvidence(sensors, evaluations) {
  const failures = [];
  for (const sensor of sensors) {
    for (const finding of sensor.evidence) {
      const evaluation = evaluations.find((entry) => entry.testCase.id === finding.caseId);
      failures.push({
        sensor: sensor.name,
        caseId: finding.caseId,
        reason: finding.reason,
        generationError: evaluation?.generationError || null,
        generationDiagnosticCode: evaluation?.generationDiagnosticCode || null,
        judgeError: evaluation?.judgeError || null,
      });
    }
  }
  return failures;
}

function buildRunRecord({
  runId,
  generatedAt,
  configuration,
  datasetSha256,
  caseCount,
  sensors,
  layers,
  gate,
  humanReview,
  repairOf,
  failures,
  codingAgentEvidence,
}) {
  return {
    schemaVersion: 1,
    runId,
    generatedAt,
    automatedStatus: gate.status,
    aggregateScore: gate.aggregateScore,
    sensorBoundariesPassed: gate.sensorBoundariesPassed,
    criticalFailure: gate.criticalFailure,
    configuration,
    settings: {
      dataset: "evals/dataset.json",
      datasetSha256,
      caseCount,
      semanticEvaluator: "Gemini structured judge with fixed boolean rubric",
      scoringMethod: SCORING_METHOD,
    },
    thresholds: Object.fromEntries(sensors.map(({ name, threshold }) => [name, threshold])),
    sensors,
    layers,
    failures,
    repair: repairOf
      ? { reEvaluation: true, repairsRunId: repairOf }
      : { reEvaluation: false, repairsRunId: null },
    humanReview: {
      status: humanReview.state,
      reviewFile: "evidence/human-review.json",
      valid: humanReview.valid,
      decision: humanReview.review?.decision || null,
      reviewer: humanReview.review?.reviewer || null,
      timestamp: humanReview.review?.timestamp || null,
      validationErrors: humanReview.errors,
    },
    codingAgentEvidence,
  };
}

function buildHarnessLogEntry(result) {
  const sensorScores = result.sensors
    .map(
      (sensor) =>
        `- ${sensor.name}: ${sensor.passed}/${sensor.applicable} (${sensor.score.toFixed(2)}%; threshold ${sensor.threshold}%; ${sensor.status})`,
    )
    .join("\n");
  const layerScores = Object.entries(result.layers)
    .map(([name, layer]) => `- ${name}: ${layer.score.toFixed(2)}% (${layer.status})`)
    .join("\n");
  const failures = result.failures.length
    ? result.failures
        .map(
          (failure) =>
            `- ${failure.sensor} / ${failure.caseId}: ${failure.reason}` +
            (failure.generationError ? ` (${failure.generationError})` : "") +
            (failure.generationDiagnosticCode
              ? ` [diagnostic: ${failure.generationDiagnosticCode}]`
              : "") +
            (failure.judgeError ? ` (${failure.judgeError})` : ""),
        )
        .join("\n")
    : "- None";

  return [
    `## Evaluation ${result.runId}`,
    "",
    `- Generated: ${result.generatedAt}`,
    `- Automated result: ${result.automatedStatus} (${result.aggregateScore.toFixed(2)}% aggregate)`,
    `- Classification model: ${result.configuration.modelName} (${result.configuration.provider})`,
    `- Semantic judge: ${result.configuration.judgeModel} (${result.configuration.provider})`,
    `- Generation seed: ${result.configuration.generationSeed ?? "not configured"}`,
    `- Timeout: ${result.configuration.timeoutMs} ms`,
    `- Dataset: ${result.settings.dataset} (${result.settings.caseCount} cases, SHA-256 ${result.settings.datasetSha256})`,
    `- Scoring method: ${result.settings.scoringMethod}`,
    `- Fixed thresholds: ${JSON.stringify(result.thresholds)}`,
    "- Layers:",
    layerScores,
    "- Sensor scores:",
    sensorScores,
    "- Failures:",
    failures,
    `- Repair/re-evaluation link: ${result.repair.repairsRunId || "none"}`,
    `- Coding-agent evidence: ${result.codingAgentEvidence.status} (${result.codingAgentEvidence.reference})`,
    `- Human-review state: ${result.humanReview.status}; record required in ${result.humanReview.reviewFile}`,
    "",
  ].join("\n");
}

module.exports = {
  SCORING_METHOD,
  buildFailureEvidence,
  buildHarnessLogEntry,
  buildRunRecord,
  sha256,
  toSafeOutputEvidence,
};
