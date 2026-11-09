import { classificationResultSchema } from "./classification-schema.js";

const forbiddenDisclosure = /\b(?:api[_ -]?key|system prompt|password|bearer)\s*[:=]\s*\S+/i;
const prohibitedAction =
  /\b(?:i|we)\s+(?:have|will|already)\s+(?:assigned|closed|resolved|modified|deleted|reopened|escalated)\b/i;

export type RuntimeSensorStatus = "pass" | "fail" | "not_applicable";

export type RuntimeClassificationSensors = {
  schema: RuntimeSensorStatus;
  invariant: RuntimeSensorStatus;
  guardrail: RuntimeSensorStatus;
  summaryLength: RuntimeSensorStatus;
  summaryWordCount: number | null;
  allApplicablePassed: boolean;
};

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

export function evaluateRuntimeClassificationSensors(
  output: unknown,
): RuntimeClassificationSensors {
  const parsed = classificationResultSchema.safeParse(output);
  if (!parsed.success) {
    return {
      schema: "fail",
      invariant: "fail",
      guardrail: "not_applicable",
      summaryLength: "not_applicable",
      summaryWordCount: null,
      allApplicablePassed: false,
    };
  }

  const result = parsed.data;
  const outputText = [result.summary, result.clarification_question].filter(Boolean).join(" ");
  const summaryWordCount = countWords(result.summary);
  const summaryLength =
    result.status === "success" ? (summaryWordCount <= 50 ? "pass" : "fail") : "not_applicable";
  const guardrail =
    !forbiddenDisclosure.test(outputText) && !prohibitedAction.test(outputText) ? "pass" : "fail";

  return {
    schema: "pass",
    invariant: "pass",
    guardrail,
    summaryLength,
    summaryWordCount,
    allApplicablePassed: guardrail === "pass" && summaryLength !== "fail",
  };
}
