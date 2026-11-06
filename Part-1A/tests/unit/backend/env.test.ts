import { describe, expect, it } from "vitest";
import {
  ConfigurationError,
  loadConfig,
} from "../../../src/backend/src/config/env.js";

describe("loadConfig", () => {
  it("uses the application MongoDB URI and defaults to same-origin access", () => {
    expect(loadConfig({ MONGODB_URI: "mongodb://127.0.0.1:27017/ticket_desk" }))
      .toEqual({
        environment: "development",
        port: 3000,
        mongoUri: "mongodb://127.0.0.1:27017/ticket_desk",
        allowedOrigins: [],
      });
  });

  it("requires a test-specific URI and database name in test mode", () => {
    expect(() => loadConfig({ NODE_ENV: "test" })).toThrow(ConfigurationError);
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        MONGODB_TEST_URI: "mongodb://127.0.0.1:27017/ticket_desk",
      }),
    ).toThrow(/test-scoped/);
  });

  it("accepts a test-scoped URI and explicitly configured origins", () => {
    expect(
      loadConfig({
        NODE_ENV: "test",
        MONGODB_TEST_URI: "mongodb://127.0.0.1:27017/ticket_desk_test",
        PORT: "4100",
        CORS_ORIGINS: "https://desk.example.com,http://localhost:5173",
      }),
    ).toEqual({
      environment: "test",
      port: 4100,
      mongoUri: "mongodb://127.0.0.1:27017/ticket_desk_test",
      allowedOrigins: ["https://desk.example.com", "http://localhost:5173"],
    });
  });

  it("rejects wildcard or path-based CORS origins and invalid ports", () => {
    expect(() =>
      loadConfig({
        MONGODB_URI: "mongodb://127.0.0.1:27017/ticket_desk",
        CORS_ORIGINS: "*",
      }),
    ).toThrow(/CORS_ORIGINS/);
    expect(() =>
      loadConfig({
        MONGODB_URI: "mongodb://127.0.0.1:27017/ticket_desk",
        PORT: "70000",
      }),
    ).toThrow(/PORT/);
  });
});
