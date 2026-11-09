const { createSensorResult } = require("./scoring.js");

function runFaithfulnessSensor(evaluations) {
  return createSensorResult(
    "S5 Faithfulness",
    evaluations.map(({ testCase, output, judge }) => {
      const applicable = testCase.expectedStatus === "success";
      const passed =
        applicable && output?.status === "success" && judge?.faithfulnessCorrect === true;
      return {
        caseId: testCase.id,
        applicable,
        passed,
        reason: passed ? undefined : "judge_marked_summary_unfaithful",
      };
    }),
  );
}

module.exports = { runFaithfulnessSensor };
