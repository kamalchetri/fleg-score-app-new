import { isReviewBuild } from "@/lib/build-flags";

type Test = { name: string; run: () => void };
const tests: Test[] = [
  {
    name: "review build accepts true and 1 only",
    run: () => {
      const previous = process.env.EXPO_PUBLIC_REVIEW_BUILD;
      try {
        process.env.EXPO_PUBLIC_REVIEW_BUILD = "true";
        if (!isReviewBuild()) throw new Error("true should enable review build");
        process.env.EXPO_PUBLIC_REVIEW_BUILD = "1";
        if (!isReviewBuild()) throw new Error("1 should enable review build");
        process.env.EXPO_PUBLIC_REVIEW_BUILD = "false";
        if (isReviewBuild()) throw new Error("false should disable review build");
        process.env.EXPO_PUBLIC_REVIEW_BUILD = "yes";
        if (isReviewBuild()) throw new Error("unexpected values should disable review build");
      } finally {
        if (previous === undefined) delete process.env.EXPO_PUBLIC_REVIEW_BUILD;
        else process.env.EXPO_PUBLIC_REVIEW_BUILD = previous;
      }
    },
  },
];

let failed = 0;
for (const test of tests) {
  try {
    test.run();
    console.log(`  ✓  ${test.name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗  ${test.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`\n${tests.length} passed, ${failed} failed`);
if (failed) process.exit(1);
