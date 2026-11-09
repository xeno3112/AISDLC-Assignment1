const DECISIONS = ["ACCEPT", "REJECT"];
const REVIEW_FIELDS = [
  "evaluationRunId",
  "reviewer",
  "decision",
  "justification",
  "knownLimitations",
  "residualRisks",
  "timestamp",
];

function validateHumanReview(review, expectedRunId) {
  if (Array.isArray(review)) {
    const currentReviews = review.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        entry.evaluationRunId === expectedRunId,
    );
    if (currentReviews.length !== 1) {
      return {
        valid: false,
        state: "PENDING_HUMAN_REVIEW",
        errors: [
          currentReviews.length === 0
            ? "review_must_reference_the_current_evaluation_run"
            : "review_must_reference_the_current_evaluation_run_only_once",
        ],
        review: null,
      };
    }
    return validateHumanReviewEntry(currentReviews[0], expectedRunId);
  }
  return validateHumanReviewEntry(review, expectedRunId);
}

function validateHumanReviewEntry(review, expectedRunId) {
  const errors = [];
  if (review === null || review === undefined) {
    return {
      valid: false,
      state: "PENDING_HUMAN_REVIEW",
      errors: ["review_file_missing"],
      review: null,
    };
  }
  if (typeof review !== "object" || Array.isArray(review)) {
    return {
      valid: false,
      state: "PENDING_HUMAN_REVIEW",
      errors: ["review_must_be_an_object"],
      review: null,
    };
  }

  const keys = Object.keys(review).sort();
  const expectedKeys = [...REVIEW_FIELDS].sort();
  if (
    keys.length !== expectedKeys.length ||
    !keys.every((key, index) => key === expectedKeys[index])
  ) {
    errors.push("review_fields_must_match_the_review_contract");
  }
  for (const field of ["evaluationRunId", "reviewer", "justification"]) {
    if (typeof review[field] !== "string" || review[field].trim().length === 0) {
      errors.push(`${field}_is_required`);
    }
  }
  for (const field of ["knownLimitations", "residualRisks"]) {
    if (typeof review[field] !== "string") {
      errors.push(`${field}_must_be_a_string`);
    }
  }
  if (!DECISIONS.includes(review.decision)) {
    errors.push("decision_must_be_ACCEPT_or_REJECT");
  }
  if (review.evaluationRunId !== expectedRunId) {
    errors.push("review_must_reference_the_current_evaluation_run");
  }
  if (
    typeof review.timestamp !== "string" ||
    Number.isNaN(Date.parse(review.timestamp)) ||
    new Date(review.timestamp).toISOString() !== review.timestamp
  ) {
    errors.push("timestamp_must_be_an_iso_datetime");
  }

  const valid = errors.length === 0;
  return {
    valid,
    state: valid
      ? review.decision === "ACCEPT"
        ? "ACCEPTED"
        : "REJECTED"
      : "PENDING_HUMAN_REVIEW",
    errors,
    review: valid
      ? {
          reviewer: review.reviewer.trim(),
          decision: review.decision,
          timestamp: review.timestamp,
        }
      : null,
  };
}

module.exports = { DECISIONS, REVIEW_FIELDS, validateHumanReview };
