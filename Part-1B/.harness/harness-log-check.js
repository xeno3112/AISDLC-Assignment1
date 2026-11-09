const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED_LAYERS = ["structural", "invariant-property", "semantic-quality"];
const REQUIRED_SENSORS = [
  "S1 Schema",
  "S2 Invariant",
  "S3 Classification",
  "S4 Priority",
  "S5 Faithfulness",
  "S6 Clarification",
  "S7 Guardrail",
  "S8 Summary Length",
];
const SECRET_PATTERN =
  /(?:api[_-]?key|secret|password|authorization)\s*[:=]\s*["']?(?!\[REDACTED\])\S+|Bearer\s+[A-Za-z0-9._~+/-]+=*/i;

function checkHarnessEvidence({ resultPath, logPath, datasetPath }) {
  const errors = [];
  const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  const log = fs.readFileSync(logPath, "utf8");
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  if (result.schemaVersion !== 1 || typeof result.runId !== "string") {
    errors.push("latest evaluation run metadata is missing");
  }
  if (!["PASS", "FAIL"].includes(result.automatedStatus)) {
    errors.push("automated PASS/FAIL status is missing");
  }
  if (!Array.isArray(result.sensors) || result.sensors.length !== 8) {
    errors.push("all eight sensor results are required");
  } else if (
    REQUIRED_SENSORS.some((name) => !result.sensors.some((sensor) => sensor.name === name))
  ) {
    errors.push("one or more required sensor results are missing");
  }
  if (!result.layers || REQUIRED_LAYERS.some((name) => !Object.hasOwn(result.layers, name))) {
    errors.push("all three evaluation layers are required");
  }
  if (!result.thresholds || !result.settings?.scoringMethod) {
    errors.push("fixed thresholds and scoring method are required");
  }
  if (!result.configuration?.modelName || !result.configuration?.judgeModel) {
    errors.push("model and semantic evaluator configuration are required");
  }
  if (!Array.isArray(result.failures) || !Array.isArray(result.history)) {
    errors.push("failure evidence and run history are required");
  }
  if (!result.repair || !result.codingAgentEvidence || !result.humanReview) {
    errors.push("repair, coding-agent, and human-review evidence are required");
  }
  if (typeof result.humanReview.status !== "string") {
    errors.push("human-review state is required");
  }
  if (!log.includes(result.runId)) {
    errors.push("harness log does not include the latest evaluation run");
  }
  for (const requiredText of [
    "Scoring method:",
    "Fixed thresholds:",
    "Layers:",
    "Sensor scores:",
    "Failures:",
    "Repair/re-evaluation link:",
    "Human-review state:",
    "Generation seed:",
  ]) {
    if (!log.includes(requiredText)) {
      errors.push(`harness log is missing ${requiredText}`);
    }
  }
  const requiredValues = [
    result.generatedAt,
    result.automatedStatus,
    result.configuration?.modelName,
    result.configuration?.judgeModel,
    result.configuration?.generationSeed === undefined
      ? null
      : `Generation seed: ${result.configuration.generationSeed}`,
    result.settings?.dataset,
    result.settings?.datasetSha256,
    result.settings?.scoringMethod,
    result.humanReview?.status,
    result.humanReview?.reviewFile,
    JSON.stringify(result.thresholds),
  ];
  for (const value of requiredValues) {
    if (typeof value === "string" && value.length > 0 && !log.includes(value)) {
      errors.push("harness log omits a required run configuration or status value");
      break;
    }
  }
  for (const sensor of Array.isArray(result.sensors) ? result.sensors : []) {
    if (!log.includes(`- ${sensor.name}:`)) {
      errors.push(`harness log omits sensor ${sensor.name}`);
    }
  }
  for (const [layerName, layer] of Object.entries(result.layers || {})) {
    if (!log.includes(`- ${layerName}: ${layer.score.toFixed(2)}% (${layer.status})`)) {
      errors.push(`harness log omits layer ${layerName} result`);
    }
  }
  for (const failure of Array.isArray(result.failures) ? result.failures : []) {
    if (!log.includes(`${failure.sensor} / ${failure.caseId}: ${failure.reason}`)) {
      errors.push(`harness log omits failure evidence for ${failure.caseId}`);
    }
  }
  const repairRunId = result.repair?.repairsRunId || "none";
  if (!log.includes(`Repair/re-evaluation link: ${repairRunId}`)) {
    errors.push("harness log omits the repair/re-evaluation link");
  }

  const resultText = JSON.stringify(result);
  for (const [label, content] of [
    ["evaluation results", resultText],
    ["harness log", log],
  ]) {
    if (SECRET_PATTERN.test(content)) {
      errors.push(`${label} contains a credential-like value`);
    }
    for (const testCase of dataset.cases) {
      if (
        typeof testCase.input === "string" &&
        testCase.input.trim().length > 0 &&
        content.includes(testCase.input)
      ) {
        errors.push(`${label} contains ticket input for case ${testCase.id}`);
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function main() {
  const result = checkHarnessEvidence({
    resultPath: path.join(ROOT, "evidence", "eval-results.json"),
    logPath: path.join(ROOT, "evidence", "harness-log.md"),
    datasetPath: path.join(ROOT, "evals", "dataset.json"),
  });
  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`Harness evidence check failed: ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Harness evidence completeness and redaction checks passed.");
}

if (require.main === module) {
  main();
}

module.exports = { checkHarnessEvidence };
