const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const { validateDataset } = require("./dataset.js");
const { createSemanticJudge } = require("./semantic-judge.js");
const { runSchemaSensor } = require("./sensor-schema.js");
const { runInvariantSensor } = require("./sensor-invariant.js");
const { runClassificationSensor } = require("./sensor-classification.js");
const { runPrioritySensor } = require("./sensor-priority.js");
const { runFaithfulnessSensor } = require("./sensor-faithfulness.js");
const { runClarificationSensor } = require("./sensor-clarification.js");
const { runGuardrailSensor } = require("./sensor-guardrail.js");
const { runSummaryLengthSensor } = require("./sensor-summary-length.js");
const { buildLayerResults, computeGate } = require("./scoring.js");
const {
  buildFailureEvidence,
  buildHarnessLogEntry,
  buildRunRecord,
  sha256,
  toSafeOutputEvidence,
} = require("./evidence.js");
const { validateHumanReview } = require("./sensor-human-review.js");

const ROOT = path.resolve(__dirname, "..");
const REJECTED_RESULT = Object.freeze({
  category: null,
  priority: null,
  summary: "",
  status: "rejected",
  clarification_question: null,
});
const ERROR_CODES = new Set([
  "LlmProviderError",
  "InvalidClassificationOutputError",
  "SemanticJudgeError",
]);
const SAFE_DIAGNOSTIC_CODES = new Set([
  "classification_json_parse_failed",
  "classification_schema_invalid",
  "gemini_api_key_missing",
  "gemini_candidate_missing",
  "gemini_generation_incomplete",
  "gemini_http_error",
  "gemini_output_missing",
  "gemini_request_failed",
  "gemini_request_timeout",
  "gemini_response_invalid",
  "gemini_response_json_invalid",
]);

function errorCode(error) {
  if (error instanceof Error && ERROR_CODES.has(error.name)) {
    return error.name;
  }
  if (error instanceof Error) {
    return "UnexpectedEvaluationError";
  }
  return "UnknownEvaluationError";
}

function safeDiagnosticCode(error) {
  const code = error && typeof error === "object" ? error.diagnosticCode : null;
  return typeof code === "string" && SAFE_DIAGNOSTIC_CODES.has(code) ? code : null;
}

function runSensors(evaluations) {
  return [
    runSchemaSensor(evaluations),
    runInvariantSensor(evaluations),
    runClassificationSensor(evaluations),
    runPrioritySensor(evaluations),
    runFaithfulnessSensor(evaluations),
    runClarificationSensor(evaluations),
    runGuardrailSensor(evaluations),
    runSummaryLengthSensor(evaluations),
  ];
}

async function evaluateDataset(dataset, { classifyTicket, judge }) {
  const evaluations = [];
  for (const testCase of dataset.cases) {
    let output = null;
    let generationError;
    let generationDiagnosticCode = null;
    let judgeResult = null;
    let judgeError;

    if (typeof testCase.input !== "string") {
      output = { ...REJECTED_RESULT };
    } else {
      try {
        output = await classifyTicket(testCase.input);
      } catch (error) {
        generationError = errorCode(error);
        generationDiagnosticCode = safeDiagnosticCode(error);
      }

      if (output && testCase.input.trim().length > 0) {
        try {
          judgeResult = await judge.evaluate(testCase, output);
        } catch (error) {
          judgeError = errorCode(error);
        }
      }
    }

    evaluations.push({
      testCase,
      output,
      judge: judgeResult,
      generationError,
      generationDiagnosticCode,
      judgeError,
    });
  }

  return { evaluations, sensors: runSensors(evaluations) };
}

function readJsonFile(filePath, { optional = false } = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (optional && error && error.code === "ENOENT") {
      return null;
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${path.relative(ROOT, filePath)}.`);
    }
    throw error;
  }
}

function loadPreviousHistory(previousResult) {
  if (!previousResult || !Array.isArray(previousResult.history)) {
    return [];
  }
  return previousResult.history;
}

function parseArguments(args) {
  const options = { repairOf: null, stage: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--repair-of") {
      options.repairOf = args[index + 1];
      index += 1;
    } else if (args[index] === "--stage") {
      options.stage = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown evaluation argument: ${args[index]}`);
    }
  }
  if (options.repairOf !== null && !options.repairOf) {
    throw new Error("--repair-of requires a prior evaluation run ID.");
  }
  if (options.stage !== null && !["initial", "final"].includes(options.stage)) {
    throw new Error("--stage must be initial or final.");
  }
  return options;
}

