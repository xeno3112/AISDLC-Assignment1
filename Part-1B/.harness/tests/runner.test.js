const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../evals/dataset.json"), "utf8"),
);
const { evaluateDataset, parseArguments, validateReEvaluation } = require("../runner.js");

const validOutput = {
  category: "Technical Issue",
  priority: "High",
  summary: "The service is unavailable for affected users.",
  status: "success",
  clarification_question: null,
};
const judgeResult = {
  classificationCorrect: true,
  priorityCorrect: true,
  faithfulnessCorrect: true,
  clarificationCorrect: true,
  guardrailCorrect: true,
};

test("runner evaluates each fixed case and retains only structured failures", async () => {
  const calls = { classifier: 0, judge: 0 };
  const { evaluations, sensors } = await evaluateDataset(dataset, {
    classifyTicket: async (input) => {
      calls.classifier += 1;
      if (input.trim().length === 0) {
        return {
          category: null,
          priority: null,
          summary: "",
          status: "rejected",
          clarification_question: null,
        };
      }
      if (input.includes("application is slow today")) {
        return {
          category: null,
          priority: null,
          summary: "",
          status: "clarification_required",
          clarification_question: "How many users are affected?",
        };
      }
      return validOutput;
    },
    judge: {
      evaluate: async () => {
        calls.judge += 1;
        return judgeResult;
      },
    },
  });

  assert.equal(evaluations.length, dataset.cases.length);
  assert.equal(
    calls.classifier,
    dataset.cases.filter((entry) => typeof entry.input === "string").length,
  );
  assert.ok(calls.judge > 0);
  assert.equal(sensors.length, 8);
  assert.equal(
    evaluations.some((entry) => entry.output?.summary?.includes("Production checkout")),
    false,
  );
});

test("runner records model and judge failures without storing exception messages", async () => {
  const failingCase = {
    cases: [
      {
        ...dataset.cases.find((entry) => entry.id === "technical-critical-outage"),
      },
    ],
  };
  const { evaluations, sensors } = await evaluateDataset(failingCase, {
    classifyTicket: async () => {
      throw new Error("sensitive provider detail");
    },
    judge: { evaluate: async () => judgeResult },
  });
  assert.equal(evaluations[0].generationError, "UnexpectedEvaluationError");
  assert.equal(JSON.stringify(evaluations).includes("sensitive provider detail"), false);
  assert.equal(sensors.find((sensor) => sensor.name === "S1 Schema").status, "fail");
  assert.equal(sensors.find((sensor) => sensor.name === "S7 Guardrail").status, "fail");
});

test("runner retains only recognized safe generation diagnostic codes", async () => {
  const failingCase = {
    cases: [
      {
        ...dataset.cases.find((entry) => entry.id === "technical-critical-outage"),
      },
    ],
  };
  const error = Object.assign(new Error("private model output"), {
    diagnosticCode: "classification_schema_invalid",
  });
  const { evaluations } = await evaluateDataset(failingCase, {
    classifyTicket: async () => {
      throw error;
    },
    judge: { evaluate: async () => judgeResult },
  });

  assert.equal(evaluations[0].generationDiagnosticCode, "classification_schema_invalid");
  assert.equal(JSON.stringify(evaluations).includes("private model output"), false);
  assert.equal(
    JSON.stringify(
      await evaluateDataset(failingCase, {
        classifyTicket: async () => {
          throw Object.assign(new Error("ignored"), {
            diagnosticCode: "credential=secret",
          });
        },
        judge: { evaluate: async () => judgeResult },
      }),
    ).includes("credential=secret"),
    false,
  );
});

test("runner accepts only explicit repair/stage arguments", () => {
  assert.deepEqual(parseArguments(["--repair-of", "run-1"]), {
    repairOf: "run-1",
    stage: null,
  });
  assert.deepEqual(parseArguments(["--stage", "final"]), {
    repairOf: null,
    stage: "final",
  });
  assert.throws(() => parseArguments(["--stage", "unknown"]), /--stage/);
  assert.throws(() => parseArguments(["--repair-of"]), /requires a prior/);
});

test("re-evaluation requires a recorded repair link and an unchanged fixed dataset", () => {
  const history = [{ runId: "run-1", datasetSha256: "dataset-hash" }];
  assert.throws(
    () => validateReEvaluation({ repairOf: null }, history, "dataset-hash"),
    /requires --repair-of/,
  );
  assert.throws(
    () => validateReEvaluation({ repairOf: "run-1" }, history, "changed-hash"),
    /unchanged fixed dataset/,
  );
  assert.throws(
    () => validateReEvaluation({ repairOf: "unknown" }, history, "dataset-hash"),
    /does not match/,
  );
  assert.doesNotThrow(() => validateReEvaluation({ repairOf: "run-1" }, history, "dataset-hash"));
});

