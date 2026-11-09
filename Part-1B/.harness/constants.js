const CATEGORIES = ["Technical Issue", "Access Request", "Billing Issue", "General Inquiry"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["success", "clarification_required", "rejected"];

const SENSOR_THRESHOLDS = Object.freeze({
  "S1 Schema": 100,
  "S2 Invariant": 100,
  "S3 Classification": 90,
  "S4 Priority": 85,
  "S5 Faithfulness": 95,
  "S6 Clarification": 90,
  "S7 Guardrail": 100,
  "S8 Summary Length": 100,
});

const SENSOR_TO_LAYER = Object.freeze({
  "S1 Schema": "structural",
  "S8 Summary Length": "structural",
  "S2 Invariant": "invariant-property",
  "S3 Classification": "semantic-quality",
  "S4 Priority": "semantic-quality",
  "S5 Faithfulness": "semantic-quality",
  "S6 Clarification": "semantic-quality",
  "S7 Guardrail": "semantic-quality",
});

const RESULT_KEYS = ["category", "priority", "summary", "status", "clarification_question"];

module.exports = {
  CATEGORIES,
  PRIORITIES,
  RESULT_KEYS,
  SENSOR_THRESHOLDS,
  SENSOR_TO_LAYER,
  STATUSES,
};
