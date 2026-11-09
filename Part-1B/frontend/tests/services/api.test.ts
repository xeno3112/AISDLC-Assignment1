import { afterEach, describe, expect, it, vi } from "vitest";

import { classifyTicket } from "../../src/services/api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("classifyTicket", () => {
  it("accepts valid clarification responses returned with HTTP 422", async () => {
    const result = {
      category: null,
      priority: null,
      summary: "",
      status: "clarification_required",
      clarification_question: "How many users are affected?",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(result), {
            status: 422,
            headers: { "content-type": "application/json", "x-request-id": "request-123" },
          }),
      ),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(classifyTicket("The app is slow.")).resolves.toEqual(result);
  });

  it("logs a safe diagnostic for invalid JSON without logging the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("private response text", {
            status: 200,
            headers: { "content-type": "text/plain", "x-request-id": "request-456" },
          }),
      ),
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(classifyTicket("A ticket description.")).rejects.toThrow(
      "The classification service returned an invalid response.",
    );
    expect(logError).toHaveBeenCalledWith(
      "Classification response was not JSON",
      expect.objectContaining({
        requestId: "request-456",
        diagnosticCode: "response_json_invalid",
      }),
    );
    expect(JSON.stringify(logError.mock.calls)).not.toContain("private response text");
  });

  it("accepts a successful result and rejects a response that violates the contract", async () => {
    const result = {
      category: "Technical Issue",
      priority: "Medium",
      summary: "A report is slow.",
      status: "success",
      clarification_question: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await expect(classifyTicket("A report is slow.")).resolves.toEqual(result);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ...result,
              summary: "word ".repeat(51),
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      ),
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(classifyTicket("A report is slow.")).rejects.toThrow(
      "The classification service returned an invalid response.",
    );
    expect(logError).toHaveBeenCalledWith(
      "Classification response did not match the contract",
      expect.objectContaining({ diagnosticCode: "response_field_types_invalid" }),
    );
  });
});
