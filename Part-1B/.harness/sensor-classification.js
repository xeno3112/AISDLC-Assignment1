const { createSensorResult } = require("./scoring.js");

function runClassificationSensor(evaluations) {
  return createSensorResult(
    "S3 Classification",
    evaluations.map(({ testCase, output, judge }) => {
      const applicable = testCase.expectedStatus === "success";
      const passed =
        applicable &&
        output?.status === "success" &&
        output.category === testCase.expectedCategory &&
        judge?.classificationCorrect === true;
      return {
        caseId: testCase.id,
        applicable,
        passed,
        reason: passed ? undefined : "expected_category_or_judge_mismatch",
      };
    }),
  );
}

module.exports = { runClassificationSensor };
