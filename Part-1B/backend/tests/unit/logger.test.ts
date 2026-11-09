import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { logger, LOG_FILE_PATH } from "../../src/utils/logger.js";

describe("application logger", () => {
  it("appends an ISO-8601 timestamp to each log entry", () => {
    const previousLogSize = existsSync(LOG_FILE_PATH) ? readFileSync(LOG_FILE_PATH).length : 0;

    logger.info("Timestamp test entry");

    const appendedLog = readFileSync(LOG_FILE_PATH, "utf8").slice(previousLogSize).trim();
    const entry = JSON.parse(appendedLog) as Record<string, unknown>;

    expect(entry).toMatchObject({
      level: "info",
      message: "Timestamp test entry",
    });
    expect(entry.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(entry.timestamp as string))).toBe(false);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
