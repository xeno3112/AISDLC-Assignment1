import request from "supertest";
import { describe, expect, it } from "vitest";

describe("health endpoint", () => {
  it("reports the API as healthy", async () => {
    const appModule = await import("../src/app.js");
    const createApp = typeof appModule.createApp === "function" ? appModule.createApp : appModule.default;
    const app = typeof createApp === "function" ? createApp() : appModule.app;
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
