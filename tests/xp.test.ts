import { formatXp, xpProgress } from "../lib/xp";
import { optimisticPickTally } from "../lib/pick-math";
let passed = 0; let failed = 0;
function test(name: string, fn: () => void): void { try { fn(); console.log(`  ✓  ${name}`); passed += 1; } catch (error) { console.error(`  ✗  ${name}`); console.error(error); failed += 1; } }
function expect<T>(actual: T, expected: T): void { if (actual !== expected) throw new Error(`expected ${String(expected)}, got ${String(actual)}`); }
test("level progress is deterministic", () => { const value = xpProgress(450); expect(value.level, 3); expect(value.title, "Club regular"); expect(value.remaining, 150); if (value.progress <= 0 || value.progress >= 1) throw new Error("expected partial progress"); });
test("negative and missing XP fail closed", () => { expect(xpProgress(-20).total, 0); expect(xpProgress(null).level, 1); });
test("XP formatting uses Indian grouping", () => expect(formatXp(12450), "12,450"));
test("pick tally changes immediately for a new pick and side change", () => {
  const first = optimisticPickTally({ match_id: "m", a_count: 2, b_count: 1, total: 3 }, null, "a");
  expect(first.a_count, 3); expect(first.b_count, 1); expect(first.total, 4);
  const switched = optimisticPickTally(first, "a", "b");
  expect(switched.a_count, 2); expect(switched.b_count, 2); expect(switched.total, 4);
});
console.log(`\n${passed} passed, ${failed} failed`); if (failed > 0) process.exit(1);

