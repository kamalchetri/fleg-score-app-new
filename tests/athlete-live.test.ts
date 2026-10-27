import { getAthleteAnalytics, getAthleteByRegId } from "../lib/athlete-live";
import { getMedalists } from "../lib/nspg-live";

const cases: Array<[string, () => Promise<void>]> = [
  ["every featured medalist opens a public athlete record", async () => {
    const medalists = await getMedalists();
    for (const medalist of medalists) {
      const profile = await getAthleteByRegId(medalist.regId);
      if (!profile) throw new Error(`${medalist.regId} has no profile`);
      if (!profile.medals.some((medal) => medal.event === medalist.event && medal.medal === medalist.medal)) {
        throw new Error(`${medalist.regId} profile does not contain its published medal`);
      }
    }
  }],
  ["athlete analytics are sport-specific and non-empty", async () => {
    const rows = await getAthleteAnalytics("BOX-2041");
    if (rows.length !== 1 || rows[0].sport !== "boxing") throw new Error("boxing analytics missing");
    const labels = rows[0].stats.map((stat) => stat.label);
    if (!labels.includes("Bouts") || !labels.includes("Win method")) throw new Error("combat stat labels missing");
  }],
  ["unknown athlete stays private and fail-closed", async () => {
    if (await getAthleteByRegId("NOT-A-REAL-ID")) throw new Error("unknown athlete was exposed");
    if ((await getAthleteAnalytics("NOT-A-REAL-ID")).length !== 0) throw new Error("unknown analytics were exposed");
  }],
];

async function main(): Promise<void> {
  // Synthetic athlete fixtures are permitted only in explicitly tagged review builds.
  process.env.EXPO_PUBLIC_REVIEW_BUILD = "1";
  let failed = 0;
  for (const [name, run] of cases) {
    try {
      await run();
      console.log(`  ✓  ${name}`);
    } catch (error) {
      failed++;
      console.error(`  ✗  ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\n${cases.length} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

void main();
