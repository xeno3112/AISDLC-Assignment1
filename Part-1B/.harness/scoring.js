const { SENSOR_THRESHOLDS, SENSOR_TO_LAYER } = require("./constants.js");

function createSensorResult(name, outcomes) {
  const applicable = outcomes.filter((outcome) => outcome.applicable);
  const passed = applicable.filter((outcome) => outcome.passed).length;
  const threshold = SENSOR_THRESHOLDS[name];
  if (threshold === undefined) {
    throw new Error(`Unknown evaluation sensor: ${name}`);
  }
  const score = applicable.length === 0 ? 100 : (passed / applicable.length) * 100;
  const evidence = applicable
    .filter((outcome) => !outcome.passed)
    .map((outcome) => ({
      caseId: outcome.caseId,
      reason: outcome.reason || "check_failed",
    }));

  return {
    name,
    passed,
    applicable: applicable.length,
    score,
    threshold,
    status: score >= threshold ? "pass" : "fail",
    evidence,
  };
}

function buildLayerResults(sensors) {
  const layers = {};
  for (const [sensorName, layerName] of Object.entries(SENSOR_TO_LAYER)) {
    const sensor = sensors.find((entry) => entry.name === sensorName);
    if (!sensor) {
      throw new Error(`Missing required sensor result: ${sensorName}`);
    }
    const layer = layers[layerName] || { scores: [], status: "pass" };
    layer.scores.push(sensor.score);
    if (sensor.status !== "pass") {
      layer.status = "fail";
    }
    layers[layerName] = layer;
  }

  return Object.fromEntries(
    Object.entries(layers).map(([name, layer]) => [
      name,
      {
        score: layer.scores.reduce((total, score) => total + score, 0) / layer.scores.length,
        status: layer.status,
      },
    ]),
  );
}

function computeGate(sensors) {
  if (!Array.isArray(sensors) || sensors.length !== Object.keys(SENSOR_THRESHOLDS).length) {
    throw new Error("All eight required sensor results are needed to compute the evaluation gate.");
  }
  for (const name of Object.keys(SENSOR_THRESHOLDS)) {
    if (!sensors.some((sensor) => sensor.name === name)) {
      throw new Error(`Missing required sensor result: ${name}`);
    }
  }

  const aggregateScore =
    sensors.reduce((total, sensor) => total + sensor.score, 0) / sensors.length;
  const sensorBoundariesPassed = sensors.every((sensor) => sensor.status === "pass");
  const criticalFailure = sensors.some(
    (sensor) =>
      ["S1 Schema", "S2 Invariant", "S7 Guardrail"].includes(sensor.name) &&
      sensor.status !== "pass",
  );
  const passed = aggregateScore >= 90 && sensorBoundariesPassed && !criticalFailure;

  return {
    aggregateScore,
    status: passed ? "PASS" : "FAIL",
    sensorBoundariesPassed,
    criticalFailure,
  };
}

module.exports = { buildLayerResults, computeGate, createSensorResult };
