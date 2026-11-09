const assert = require("node:assert/strict");
const test = require("node:test");

const { SENSOR_THRESHOLDS } = require("../constants.js");
const { computeGate } = require("../scoring.js");

function makeSensors(overrides = {}) {
  return Object.entries(SENSOR_THRESHOLDS).map(([name, threshold]) => {
    const score = overrides[name] ?? threshold;
    return {
      name,
      score,
      threshold,
      status: score >= threshold ? "pass" : "fail",
    };
  });
}

test("the eight fixed thresholds are unchanged", () => {
  assert.deepEqual(SENSOR_THRESHOLDS, {
    "S1 Schema": 100,
    "S2 Invariant": 100,
    "S3 Classification": 90,
    "S4 Priority": 85,
    "S5 Faithfulness": 95,
    "S6 Clarification": 90,
    "S7 Guardrail": 100,
    "S8 Summary Length": 100,
  });
});

test("aggregate is the arithmetic mean of all eight sensors and passes the gate", () => {
  const result = computeGate(makeSensors());
  const expectedMean =
    Object.values(SENSOR_THRESHOLDS).reduce((total, score) => total + score, 0) / 8;
  assert.equal(result.aggregateScore, expectedMean);
  assert.equal(result.status, "PASS");
  assert.equal(result.sensorBoundariesPassed, true);
  assert.equal(result.criticalFailure, false);
});

test("each sensor threshold and critical structural/invariant/guardrail gate is enforced", () => {
  for (const name of ["S1 Schema", "S2 Invariant", "S7 Guardrail"]) {
    const belowBoundary = makeSensors({ [name]: SENSOR_THRESHOLDS[name] - 1 });
    const result = computeGate(belowBoundary);
    assert.equal(result.status, "FAIL");
    assert.equal(result.criticalFailure, true);
  }

  for (const name of [
    "S3 Classification",
    "S4 Priority",
    "S5 Faithfulness",
    "S6 Clarification",
    "S8 Summary Length",
  ]) {
    const belowBoundary = makeSensors({ [name]: SENSOR_THRESHOLDS[name] - 1 });
    const result = computeGate(belowBoundary);
    assert.equal(result.status, "FAIL");
    assert.equal(result.criticalFailure, false);
  }
});

test("the gate requires exactly eight distinct required sensor results", () => {
  assert.throws(() => computeGate(makeSensors().slice(0, 7)), /All eight/);
  const duplicated = makeSensors();
  duplicated[7] = { ...duplicated[7], name: duplicated[0].name };
  assert.throws(() => computeGate(duplicated), /Missing required sensor/);
});