function validateReEvaluation(options, history, datasetSha256) {
  const previousRun = history.at(-1);
  if (!previousRun) {
    if (options.repairOf) {
      throw new Error("A repair link cannot be used before an initial evaluation run.");
    }
    return;
  }
  if (!options.repairOf) {
    throw new Error("Re-evaluation requires --repair-of with a previously recorded run ID.");
  }
  if (previousRun.datasetSha256 !== datasetSha256) {
    throw new Error("Re-evaluation must use the unchanged fixed dataset from the previous run.");
  }
  if (!history.some((record) => record.runId === options.repairOf)) {
    throw new Error(`Repair link ${options.repairOf} does not match a recorded evaluation run.`);
  }
}

function createRunId() {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
}

function readHumanReview(filePath, runId) {
  const review = readJsonFile(filePath, { optional: true });
  return validateHumanReview(review, runId);
}

function readCodingAgentEvidence(filePath) {
  const content = fs.readFileSync(filePath);
  const evidence = JSON.parse(content.toString("utf8"));
  if (
    !evidence ||
    evidence.formatVersion !== 1 ||
    evidence.phase !== "Phase 5 - User Story 3" ||
    !Array.isArray(evidence.taskIds) ||
    typeof evidence.implementationSummary !== "string" ||
    !evidence.validation ||
    typeof evidence.validation.automatedTests !== "string" ||
    typeof evidence.validation.result !== "string"
  ) {
    throw new Error(
      "evidence/coding-agent.json does not match the coding-agent evidence contract.",
    );
  }
  return {
    status: "recorded",
    reference: "evidence/coding-agent.json",
    sha256: sha256(content),
  };
}

