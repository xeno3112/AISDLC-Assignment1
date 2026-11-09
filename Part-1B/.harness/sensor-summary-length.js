const { createSensorResult } = require("./scoring.js");

function countWords(value) {
  return typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

function runSummaryLengthSensor(evaluations) {
  return createSensorResult(
    "S8 Summary Length",
    evaluations.map(({ testCase, output }) => {
      const applicable = testCase.expectedStatus === "success";
      const passed =
        applicable &&
        output?.status === "success" &&
        typeof output.summary === "string" &&
        countWords(output.summary) <= 50;
      return {
        caseId: testCase.id,
        applicable,
        passed,
        reason: passed ? undefined : "summary_exceeds_50_words_or_missing",
      };
    }),
  );
}

module.exports = { countWords, runSummaryLengthSensor };
