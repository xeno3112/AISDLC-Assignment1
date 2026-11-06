import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectDatabase, disconnectDatabase } from "../../../src/backend/src/config/database.js";
import { isTestDatabaseUri } from "../../../src/backend/src/config/env.js";

describe("database lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recognizes explicitly test-scoped database names", () => {
    expect(
      isTestDatabaseUri("mongodb://127.0.0.1:27017/ticket_desk_test"),
    ).toBe(true);
    expect(
      isTestDatabaseUri("mongodb://127.0.0.1:27017/ticket_desk"),
    ).toBe(false);
  });

  it("refuses a non-test database in test mode without connecting", async () => {
    const connect = vi.spyOn(mongoose, "connect");

    await expect(
      connectDatabase({
        environment: "test",
        port: 3000,
        mongoUri: "mongodb://127.0.0.1:27017/ticket_desk",
        allowedOrigins: [],
      }),
    ).rejects.toThrow(/test-scoped/);

    expect(connect).not.toHaveBeenCalled();
  });

  it("connects with the configured test database and supports shutdown", async () => {
    const uri = "mongodb://127.0.0.1:27017/ticket_desk_test";
    const connect = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);

    await connectDatabase({
      environment: "test",
      port: 3000,
      mongoUri: uri,
      allowedOrigins: [],
    });
    await disconnectDatabase();

    expect(connect).toHaveBeenCalledWith(uri);
  });
});
