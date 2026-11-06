import express, { Router, type Express } from "express";
import { createApiRouter } from "./api.routes.js";
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from "./middleware/error-handler.js";

export const apiBasePath = "/api/v1";

export function createApp(
  apiRouter: Router = createApiRouter(),
  allowedOrigins: readonly string[] = [],
): Express {
  const app = express();
  app.use(requestIdMiddleware);
  if (allowedOrigins.length > 0) {
    app.use((request, response, next) => {
      const origin = request.get("Origin");
      if (origin && allowedOrigins.includes(origin)) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Request-Id");
        response.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
        response.vary("Origin");
      }

      if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
      }
      next();
    });
  }
  app.use(express.json({ limit: "16kb" }));
  app.use(apiBasePath, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
