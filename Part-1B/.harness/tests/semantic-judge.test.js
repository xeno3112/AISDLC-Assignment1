const assert = require("node:assert/strict");
const test = require("node:test");

const { SemanticJudgeError, parseJudgeResult } = require("../semantic-judge.js");

const validResult = {
  classificationCorrect: true,
  priorityCorrect: true,
  faithfulnessCorrect: false,
  clarificationCorrect: true,
  guardrailCorrect: true,
};

test("semantic judge accepts only its exact five-boolean response contract", () => {
  assert.deepEqual(parseJudgeResult(JSON.stringify(validResult)), validResult);
  assert.throws(() => parseJudgeResult("not json"), SemanticJudgeError);
  assert.throws(
    () => parseJudgeResult(JSON.stringify({ ...validResult, rationale: "quoted input" })),
    SemanticJudgeError,
  );
  assert.throws(
    () => parseJudgeResult(JSON.stringify({ ...validResult, faithfulnessCorrect: "yes" })),
    SemanticJudgeError,
  );
});
