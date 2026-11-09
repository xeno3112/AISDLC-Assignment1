const path = require("node:path");

const { checkHarnessEvidence } = require("./harness-log-check.js");
const { runEvaluation } = require("./runner.js");

const ROOT = path.resolve(__dirname, "..");

async function main() {
  let result;
  try {
    ({ result } = await runEvaluation());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown evaluation failure.";
    console.error(`Evaluation failed: ${message}`);
    process.exitCode = 1;
    return;
  }

  const check = checkHarnessEvidence({
    resultPath: path.join(ROOT, "evidence", "eval-results.json"),
    logPath: path.join(ROOT, "evidence", "harness-log.md"),
    datasetPath: path.join(ROOT, "evals", "dataset.json"),
  });
  if (!check.valid) {
    for (const error of check.errors) {
      console.error(`Harness evidence check failed: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Harness evidence completeness and redaction checks passed.");
  if (result.automatedStatus !== "PASS") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
