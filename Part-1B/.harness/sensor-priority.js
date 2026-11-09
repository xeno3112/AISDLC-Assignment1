const { createSensorResult } = require("./scoring.js");

function runPrioritySensor(evaluations) {
  return createSensorResult(
    "S4 Priority",
    evaluations.map(({ testCase, output, judge }) => {
      const applicable = testCase.expectedStatus === "success";
      const passed =
        applicable &&
        output?.status === "success" &&
        output.priority === testCase.expectedPriority &&
        judge?.priorityCorrect === true;
      return {
        caseId: testCase.id,
        applicable,
        passed,
        reason: passed ? undefined : "expected_priority_or_judge_mismatch",
      };
    }),
  );
}

module.exports = { runPrioritySensor };
