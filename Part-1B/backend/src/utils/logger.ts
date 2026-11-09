import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sensitivePatterns = [
  /("|')?(api[_-]?key|token|secret|password|authorization|cookie)("|')?\s*[:=]\s*("|')?[^"',\n\r]+/gi,
  /(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi,
];

const requestContext = new AsyncLocalStorage<string>();

function findBackendRoot(startDirectory: string): string {
  let directory = startDirectory;

  while (basename(directory) !== "backend") {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error("Unable to locate the backend directory for application logging.");
    }
    directory = parent;
  }

  return directory;
}

export const LOG_FILE_PATH = resolve(
  findBackendRoot(dirname(fileURLToPath(import.meta.url))),
  "logs",
  "application.log",
);

mkdirSync(dirname(LOG_FILE_PATH), { recursive: true, mode: 0o700 });

const redactSensitiveData = (input: unknown): string => {
  const raw = typeof input === "string" ? input : JSON.stringify(input);
  let redacted = raw;

  for (const pattern of sensitivePatterns) {
    redacted = redacted.replace(pattern, (match) => {
      if (match.toLowerCase().includes("bearer")) {
        return match.replace(/\s+[A-Za-z0-9._~+/-]+=*$/i, " [REDACTED]");
      }

      return match.replace(/(:\s*|=\s*)([^,\n\r\s"']+)/gi, "$1[REDACTED]");
    });
  }

  return redacted;
};

const normalizeMeta = (meta: unknown): Record<string, unknown> => {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }

  return { value: meta };
};

export function withRequestContext(requestId: string, callback: () => void): void {
  requestContext.run(requestId, callback);
}

function log(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeMeta(meta),
    ...(requestContext.getStore() ? { requestId: requestContext.getStore() } : {}),
  };
  appendFileSync(LOG_FILE_PATH, `${redactSensitiveData(entry)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
