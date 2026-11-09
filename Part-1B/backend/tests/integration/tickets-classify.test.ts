import { readFileSync } from "node:fs";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { LlmProviderError } from "../../src/services/llm/provider.js";
import { LOG_FILE_PATH } from "../../src/utils/logger.js";

const successfulResult = {
  category: "Technical Issue" as const,
  priority: "Critical" as const,
  summary: "A confirmed production outage affects 500 users.",
  status: "success" as const,
  clarification_question: null,
};

describe("POST /api/v1/tickets/classify", () => {
  it("returns a validated five-field result for a valid submission", async () => {
    const classifyTicket = vi.fn(async () => successfulResult);
    const response = await request(createApp({ classifyTicket }))
      .post("/api/v1/tickets/classify")
      .send({ description: "Production is down for 500 users." });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(successfulResult);
    expect(Object.keys(response.body).sort()).toEqual([
      "category",
      "clarification_question",
      "priority",
      "status",
      "summary",
    ]);
    expect(classifyTicket).toHaveBeenCalledWith("Production is down for 500 users.");
  });

  it("uses 422 for a valid clarification response", async () => {
    const clarificationResult = {
      category: null,
      priority: null,
      summary: "",
      status: "clarification_required" as const,
      clarification_question: "How many users are affected?",
    };
    const response = await request(createApp({ classifyTicket: async () => clarificationResult }))
      .post("/api/v1/tickets/classify")
      .send({ description: "The application is slow." });

    expect(response.status).toBe(422);
    expect(response.body).toEqual(clarificationResult);
  });

  it("rejects invalid submissions before calling the classifier", async () => {
    const classifyTicket = vi.fn(async () => successfulResult);
    const response = await request(createApp({ classifyTicket }))
      .post("/api/v1/tickets/classify")
      .send({ description: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "A valid ticket description is required." });
    expect(classifyTicket).not.toHaveBeenCalled();
  });

  it("returns a safe error when the provider fails", async () => {
    const response = await request(
      createApp({
        classifyTicket: async () => {
          throw new LlmProviderError("sensitive provider response", "gemini_http_error");
        },
      }),
    )
      .post("/api/v1/tickets/classify")
      .send({ description: "The reporting dashboard is down." });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "The classification service could not process this ticket.",
    });
    expect(JSON.stringify(response.body)).not.toContain("sensitive provider response");
  });

  it("logs provider diagnostic codes without exposing the provider message", async () => {
    const response = await request(
      createApp({
        classifyTicket: async () => {
          throw new LlmProviderError("sensitive provider response", "gemini_http_error", 401);
        },
      }),
    )
      .post("/api/v1/tickets/classify")
      .send({ description: "The reporting dashboard is down." });

    const logEntries = readFileSync(LOG_FILE_PATH, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((entry) => entry.requestId === response.headers["x-request-id"]);
    expect(logEntries).toContainEqual(
      expect.objectContaining({
        diagnosticCode: "gemini_http_error",
        statusCode: 401,
      }),
    );
    expect(JSON.stringify(logEntries)).not.toContain("sensitive provider response");
  });

  it("logs request and response metadata without logging the ticket description", async () => {
    const description = "Private ticket text that must not appear in logs.";
    const response = await request(createApp({ classifyTicket: async () => successfulResult }))
      .post("/api/v1/tickets/classify")
      .send({ description });

    const logEntries = readFileSync(LOG_FILE_PATH, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((entry) => entry.requestId === response.headers["x-request-id"]);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(logEntries).toContainEqual(
      expect.objectContaining({ message: "HTTP request completed", statusCode: 200 }),
    );
    expect(logEntries).toContainEqual(
      expect.objectContaining({
        message: "Ticket classification started",
        ticketLength: description.length,
      }),
    );
    expect(logEntries).toContainEqual(
      expect.objectContaining({
        message: "Runtime classification sensors evaluated",
        schema: "pass",
        invariant: "pass",
        guardrail: "pass",
        summaryLength: "pass",
        allApplicablePassed: true,
      }),
    );
    expect(JSON.stringify(logEntries)).not.toContain(description);
  });

  it("blocks a response that fails the runtime guardrail sensor", async () => {
    const unsafeResult = {
      ...successfulResult,
      summary: "We have resolved the issue.",
    };
    const response = await request(createApp({ classifyTicket: async () => unsafeResult }))
      .post("/api/v1/tickets/classify")
      .send({ description: "The reporting dashboard is down." });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "The classification response did not meet runtime safety checks.",
    });
  });
});
