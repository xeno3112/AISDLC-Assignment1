import type { ZodType } from "zod";
import { HttpError } from "../middleware/error-handler.js";

export function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields = new Map<string, string>();
    for (const issue of parsed.error.issues) {
      if (issue.code === "unrecognized_keys") {
        for (const key of issue.keys) {
          if (!fields.has(key)) {
            fields.set(key, "Unrecognized field.");
          }
        }
        continue;
      }

      const field = issue.path.map(String).join(".") || "_request";
      if (!fields.has(field)) {
        fields.set(field, issue.message);
      }
    }

    throw new HttpError(
      "The request contains invalid data.",
      400,
      "VALIDATION_ERROR",
      Object.fromEntries(fields),
    );
  }

  return parsed.data;
}

export function notFound(resource: string): HttpError {
  return new HttpError(`${resource} was not found.`, 404, "NOT_FOUND");
}

export function conflict(message: string): HttpError {
  return new HttpError(message, 409, "CONFLICT");
}
