declare const require: (name: string) => any;

const { spawnSync } = require("child_process") as {
  spawnSync: (command: string, args: string[], options: Record<string, unknown>) => {
    error?: Error;
    status: number | null;
  };
};
const { resolve } = require("path") as { resolve: (...parts: string[]) => string };

const suites = [
  "archery.test.ts",
  "build-flags.test.ts",
  "combat-bout.test.ts",
  "darts.test.ts",
  "formats-engine.test.ts",
  "governance.test.ts",
  "guarded-scoring.test.ts",
  "lawn-tennis.test.ts",
  "nspg-provision.test.ts",
  "nspg-sports.test.ts",
  "ranked-results.test.ts",
  "rules-presets.test.ts",
  "scoring-engine.test.ts",
  "scoring-lab.test.ts",
  "sepaktakraw.test.ts",
  "table-tennis.test.ts",
  "volleyball.test.ts",
];

const tsxCli = resolve("node_modules", "tsx", "dist", "cli.mjs");

for (const suite of suites) {
  const result = spawnSync(process.execPath, [tsxCli, resolve("tests", suite)], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to start ${suite}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Test suite failed: ${suite}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`All ${suites.length} test suites passed.`);
