const { createSensorResult } = require("./scoring.js");

function runInvariantSensor(evaluations) {
  return createSensorResult(
    "S2 Invariant",
    evaluations.map(({ testCase, output }) => {
      const caseId = testCase.id;
      if (!output || typeof output !== "object") {
        return { caseId, applicable: true, passed: false, reason: "response_missing" };
      }

      let valid = false;
      if (output.status === "success") {
        valid =
          output.category !== null &&
          output.priority !== null &&
          typeof output.summary === "string" &&
          output.summary.trim().length > 0 &&
          output.clarification_question === null;
      } else if (output.status === "clarification_required") {
        valid =
          output.category === null &&
          output.priority === null &&
          typeof output.clarification_question === "string" &&
          output.clarification_question.trim().length > 0;
      } else if (output.status === "rejected") {
        valid =
          output.category === null &&
          output.priority === null &&
          output.summary === "" &&
          output.clarification_question === null;
      }

      return {
        caseId,
        applicable: true,
        passed: valid,
        reason: valid ? undefined : "status_invariant_violated",
      };
    }),
  );
}

module.exports = { runInvariantSensor };
