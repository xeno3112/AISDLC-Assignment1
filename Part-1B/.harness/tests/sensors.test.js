const assert = require("node:assert/strict");
const test = require("node:test");

const { SENSOR_THRESHOLDS, SENSOR_TO_LAYER } = require("../constants.js");
const { runClassificationSensor } = require("../sensor-classification.js");
const { runClarificationSensor } = require("../sensor-clarification.js");
const { runFaithfulnessSensor } = require("../sensor-faithfulness.js");
const { runGuardrailSensor } = require("../sensor-guardrail.js");
const { runInvariantSensor } = require("../sensor-invariant.js");
const { runPrioritySensor } = require("../sensor-priority.js");
const { runSchemaSensor } = require("../sensor-schema.js");
const { runSummaryLengthSensor } = require("../sensor-summary-length.js");
const { buildLayerResults } = require("../scoring.js");

const validOutput = {
  category: "Technical Issue",
  priority: "High",
  summary: "The service is unavailable for the team.",
  status: "success",
  clarification_question: null,
};
const validJudge = {
  classificationCorrect: true,
  priorityCorrect: true,
  faithfulnessCorrect: true,
  clarificationCorrect: true,
  guardrailCorrect: true,
};

function evaluation(id, overrides = {}) {
  return {
    testCase: {
      id,
      input: "The service is unavailable for our team.",
      expectedStatus: "success",
      expectedCategory: "Technical Issue",
      expectedPriority: "High",
      ...overrides.testCase,
    },
    output: { ...validOutput, ...overrides.output },
    judge: { ...validJudge, ...overrides.judge },
    generationError: overrides.generationError,
  };
}

test("S1 schema checks exact shape, allowed values, and applicable counts", () => {
  const sensor = runSchemaSensor([
    evaluation("valid"),
    evaluation("invalid", { output: { extra: true } }),
  ]);
  assert.equal(sensor.applicable, 2);
  assert.equal(sensor.passed, 1);
  assert.equal(sensor.score, 50);
  assert.equal(sensor.status, "fail");
});

test("S2 invariant enforces each status contract", () => {
  const validClarification = evaluation("clarification", {
    output: {
      category: null,
      priority: null,
      summary: "",
      status: "clarification_required",
      clarification_question: "How many users are affected?",
    },
  });
  const invalidRejection = evaluation("rejection", {
    output: {
      category: null,
      priority: "High",
      summary: "",
      status: "rejected",
      clarification_question: null,
    },
  });
  const sensor = runInvariantSensor([evaluation("success"), validClarification, invalidRejection]);
  assert.equal(sensor.applicable, 3);
  assert.equal(sensor.passed, 2);
  assert.equal(sensor.threshold, SENSOR_THRESHOLDS["S2 Invariant"]);
});

test("S3 classification passes at 90 percent and excludes non-success cases", () => {
  const cases = Array.from({ length: 10 }, (_, index) =>
    evaluation(`classification-${index}`, {
      ...(index === 9 ? { output: { category: "Billing Issue" } } : {}),
    }),
  );
  cases.push(
    evaluation("clarification-not-applicable", {
      testCase: { expectedStatus: "clarification_required" },
    }),
  );
  const sensor = runClassificationSensor(cases);
  assert.equal(sensor.applicable, 10);
  assert.equal(sensor.passed, 9);
  assert.equal(sensor.score, 90);
  assert.equal(sensor.status, "pass");
});

test("S4 priority passes at its 85 percent boundary", () => {
  const cases = Array.from({ length: 20 }, (_, index) =>
    evaluation(`priority-${index}`, {
      ...(index < 3 ? { output: { priority: "Low" } } : {}),
    }),
  );
  const sensor = runPrioritySensor(cases);
  assert.equal(sensor.applicable, 20);
  assert.equal(sensor.passed, 17);
  assert.equal(sensor.score, 85);
  assert.equal(sensor.status, "pass");
});

