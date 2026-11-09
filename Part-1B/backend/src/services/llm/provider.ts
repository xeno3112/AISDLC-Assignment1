import { logger } from "../../utils/logger.js";

type GenerateContentPayload = {
  candidates?: unknown;
  promptFeedback?: unknown;
};

export type LlmProvider = {
  generate(
    systemPrompt: string,
    userInput: string,
    responseJsonSchema?: JsonSchema,
  ): Promise<string>;
};

export const GEMINI_GENERATION_SEED = 0;

export type JsonSchema = {
  type: "object" | "string";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: readonly string[];
  nullable?: boolean;
  maxLength?: number;
  description?: string;
};

export class LlmProviderError extends Error {
  readonly diagnosticCode: string;
  readonly statusCode?: number;

  constructor(message: string, diagnosticCode: string, statusCode?: number) {
    super(message);
    this.name = "LlmProviderError";
    this.diagnosticCode = diagnosticCode;
    this.statusCode = statusCode;
  }
}

type GeminiProviderOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function extractOutputText(payload: GenerateContentPayload): string | undefined {
  if (!Array.isArray(payload.candidates)) {
    return undefined;
  }

  const candidate = payload.candidates[0];
  if (!isRecord(candidate)) {
    return undefined;
  }
  if (candidate.finishReason !== undefined && candidate.finishReason !== "STOP") {
    throw new LlmProviderError(
      "The Gemini response did not complete successfully.",
      "gemini_generation_incomplete",
    );
  }

  const content = candidate.content;
  if (!isRecord(content) || !Array.isArray(content.parts)) {
    return undefined;
  }

  for (const part of content.parts) {
    if (isRecord(part) && typeof part.text === "string") {
      return part.text;
    }
  }

  return undefined;
}

export function createGeminiProvider({
  apiKey,
  model,
  baseUrl = "https://generativelanguage.googleapis.com/v1beta",
  timeoutMs = 120_000,
  fetchImpl = fetch,
}: GeminiProviderOptions): LlmProvider {
  return {
    async generate(systemPrompt, userInput, responseJsonSchema) {
      if (!apiKey.trim()) {
        logger.error("LLM request not sent", {
          diagnosticCode: "gemini_api_key_missing",
          model,
        });
        throw new LlmProviderError(
          "The Gemini API key is not configured.",
          "gemini_api_key_missing",
        );
      }

      const signal = AbortSignal.timeout(timeoutMs);
      const startedAt = Date.now();
      logger.info("LLM request started", {
        model,
        systemPromptLength: systemPrompt.length,
        inputLength: userInput.length,
        timeoutMs,
        structuredOutput: responseJsonSchema !== undefined,
      });
      let response: Response;

      try {
        response = await fetchImpl(
          `${baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userInput }] }],
              generationConfig: {
                responseMimeType: "application/json",
                seed: GEMINI_GENERATION_SEED,
                ...(responseJsonSchema ? { responseJsonSchema } : {}),
              },
            }),
            signal,
          },
        );
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
          logger.error("LLM request failed", {
            diagnosticCode: "gemini_request_timeout",
            durationMs: Date.now() - startedAt,
          });
          throw new LlmProviderError("The Gemini request timed out.", "gemini_request_timeout");
        }

        logger.error("LLM request failed", {
          diagnosticCode: "gemini_request_failed",
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError("The Gemini request failed.", "gemini_request_failed");
      }

      if (!response.ok) {
        logger.error("LLM request failed", {
          diagnosticCode: "gemini_http_error",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError(
          `The Gemini request failed with status ${response.status}.`,
          "gemini_http_error",
          response.status,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        logger.error("LLM response rejected", {
          diagnosticCode: "gemini_response_json_invalid",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError(
          "The Gemini response was not valid JSON.",
          "gemini_response_json_invalid",
        );
      }

      if (!isRecord(payload)) {
        logger.error("LLM response rejected", {
          diagnosticCode: "gemini_response_invalid",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError("The Gemini response was not valid.", "gemini_response_invalid");
      }

      const responsePayload: GenerateContentPayload = {
        candidates: payload.candidates,
        promptFeedback: payload.promptFeedback,
      };
      if (
        !Array.isArray(responsePayload.candidates) &&
        responsePayload.promptFeedback !== undefined
      ) {
        logger.error("LLM response rejected", {
          diagnosticCode: "gemini_candidate_missing",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError(
          "The Gemini request did not produce a candidate response.",
          "gemini_candidate_missing",
        );
      }

      let outputText: string | undefined;
      try {
        outputText = extractOutputText(responsePayload);
      } catch (error) {
        if (error instanceof LlmProviderError) {
          logger.error("LLM response rejected", {
            diagnosticCode: error.diagnosticCode,
            statusCode: response.status,
            durationMs: Date.now() - startedAt,
          });
        }
        throw error;
      }
      if (outputText === undefined) {
        logger.error("LLM response rejected", {
          diagnosticCode: "gemini_output_missing",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new LlmProviderError(
          "The Gemini response did not contain classification output.",
          "gemini_output_missing",
        );
      }

      logger.info("LLM response received", {
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        candidateCount: Array.isArray(responsePayload.candidates)
          ? responsePayload.candidates.length
          : 0,
        outputLength: outputText.length,
      });
      return outputText;
    },
  };
}
