import "dotenv/config";

import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";

import healthRouter from "./api/routes/health.js";
import { createTicketsRouter, type TicketClassifier } from "./api/routes/tickets.js";
import { logger, withRequestContext } from "./utils/logger.js";

export function createApp(options: { classifyTicket?: TicketClassifier } = {}) {
  const app = express();

  app.use((req, res, next) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const path = req.originalUrl.split("?")[0];
    res.setHeader("x-request-id", requestId);

    withRequestContext(requestId, () => {
      logger.info("HTTP request received", { method: req.method, path });
      res.once("finish", () => {
        logger.info("HTTP request completed", {
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        });
      });
      next();
    });
  });

  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", healthRouter);
  app.use("/api/v1", createTicketsRouter(options.classifyTicket));

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Request failed", { errorName: error.name });

    const statusCode = error instanceof SyntaxError && "body" in error ? 400 : 500;
    res.status(statusCode).json({ error: "Invalid or unsafe request payload." });
  });

  return app;
}

export const app = createApp();
export default createApp;

if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production") {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    logger.info(`Support Ticket API running on port ${port}`);
  });
}