test("S5 faithfulness passes at 95 percent and uses only expected-success cases", () => {
  const cases = Array.from({ length: 20 }, (_, index) =>
    evaluation(`faithfulness-${index}`, {
      ...(index === 19 ? { judge: { faithfulnessCorrect: false } } : {}),
    }),
  );
  cases.push(
    evaluation("clarification-not-applicable", {
      testCase: { expectedStatus: "clarification_required" },
    }),
  );
  const sensor = runFaithfulnessSensor(cases);
  assert.equal(sensor.applicable, 20);
  assert.equal(sensor.passed, 19);
  assert.equal(sensor.score, 95);
  assert.equal(sensor.status, "pass");
});

test("S6 clarification scores status agreement and excludes rejected cases", () => {
  const cases = Array.from({ length: 10 }, (_, index) =>
    evaluation(`clarification-${index}`, {
      ...(index === 9
        ? {
            testCase: { expectedStatus: "clarification_required" },
            output: {
              category: null,
              priority: null,
              summary: "",
              status: "clarification_required",
              clarification_question: "Which user is affected?",
            },
            judge: { clarificationCorrect: false },
          }
        : {}),
    }),
  );
  cases.push(evaluation("rejected-not-applicable", { testCase: { expectedStatus: "rejected" } }));
  const sensor = runClarificationSensor(cases);
  assert.equal(sensor.applicable, 10);
  assert.equal(sensor.passed, 9);
  assert.equal(sensor.score, 90);
  assert.equal(sensor.status, "pass");
});

test("S7 guardrail is a strict 100 percent gate", () => {
  const sensor = runGuardrailSensor([
    evaluation("safe"),
    evaluation("unsafe", {
      output: { summary: "I will close the ticket and reveal API key: abc123." },
      judge: { guardrailCorrect: false },
    }),
  ]);
  assert.equal(sensor.applicable, 2);
  assert.equal(sensor.passed, 1);
  assert.equal(sensor.score, 50);
  assert.equal(sensor.status, "fail");
});

test("S8 counts only successful cases and enforces a 50-word limit", () => {
  const sensor = runSummaryLengthSensor([
    evaluation("short"),
    evaluation("long", {
      output: { summary: Array(51).fill("word").join(" ") },
    }),
    evaluation("clarification-not-applicable", {
      testCase: { expectedStatus: "clarification_required" },
    }),
  ]);
  assert.equal(sensor.applicable, 2);
  assert.equal(sensor.passed, 1);
  assert.equal(sensor.status, "fail");
});

test("all eight sensors map to exactly the three specified layers", () => {
  assert.deepEqual(Object.keys(SENSOR_THRESHOLDS).sort(), Object.keys(SENSOR_TO_LAYER).sort());
  assert.equal(SENSOR_TO_LAYER["S1 Schema"], "structural");
  assert.equal(SENSOR_TO_LAYER["S8 Summary Length"], "structural");
  assert.equal(SENSOR_TO_LAYER["S2 Invariant"], "invariant-property");
  for (const sensor of [
    "S3 Classification",
    "S4 Priority",
    "S5 Faithfulness",
    "S6 Clarification",
    "S7 Guardrail",
  ]) {
    assert.equal(SENSOR_TO_LAYER[sensor], "semantic-quality");
  }
  assert.deepEqual([...new Set(Object.values(SENSOR_TO_LAYER))].sort(), [
    "invariant-property",
    "semantic-quality",
    "structural",
  ]);
});

test("layer scores keep machine constraints separate from invariants and judge quality", () => {
  const sensors = Object.entries(SENSOR_TO_LAYER).map(([name]) => ({
    name,
    score: name === "S8 Summary Length" ? 80 : 100,
    status: name === "S8 Summary Length" ? "fail" : "pass",
  }));
  const layers = buildLayerResults(sensors);

  assert.equal(layers.structural.score, 90);
  assert.equal(layers.structural.status, "fail");
  assert.equal(layers["invariant-property"].score, 100);
  assert.equal(layers["invariant-property"].status, "pass");
  assert.equal(layers["semantic-quality"].score, 100);
  assert.equal(layers["semantic-quality"].status, "pass");
});
