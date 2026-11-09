const { CATEGORIES, PRIORITIES, STATUSES } = require("./constants.js");

const REQUIRED_BEHAVIOR_COVERAGE = [
  "grounded_summary",
  "ambiguous_input",
  "identify_conflict",
  "identify_missing_information",
  "ignore_prompt_injection",
  "no_ticket_lifecycle_action",
  "reject_empty_input",
  "reject_malformed_input",
  "do_not_fabricate_urgency",
  "do_not_fabricate_resolution",
  "reject_unsupported_input",
];

function validateDataset(dataset) {
  const errors = [];
  if (!dataset || typeof dataset !== "object" || !Array.isArray(dataset.cases)) {
    return { valid: false, errors: ["dataset.cases must be an array"] };
  }
  if (!Number.isInteger(dataset.version) || dataset.version < 1) {
    errors.push("dataset.version must be a positive integer");
  }

  const ids = new Set();
  const uniqueInputs = new Set();
  const coveredCategories = new Set();
  const coveredPriorities = new Set();
  const coveredBehavior = new Set();
  let hasLongDescription = false;

  for (const [index, testCase] of dataset.cases.entries()) {
    const label = `case ${index + 1}`;
    if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (typeof testCase.id !== "string" || testCase.id.trim().length === 0) {
      errors.push(`${label} requires a non-empty id`);
    } else if (ids.has(testCase.id)) {
      errors.push(`${label} has a duplicate id`);
    } else {
      ids.add(testCase.id);
    }

    if (
      typeof testCase.input !== "string" &&
      (testCase.input === null ||
        typeof testCase.input !== "object" ||
        Array.isArray(testCase.input))
    ) {
      errors.push(`${label}.input must be a string or malformed payload object`);
    } else {
      const inputKey = JSON.stringify(testCase.input);
      if (uniqueInputs.has(inputKey)) {
        errors.push(`${label} duplicates another input`);
      }
      uniqueInputs.add(inputKey);
      if (
        typeof testCase.input === "string" &&
        testCase.input.trim().split(/\s+/).filter(Boolean).length > 50
      ) {
        hasLongDescription = true;
      }
    }

    if (!STATUSES.includes(testCase.expectedStatus)) {
      errors.push(`${label}.expectedStatus is invalid`);
    } else if (testCase.expectedStatus === "success") {
      if (!CATEGORIES.includes(testCase.expectedCategory)) {
        errors.push(`${label}.expectedCategory is invalid for success`);
      } else {
        coveredCategories.add(testCase.expectedCategory);
      }
      if (!PRIORITIES.includes(testCase.expectedPriority)) {
        errors.push(`${label}.expectedPriority is invalid for success`);
      } else {
        coveredPriorities.add(testCase.expectedPriority);
      }
    } else if (testCase.expectedCategory !== null || testCase.expectedPriority !== null) {
      errors.push(`${label} non-success cases must have null category and priority`);
    }

    for (const field of ["requiredBehavior", "semanticCriteria", "requirementRefs"]) {
      if (
        !Array.isArray(testCase[field]) ||
        testCase[field].length === 0 ||
        testCase[field].some((item) => typeof item !== "string" || item.trim().length === 0)
      ) {
        errors.push(`${label}.${field} must be a non-empty array of strings`);
      }
    }
    if (Array.isArray(testCase.requiredBehavior)) {
      testCase.requiredBehavior.forEach((behavior) => coveredBehavior.add(behavior));
    }
  }

  if (dataset.cases.length < 15) {
    errors.push("dataset must contain at least 15 cases");
  }
  for (const category of CATEGORIES) {
    if (!coveredCategories.has(category)) {
      errors.push(`dataset does not cover category ${category}`);
    }
  }
  for (const priority of PRIORITIES) {
    if (!coveredPriorities.has(priority)) {
      errors.push(`dataset does not cover priority ${priority}`);
    }
  }
  if (!hasLongDescription) {
    errors.push("dataset must contain a description longer than 50 words");
  }
  for (const behavior of REQUIRED_BEHAVIOR_COVERAGE) {
    if (!coveredBehavior.has(behavior)) {
      errors.push(`dataset does not cover behavior ${behavior}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { REQUIRED_BEHAVIOR_COVERAGE, validateDataset };
