import mongoose from "mongoose";
import type { BackendConfig } from "./env.js";
import { isTestDatabaseUri } from "./env.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(config: BackendConfig): Promise<void> {
  if (config.environment === "test" && !isTestDatabaseUri(config.mongoUri)) {
    throw new Error(
      "Test mode requires a MongoDB URI whose database name is explicitly test-scoped.",
    );
  }

  const expectedDatabaseName = new URL(config.mongoUri).pathname.slice(1);
  if (mongoose.connection.readyState === 1) {
    if (mongoose.connection.name !== expectedDatabaseName) {
      throw new Error("MongoDB is already connected to a different database.");
    }
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    if (mongoose.connection.name !== expectedDatabaseName) {
      throw new Error("MongoDB is already connecting to a different database.");
    }
    return;
  }

  const pendingConnection = mongoose.connect(config.mongoUri);
  connectionPromise = pendingConnection;
  try {
    await pendingConnection;
  } finally {
    if (connectionPromise === pendingConnection) {
      connectionPromise = null;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (connectionPromise) {
    await connectionPromise;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
