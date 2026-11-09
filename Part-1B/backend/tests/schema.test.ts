import { describe, expect, it } from "vitest";

import { classificationResultSchema, ticketSubmissionSchema } from "../src/domain/validation/classification-schema.js";

describe("classification schema", () => {
  it("accepts a valid success payload", () => {
    const payload = {
      category: "Technical Issue",
      priority: "High",
      summary: "The checkout API keeps timing out for customers in Europe.",
      status: "success",
      clarification_question: null,
    };

    expect(() => classificationResultSchema.parse(payload)).not.toThrow();
  });

  it("rejects a rejected response with a non-empty summary", () => {
    expect(() =>
      classificationResultSchema.parse({
        category: null,
        priority: null,
        summary: "This should be empty",
        status: "rejected",
        clarification_question: null,
      }),
    ).toThrow();
  });

  it("requires a non-empty description", () => {
    expect(() =>
      ticketSubmissionSchema.parse({
        description: "   ",
      }),
    ).toThrow();
  });
});
