import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(".");
const scanRoots = [
  "src",
  "tests",
  ".harness",
  "evidence/harness-results",
  "eslint.config.js",
  "package.json",
  "package-lock.json",
];
const sourceExtensions = new Set([
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sh",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const patterns = [
  {
    name: "private-key material",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { name: "AWS access key", expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  {
    name: "GitHub token",
    expression: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  },
  {
    name: "credential-bearing MongoDB URI",
    expression: /mongodb(?:\+srv)?:\/\/[^/\s:@]+:[^/\s@]+@/i,
  },
];
const findings = [];

for (const entry of scanRoots) {
  const absolutePath = resolve(root, entry);
  for (const file of collectFiles(absolutePath)) {
    // Files are discovered only beneath the fixed scan roots above.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const contents = readFileSync(file, "utf8");
    const lines = contents.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        if (pattern.expression.test(line)) {
          findings.push({
            file: relative(root, file),
            line: index + 1,
            pattern: pattern.name,
          });
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Potential sensitive material detected:");
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}: ${finding.pattern}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    "Secret-pattern scan passed for source, tests, harness, and recorded harness output.",
  );
}

function collectFiles(path) {
  // Recursive paths originate in the fixed scan roots and directory entries.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileInfo = statSync(path);
  if (fileInfo.isFile()) {
    return sourceExtensions.has(extname(path)) ? [path] : [];
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const entries = readdirSync(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage", ".git"].includes(entry.name)) {
        continue;
      }
      files.push(...collectFiles(resolve(path, entry.name)));
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(resolve(path, entry.name));
    }
  }
  return files;
}

function extname(path) {
  const separator = path.lastIndexOf(".");
  return separator === -1 ? "" : path.slice(separator);
}
