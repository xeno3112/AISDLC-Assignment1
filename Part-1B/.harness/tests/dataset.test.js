const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { validateDataset } = require("../dataset.js");

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../evals/dataset.json"), "utf8"),
);

test("the fixed dataset has distinct cases and covers required classifications and input classes", () => {
  const validation = validateDataset(dataset);
  assert.deepEqual(validation, { valid: true, errors: [] });
  assert.ok(dataset.cases.length >= 15);
  assert.equal(new Set(dataset.cases.map((testCase) => testCase.id)).size, dataset.cases.length);
  assert.equal(
    new Set(dataset.cases.map((testCase) => JSON.stringify(testCase.input))).size,
    dataset.cases.length,
  );
  assert.ok(
    dataset.cases.some(
      (testCase) =>
        typeof testCase.input === "string" &&
        testCase.input.trim().split(/\s+/).filter(Boolean).length > 50,
    ),
  );
  for (const behavior of [
    "identify_conflict",
    "identify_missing_information",
    "ambiguous_input",
    "reject_empty_input",
    "reject_malformed_input",
    "ignore_prompt_injection",
    "do_not_fabricate_urgency",
    "do_not_fabricate_resolution",
    "no_ticket_lifecycle_action",
    "reject_unsupported_input",
  ]) {
    assert.ok(
      dataset.cases.some((testCase) => testCase.requiredBehavior.includes(behavior)),
      `missing behavior coverage: ${behavior}`,
    );
  }
});

test("dataset validation rejects duplicate, underspecified, or incomplete cases", () => {
  const invalid = {
    version: 1,
    cases: [
      {
        ...dataset.cases[0],
        id: "duplicate",
        expectedCategory: "Unknown",
        requiredBehavior: [],
      },
      { ...dataset.cases[0], id: "duplicate" },
    ],
  };
  const validation = validateDataset(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("duplicate id")));
  assert.ok(validation.errors.some((error) => error.includes("at least 15")));
  assert.ok(validation.errors.some((error) => error.includes("expectedCategory")));
});
