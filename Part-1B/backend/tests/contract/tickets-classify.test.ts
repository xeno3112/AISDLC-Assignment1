import { describe, expect, it } from "vitest";

import {
  CLASSIFICATION_CATEGORIES,
  CLASSIFICATION_PRIORITIES,
} from "../../src/domain/classification/types.js";
import { validateClassificationResponse } from "../../src/domain/validation/classification-schema.js";
import { evaluateRuntimeClassificationSensors } from "../../src/domain/validation/runtime-classification-sensors.js";

const response = {
  category: "Technical Issue",
  priority: "High",
  summary: "The reporting dashboard is unavailable for the finance team.",
  status: "success",
  clarification_question: null,
};

describe("classification response contract", () => {
  it("accepts every supported category and priority", () => {
    for (const category of CLASSIFICATION_CATEGORIES) {
      for (const priority of CLASSIFICATION_PRIORITIES) {
        expect(() =>
          validateClassificationResponse({ ...response, category, priority }),
        ).not.toThrow();
      }
    }
  });

  it("requires exactly the five documented response fields", () => {
    const validated = validateClassificationResponse(response);

    expect(Object.keys(validated).sort()).toEqual([
      "category",
      "clarification_question",
      "priority",
      "status",
      "summary",
    ]);
  });

  it("accepts a summary of 50 words and rejects one of 51 words", () => {
    expect(() =>
      validateClassificationResponse({ ...response, summary: Array(50).fill("fact").join(" ") }),
    ).not.toThrow();
    expect(() =>
      validateClassificationResponse({ ...response, summary: Array(51).fill("fact").join(" ") }),
    ).toThrow();
  });

  it("rejects unsupported categories, priorities, and additional fields", () => {
    expect(() =>
      validateClassificationResponse({ ...response, category: "Other" }),
    ).toThrow();
    expect(() =>
      validateClassificationResponse({ ...response, priority: "Urgent" }),
    ).toThrow();
    expect(() =>
      validateClassificationResponse({ ...response, internal: "unexpected" }),
    ).toThrow();
  });

  it("records runtime sensor outcomes without retaining ticket content", () => {
    expect(evaluateRuntimeClassificationSensors(response)).toEqual({
      schema: "pass",
      invariant: "pass",
      guardrail: "pass",
      summaryLength: "pass",
      summaryWordCount: 9,
      allApplicablePassed: true,
    });
    expect(evaluateRuntimeClassificationSensors(null)).toMatchObject({
      schema: "fail",
      invariant: "fail",
      allApplicablePassed: false,
    });
    expect(
      evaluateRuntimeClassificationSensors({
        ...response,
        summary: "We have resolved the issue.",
      }),
    ).toMatchObject({ guardrail: "fail", allApplicablePassed: false });
  });
});
