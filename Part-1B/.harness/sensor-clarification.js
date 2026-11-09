const { createSensorResult } = require("./scoring.js");

function runClarificationSensor(evaluations) {
  return createSensorResult(
    "S6 Clarification",
    evaluations.map(({ testCase, output, judge }) => {
      const applicable = testCase.expectedStatus !== "rejected";
      const passed =
        applicable &&
        output?.status === testCase.expectedStatus &&
        judge?.clarificationCorrect === true;
      return {
        caseId: testCase.id,
        applicable,
        passed,
        reason: passed ? undefined : "expected_status_or_clarification_mismatch",
      };
    }),
  );
}

module.exports = { runClarificationSensor };
