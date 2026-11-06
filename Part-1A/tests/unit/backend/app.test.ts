import { Router } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { apiBasePath, createApp } from "../../../src/backend/src/app.js";

describe("createApp", () => {
  it("mounts the versioned router and returns a request ID for missing paths", async () => {
    const response = await request(createApp()).get(`${apiBasePath}/unknown`);

    expect(response.status).toBe(404);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.body.error).toMatchObject({
      code: "NOT_FOUND",
      requestId: response.headers["x-request-id"],
    });
  });

  it("sanitizes unexpected errors", async () => {
    const apiRouter = Router();
    apiRouter.get("/failure", (_request, _response, next) => {
      next(new Error("database credentials leaked"));
    });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(createApp(apiRouter)).get(
        `${apiBasePath}/failure`,
      );

      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain("credentials");
      expect(logError).toHaveBeenCalledWith(
        "Unhandled request error.",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      logError.mockRestore();
    }
  });

  it("rejects malformed JSON with a stable client error", async () => {
    const response = await request(createApp())
      .post(`${apiBasePath}/anything`)
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("allows only configured origins for cross-origin requests", async () => {
    const response = await request(
      createApp(Router(), ["https://desk.example.com"]),
    )
      .options(`${apiBasePath}/tickets`)
      .set("Origin", "https://desk.example.com");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://desk.example.com",
    );
    expect(response.headers.vary).toContain("Origin");
  });
});
