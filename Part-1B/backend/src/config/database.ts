import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB");
    return true;
  } catch (error) {
    logger.error("MongoDB connection failed", error);
    return false;
  }
}

export { mongoose };
