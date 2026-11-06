import { once } from "node:events";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { createApiRouter } from "./api.routes.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import {
  ConfigurationError,
  loadConfig,
} from "./config/env.js";

export async function startServer(): Promise<Server> {
  const config = loadConfig();
  await connectDatabase(config);

  const server = createApp(createApiRouter(), config.allowedOrigins).listen(
    config.port,
  );
  try {
    await once(server, "listening");
  } catch (error) {
    await disconnectDatabase();
    throw error;
  }

  const shutdown = (signal: string): void => {
    server.close((error) => {
      if (error) {
        console.error("HTTP server shutdown failed.", { signal });
        process.exitCode = 1;
        return;
      }

      void disconnectDatabase()
        .then(() => console.info("Backend shutdown complete.", { signal }))
        .catch(() => {
          console.error("MongoDB shutdown failed.", { signal });
          process.exitCode = 1;
        });
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}

function reportStartupFailure(error: unknown): void {
  if (error instanceof ConfigurationError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error("Backend startup failed. Check the MongoDB service and configuration.", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  void startServer().catch(reportStartupFailure);
}
