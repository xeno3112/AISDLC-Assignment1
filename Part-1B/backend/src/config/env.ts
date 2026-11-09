import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGODB_URI: z.string().default("mongodb://localhost:27017/support-ticket-classifier"),
    MODEL_PROVIDER: z.enum(["gemini"]).default("gemini"),
    MODEL_NAME: z.string().trim().min(1).default("gemini-3.8-flash"),
    EVAL_JUDGE_MODEL: z.string().trim().min(1).optional(),
    GEMINI_API_KEY: z.string().default(""),
    GEMINI_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
    MODEL_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(120_000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .passthrough();

export const env = envSchema.parse(process.env);
