export const CLASSIFICATION_CATEGORIES = [
  "Technical Issue",
  "Access Request",
  "Billing Issue",
  "General Inquiry",
] as const;

export const CLASSIFICATION_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export type ClassificationResult = {
  category: (typeof CLASSIFICATION_CATEGORIES)[number] | null;
  priority: (typeof CLASSIFICATION_PRIORITIES)[number] | null;
  summary: string;
  status: "success" | "clarification_required" | "rejected";
  clarification_question: string | null;
};

const responseFields = ["category", "priority", "summary", "status", "clarification_question"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function classificationResultDiagnostic(value: unknown): string | null {
  if (!isRecord(value)) {
    return "response_not_object";
  }

  const keys = Object.keys(value);
  if (keys.length !== responseFields.length || !keys.every((key) => responseFields.includes(key))) {
    return "response_fields_invalid";
  }

  const { category, priority, summary, status, clarification_question: question } = value;
  const validCategory =
    category === null ||
    CLASSIFICATION_CATEGORIES.some((allowedCategory) => allowedCategory === category);
  const validPriority =
    priority === null ||
    CLASSIFICATION_PRIORITIES.some((allowedPriority) => allowedPriority === priority);

  if (
    !validCategory ||
    !validPriority ||
    typeof summary !== "string" ||
    summary.length > 250 ||
    summary.trim().split(/\s+/).filter(Boolean).length > 50 ||
    (question !== null && typeof question !== "string")
  ) {
    return "response_field_types_invalid";
  }

  if (status === "success") {
    return category !== null && priority !== null && summary.trim().length > 0 && question === null
      ? null
      : "response_success_invariant_invalid";
  }
  if (status === "clarification_required") {
    return category === null &&
      priority === null &&
      typeof question === "string" &&
      question.trim().length > 0
      ? null
      : "response_clarification_invariant_invalid";
  }
  return status === "rejected" &&
    category === null &&
    priority === null &&
    summary.trim().length === 0 &&
    question === null
    ? null
    : "response_rejected_invariant_invalid";
}

function isClassificationResult(value: unknown): value is ClassificationResult {
  return classificationResultDiagnostic(value) === null;
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");
}

export async function classifyTicket(description: string): Promise<ClassificationResult> {
  const endpoint = `${apiBaseUrl()}/tickets/classify`;
  console.info("Classification request started", {
    endpoint,
    descriptionLength: description.length,
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description }),
    });
  } catch {
    console.warn("Classification request failed", { diagnosticCode: "api_unreachable" });
    throw new Error("Unable to reach the classification service. Please try again.");
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  const responseMeta = {
    requestId,
    statusCode: response.status,
    contentType: response.headers.get("content-type") ?? undefined,
  };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    console.error("Classification response was not JSON", {
      ...responseMeta,
      diagnosticCode: "response_json_invalid",
    });
    throw new Error("The classification service returned an invalid response.");
  }

  if (response.status === 422) {
    if (!isClassificationResult(payload)) {
      console.error("Classification response did not match the contract", {
        ...responseMeta,
        diagnosticCode: classificationResultDiagnostic(payload),
      });
      throw new Error("The classification service returned an invalid response.");
    }

    console.info("Classification response received", {
      ...responseMeta,
      resultStatus: payload.status,
    });
    return payload;
  }

  if (!response.ok) {
    console.warn("Classification request returned an error", responseMeta);
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "";
    throw new Error(message || "Ticket classification failed. Please try again.");
  }

  if (!isClassificationResult(payload)) {
    console.error("Classification response did not match the contract", {
      ...responseMeta,
      diagnosticCode: classificationResultDiagnostic(payload),
    });
    throw new Error("The classification service returned an invalid response.");
  }

  console.info("Classification response received", {
    ...responseMeta,
    resultStatus: payload.status,
  });
  return payload;
}
