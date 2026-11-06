import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const startedAt = new Date();
const runId = `harness-${startedAt
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d{3}/, "")}-${randomUUID().slice(0, 8)}`;
const defaultTestUri =
  "mongodb://127.0.0.1:27017/support_ticket_desk_test";
const testUri = process.env.MONGODB_TEST_URI ?? defaultTestUri;
const performanceUri = createPerformanceUri(testUri, runId);

const gates = [
  {
    name: "lint",
    command: ["bash", ".harness/lint/run.sh"],
  },
  {
    name: "security-sast-and-secrets",
    command: ["bash", ".harness/security/run.sh"],
  },
  {
    name: "unit-tests",
    command: ["npm", "test"],
  },
  {
    name: "api-contract-tests",
    command: ["npm", "run", "test:contract"],
  },
  {
    name: "openapi-validation",
    command: [
      "npm",
      "run",
      "openapi:check",
      "--workspace=@support-ticket-desk/frontend",
    ],
  },
  {
    name: "mongodb-integration-tests",
    command: ["npm", "run", "test:integration"],
    env: { MONGODB_TEST_URI: testUri },
  },
  {
    name: "critical-branch-coverage",
    command: ["npm", "test", "--", "--coverage"],
  },
  {
    name: "ticket-list-performance",
    command: [
      "node_modules/.bin/tsx",
      ".harness/test/ticket-list-performance.ts",
    ],
    env: { MONGODB_TEST_URI: performanceUri },
  },
];

const results = [];
for (const gate of gates) {
  const gateStartedAt = new Date();
  const commandText = gate.command.join(" ");
  console.log(`\n=== ${gate.name}: ${commandText} ===`);

  const result = spawnSync(gate.command[0], gate.command.slice(1), {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, ...gate.env },
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = redactSensitiveOutput(result.stdout ?? "");
  const stderr = redactSensitiveOutput(
    result.stderr ?? result.error?.message ?? "",
  );
  const exitCode = result.status ?? 1;
  const record = {
    name: gate.name,
    command: commandText,
    startedAt: gateStartedAt.toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - gateStartedAt.getTime(),
    exitCode,
    status: exitCode === 0 ? "PASS" : "FAIL",
    stdout,
    stderr,
    findings: exitCode === 0 ? [] : ["Command exited unsuccessfully."],
  };
  results.push(record);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log(`=== ${gate.name}: ${record.status} (exit ${exitCode}) ===`);
}

const completedAt = new Date();
const commit = readCommit();
const runResult = {
  schemaVersion: 1,
  recordKind: "mandatory-harness",
  runId,
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  implementationReference: {
    commit,
    workingTree: commit ? "uncommitted working tree" : "no commit available",
  },
  scope: [
    "ESLint",
    "ESLint security-plugin SAST",
    "secret-pattern scan",
    "unit tests",
    "API contract tests",
    "OpenAPI validation",
    "isolated MongoDB integration tests",
    "critical business-logic branch coverage",
    "2,000-ticket list/filter performance",
  ],
  harnessExecuted: true,
  gates: results,
  unrunGates: [],
  findings: results.flatMap((gate) =>
    gate.exitCode === 0
      ? []
      : [{ gate: gate.name, detail: gate.findings[0] }],
  ),
  overallStatus: results.every((gate) => gate.exitCode === 0) ? "PASS" : "FAIL",
  humanAcceptance: "NOT_EVALUATED",
  evidencePaths: [
    `evidence/harness-results/${runId}.json`,
    "evidence/harness-log.md",
  ],
};

const resultsDirectory = resolve(projectRoot, "evidence/harness-results");
// The destination is fixed beneath the project root, not derived from user input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
mkdirSync(resultsDirectory, { recursive: true });
const resultPath = resolve(resultsDirectory, `${runId}.json`);
// eslint-disable-next-line security/detect-non-literal-fs-filename
writeFileSync(resultPath, `${JSON.stringify(runResult, null, 2)}\n`, {
  mode: 0o600,
});

console.log(`\nOVERALL: ${runResult.overallStatus}`);
console.log(`Run ID: ${runId}`);
console.log(`Structured result: ${resultPath}`);
process.exitCode = runResult.overallStatus === "PASS" ? 0 : 1;

function createPerformanceUri(uri, id) {
  const parsed = new URL(uri);
  const baseName = decodeURIComponent(parsed.pathname.slice(1));
  const suffix = id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-8);
  parsed.pathname = `/${`${baseName.slice(0, 40)}_perf_${suffix}_test`}`;
  return parsed.toString();
}

function readCommit() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function redactSensitiveOutput(output) {
  return output
    .replace(
      /(mongodb(?:\+srv)?:\/\/)[^/\s:@]+:[^/\s@]+@/gi,
      "$1[REDACTED]@",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, "[REDACTED]");
}
