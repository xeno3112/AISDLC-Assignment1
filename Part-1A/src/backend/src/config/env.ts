import { z } from "zod";

const mongoUriSchema = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (
      !["mongodb:", "mongodb+srv:"].includes(url.protocol) ||
      url.pathname.length < 2
    ) {
      context.addIssue({
        code: "custom",
        message: "must be a MongoDB URI with a database name",
      });
    }
  } catch {
    context.addIssue({
      code: "custom",
      message: "must be a valid MongoDB URI with a database name",
    });
  }
});

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: mongoUriSchema.optional(),
    MONGODB_TEST_URI: mongoUriSchema.optional(),
    CORS_ORIGINS: z.string().default(""),
  })
  .superRefine((environment, context) => {
    const connectionUri =
      environment.NODE_ENV === "test"
        ? environment.MONGODB_TEST_URI
        : environment.MONGODB_URI;

    if (!connectionUri) {
      context.addIssue({
        code: "custom",
        path: [
          environment.NODE_ENV === "test" ? "MONGODB_TEST_URI" : "MONGODB_URI",
        ],
        message: "is required for this environment",
      });
    }

    if (
      environment.MONGODB_TEST_URI &&
      !isTestDatabaseUri(environment.MONGODB_TEST_URI)
    ) {
      context.addIssue({
        code: "custom",
        path: ["MONGODB_TEST_URI"],
        message: "must target a database whose name is explicitly test-scoped",
      });
    }

    for (const origin of environment.CORS_ORIGINS.split(",")
      .map((item) => item.trim())
      .filter(Boolean)) {
      if (!isAllowedOrigin(origin)) {
        context.addIssue({
          code: "custom",
          path: ["CORS_ORIGINS"],
          message: "must contain only explicit HTTP(S) origins without paths",
        });
      }
    }
  });

export interface BackendConfig {
  environment: "development" | "test" | "production";
  port: number;
  mongoUri: string;
  allowedOrigins: string[];
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function loadConfig(
  source: NodeJS.ProcessEnv = process.env,
): BackendConfig {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new ConfigurationError(`Invalid backend configuration (${details}).`);
  }

  const environment = parsed.data;
  const mongoUri =
    environment.NODE_ENV === "test"
      ? environment.MONGODB_TEST_URI
      : environment.MONGODB_URI;

  if (!mongoUri) {
    throw new ConfigurationError("MongoDB URI is required for this environment.");
  }

  return {
    environment: environment.NODE_ENV,
    port: environment.PORT,
    mongoUri,
    allowedOrigins: environment.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export function isTestDatabaseUri(uri: string): boolean {
  try {
    const databaseName = decodeURIComponent(new URL(uri).pathname.slice(1));
    return /(?:^|[_-])test(?:$|[_-])/i.test(databaseName);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.origin === origin &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
