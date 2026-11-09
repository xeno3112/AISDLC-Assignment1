import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createGeminiProvider,
  LlmProviderError,
  type JsonSchema,
} from "../../src/services/llm/provider.js";
import { LOG_FILE_PATH } from "../../src/utils/logger.js";

function responseWith(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Gemini generateContent provider", () => {
  it("uses the documented endpoint, authentication header, and structured JSON schema", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return responseWith({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify({ status: "success" }) }] },
          },
        ],
      });
    };
    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      fetchImpl,
    });

    const responseJsonSchema: JsonSchema = {
      type: "object",
      properties: {
        category: { type: "string", nullable: true },
      },
      required: ["category"],
      additionalProperties: false,
    };
    await expect(
      provider.generate("System instructions", "Ticket details", responseJsonSchema),
    ).resolves.toBe(JSON.stringify({ status: "success" }));
    expect(requestUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    );
    expect(new Headers(requestInit?.headers).get("x-goog-api-key")).toBe("test-key");

    const requestBody =
      typeof requestInit?.body === "string" ? JSON.parse(requestInit.body) : undefined;
    expect(requestBody.systemInstruction).toEqual({
      parts: [{ text: "System instructions" }],
    });
    expect(requestBody.contents).toEqual([{ role: "user", parts: [{ text: "Ticket details" }] }]);
    expect(requestBody.generationConfig).toEqual({
      responseMimeType: "application/json",
      seed: 0,
      responseJsonSchema,
    });
  });

  it("logs request and response metadata without logging prompts, tickets, or model output", async () => {
    const outputText = JSON.stringify({ summary: "private model output" });
    const ticketInput = "private ticket description";
    const systemPrompt = "private system prompt";
    const previousLogSize = existsSync(LOG_FILE_PATH) ? readFileSync(LOG_FILE_PATH).length : 0;
    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      fetchImpl: async () =>
        responseWith({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: outputText }] } }],
        }),
    });

    await provider.generate(systemPrompt, ticketInput);

    const appendedLog = readFileSync(LOG_FILE_PATH, "utf8").slice(previousLogSize);
    const logEntries = appendedLog
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(logEntries).toContainEqual(expect.objectContaining({ inputLength: ticketInput.length }));
    expect(logEntries).toContainEqual(
      expect.objectContaining({ systemPromptLength: systemPrompt.length }),
    );
    expect(logEntries).toContainEqual(
      expect.objectContaining({
        message: "LLM response received",
        outputLength: outputText.length,
      }),
    );
    expect(appendedLog).not.toContain(systemPrompt);
    expect(appendedLog).not.toContain(ticketInput);
    expect(appendedLog).not.toContain(outputText);
  });

  it("fails explicitly when credentials are missing or the provider rejects a request", async () => {
    const missingKeyProvider = createGeminiProvider({ apiKey: "", model: "gemini-3.8-flash" });
    await expect(missingKeyProvider.generate("system", "ticket")).rejects.toBeInstanceOf(
      LlmProviderError,
    );

    const failedProvider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      fetchImpl: async () => responseWith({ error: "private details" }, 401),
    });
    await expect(failedProvider.generate("system", "ticket")).rejects.toThrow("status 401");
    await expect(failedProvider.generate("system", "ticket")).rejects.not.toThrow(
      "private details",
    );
  });

  it("attaches safe failure codes to provider errors", async () => {
    const failedProvider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      fetchImpl: async () => responseWith({ error: "private details" }, 401),
    });

    await expect(failedProvider.generate("system", "ticket")).rejects.toMatchObject({
      diagnosticCode: "gemini_http_error",
      statusCode: 401,
    });
  });

  it("reports request timeouts explicitly", async () => {
    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      timeoutMs: 5,
      fetchImpl: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("Missing abort signal."));
            return;
          }
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    });

    await expect(provider.generate("system", "ticket")).rejects.toThrow("timed out");
  });
});