async function runEvaluation({ args = process.argv.slice(2), dependencies } = {}) {
  const options = parseArguments(args);
  const datasetPath = path.join(ROOT, "evals", "dataset.json");
  const datasetBytes = fs.readFileSync(datasetPath);
  const dataset = JSON.parse(datasetBytes.toString("utf8"));
  const validation = validateDataset(dataset);
  if (!validation.valid) {
    throw new Error(`The fixed evaluation dataset is invalid: ${validation.errors.join("; ")}`);
  }

  const previousResultPath = path.join(ROOT, "evidence", "eval-results.json");
  const previousResult = readJsonFile(previousResultPath, { optional: true });
  const history = loadPreviousHistory(previousResult);
  validateReEvaluation(options, history, sha256(datasetBytes));

  let classifier;
  let judge;
  let configuration;
  if (dependencies) {
    ({ classifyTicket: classifier, judge } = dependencies);
    configuration = dependencies.configuration;
  } else {
    dotenv.config({ path: path.join(ROOT, "backend", ".env") });
    const { env } = await import("../backend/src/config/env.ts");
    const [{ createGeminiProvider, GEMINI_GENERATION_SEED }, { createClassificationService }] =
      await Promise.all([
        import("../backend/src/services/llm/provider.ts"),
        import("../backend/src/services/classification/classification-service.ts"),
      ]);

    if (!env.GEMINI_API_KEY.trim()) {
      throw new Error("GEMINI_API_KEY must be configured before running the evaluation harness.");
    }
    const modelProvider = createGeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.MODEL_NAME,
      baseUrl: env.GEMINI_BASE_URL,
      timeoutMs: env.MODEL_TIMEOUT_MS,
    });
    classifier = createClassificationService(modelProvider).classifyTicket;
    const judgeModel = env.EVAL_JUDGE_MODEL || env.MODEL_NAME;
    judge = createSemanticJudge({
      apiKey: env.GEMINI_API_KEY,
      model: judgeModel,
      baseUrl: env.GEMINI_BASE_URL,
      timeoutMs: env.MODEL_TIMEOUT_MS,
    });
    configuration = {
      provider: env.MODEL_PROVIDER,
      modelName: env.MODEL_NAME,
      judgeModel,
      generationSeed: GEMINI_GENERATION_SEED,
      timeoutMs: env.MODEL_TIMEOUT_MS,
    };
  }
  if (typeof classifier !== "function" || !judge || typeof judge.evaluate !== "function") {
    throw new Error("Evaluation requires a classifier and a configured semantic judge.");
  }
  if (
    !configuration ||
    typeof configuration.modelName !== "string" ||
    typeof configuration.judgeModel !== "string"
  ) {
    throw new Error("Evaluation model configuration is incomplete.");
  }

  const runId = createRunId();
  const generatedAt = new Date().toISOString();
  const datasetSha256 = sha256(datasetBytes);
  const { evaluations, sensors } = await evaluateDataset(dataset, {
    classifyTicket: classifier,
    judge,
  });
  if (sha256(fs.readFileSync(datasetPath)) !== datasetSha256) {
    throw new Error("The fixed evaluation dataset changed while the run was in progress.");
  }

  const layers = buildLayerResults(sensors);
  const gate = computeGate(sensors);
  const failures = buildFailureEvidence(sensors, evaluations);
  const humanReview = readHumanReview(path.join(ROOT, "evidence", "human-review.json"), runId);
  const codingEvidencePath = path.join(ROOT, "evidence", "coding-agent.json");
  const codingAgentEvidence = fs.existsSync(codingEvidencePath)
    ? readCodingAgentEvidence(codingEvidencePath)
    : {
        status: "not_supplied",
        reference: "evidence/coding-agent.json",
        sha256: null,
      };

  const record = buildRunRecord({
    runId,
    generatedAt,
    configuration,
    datasetSha256,
    caseCount: dataset.cases.length,
    sensors,
    layers,
    gate,
    humanReview,
    repairOf: options.repairOf,
    failures,
    codingAgentEvidence,
  });
  const runHistory = [
    ...history,
    {
      runId,
      generatedAt,
      automatedStatus: gate.status,
      datasetSha256,
      repairOf: options.repairOf,
    },
  ];
  const result = { ...record, history: runHistory };
  const evidenceStage = options.stage || (options.repairOf ? "final" : "initial");
  const outputEvidence = evaluations.map(({ testCase, output }) =>
    toSafeOutputEvidence(testCase, output),
  );
  const outputEvidencePath = path.join(
    ROOT,
    "evidence",
    `${evidenceStage}-generation`,
    `${runId}.json`,
  );
  fs.mkdirSync(path.dirname(outputEvidencePath), { recursive: true });
  fs.writeFileSync(
    outputEvidencePath,
    `${JSON.stringify(
      {
        runId,
        stage: evidenceStage,
        datasetSha256,
        outputs: outputEvidence,
      },
      null,
      2,
    )}\n`,
  );

  fs.mkdirSync(path.dirname(previousResultPath), { recursive: true });
  fs.writeFileSync(previousResultPath, `${JSON.stringify(result, null, 2)}\n`);
  const logPath = path.join(ROOT, "evidence", "harness-log.md");
  const logEntry = buildHarnessLogEntry(result);
  fs.appendFileSync(
    logPath,
    `${fs.existsSync(logPath) ? "\n" : "# Evaluation Harness Log\n\n"}${logEntry}`,
  );

  console.log(
    `Automated evaluation: ${gate.status} (${gate.aggregateScore.toFixed(2)}% aggregate).`,
  );
  console.log(`Evaluation evidence: evidence/eval-results.json (${runId}).`);
  if (humanReview.valid) {
    console.log(`Human review recorded: ${humanReview.state} by ${humanReview.review.reviewer}.`);
  } else {
    console.log(
      `Human review requested: add evidence/human-review.json for run ${runId} with reviewer, ACCEPT/REJECT, justification, knownLimitations, residualRisks, and timestamp. Status remains PENDING_HUMAN_REVIEW.`,
    );
  }
  console.log(
    `Run log: evidence/harness-log.md; output metadata: evidence/${evidenceStage}-generation/${runId}.json.`,
  );

  return { result, outputEvidence };
}

async function main() {
  try {
    const { result } = await runEvaluation();
    if (result.automatedStatus !== "PASS") {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown evaluation failure.";
    console.error(`Evaluation failed: ${message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ERROR_CODES,
  REJECTED_RESULT,
  SAFE_DIAGNOSTIC_CODES,
  evaluateDataset,
  parseArguments,
  readHumanReview,
  runEvaluation,
  runSensors,
  safeDiagnosticCode,
  validateReEvaluation,
};
