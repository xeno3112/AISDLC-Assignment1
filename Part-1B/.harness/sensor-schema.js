const { CATEGORIES, PRIORITIES, RESULT_KEYS, STATUSES } = require("./constants.js");
const { createSensorResult } = require("./scoring.js");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runSchemaSensor(evaluations) {
  return createSensorResult(
    "S1 Schema",
    evaluations.map(({ testCase, output }) => {
      const caseId = testCase.id;
      if (!isRecord(output)) {
        return { caseId, applicable: true, passed: false, reason: "response_not_object" };
      }
      const keys = Object.keys(output).sort();
      const expectedKeys = [...RESULT_KEYS].sort();
      const exactKeys =
        keys.length === expectedKeys.length &&
        keys.every((key, index) => key === expectedKeys[index]);
      const valid =
        exactKeys &&
        (output.category === null || CATEGORIES.includes(output.category)) &&
        (output.priority === null || PRIORITIES.includes(output.priority)) &&
        typeof output.summary === "string" &&
        output.summary.length <= 250 &&
        STATUSES.includes(output.status) &&
        (output.clarification_question === null ||
          typeof output.clarification_question === "string");

      return {
        caseId,
        applicable: true,
        passed: valid,
        reason: valid ? undefined : "response_schema_invalid",
      };
    }),
  );
}

module.exports = { runSchemaSensor };
