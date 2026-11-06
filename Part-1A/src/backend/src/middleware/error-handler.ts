import { randomUUID } from "node:crypto";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  request.requestId = randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  next();
}

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      requestId: request.requestId,
    },
  });
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
): void => {
  if (error instanceof HttpError) {
    const body = {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
      requestId: request.requestId,
    };
    response.status(error.statusCode).json({
      error: body,
    });
    return;
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
        requestId: request.requestId,
      },
    });
    return;
  }

  console.error("Unhandled request error.", {
    requestId: request.requestId,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: request.requestId,
    },
  });
};

function isMalformedJsonError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}
