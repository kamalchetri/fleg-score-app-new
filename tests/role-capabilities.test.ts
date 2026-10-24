import { canScanAccreditation, canViewAccessLog, normalizeRole } from "../lib/role-utils";

const cases: Array<[string, () => void]> = [
  ["organizer spelling is accepted", () => {
    if (normalizeRole("organizer") !== "organizer") throw new Error("organizer role was not preserved");
  }],
  ["scanner volunteers can scan but cannot view the access log", () => {
    if (!canScanAccreditation("volunteer")) throw new Error("volunteer scanner access missing");
    if (canViewAccessLog("volunteer")) throw new Error("volunteer access-log access is too broad");
  }],
  ["NSPG staff can scan and review access logs", () => {
    if (!canScanAccreditation("nspg_staff")) throw new Error("staff scanner access missing");
    if (!canViewAccessLog("nspg_staff")) throw new Error("staff access-log access missing");
  }],
  ["unknown roles fail closed", () => {
    if (normalizeRole("superuser") !== "user") throw new Error("unknown role did not fail closed");
  }],
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`  ✓  ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗  ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`\n${cases.length} passed, ${failed} failed`);
if (failed) process.exit(1);
