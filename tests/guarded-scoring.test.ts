/**
 * Guarded score-event writes.
 * Run with: npx tsx tests/guarded-scoring.test.ts
 */

import {
  dispatchScoreWrite,
  expectedLastEventId,
  interpretGuardedAppend,
  isGuardedScoringEnabled,
  OPTIMISTIC_EVENT_ID_FLOOR,
  presentGuardedAppend,
  SCORE_CONFLICT_MESSAGE,
  type AppendScoreEventInput,
  type AppendScoreEventResult,
} from "../lib/guarded-scoring";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e: unknown) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

function expectEq<T>(actual: T, expected: T, label = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ": " : ""}expected ${e}, got ${a}`);
}

const fakeId = Number.MAX_SAFE_INTEGER - 1;

function writer(guarded: boolean, guardedAppend: (input: AppendScoreEventInput) => Promise<AppendScoreEventResult>) {
  const calls = { direct: 0, guarded: 0, expected: null as number | null };
  return {
    calls,
    run: (confirmedEvents: readonly { id: number }[] = []) =>
      dispatchScoreWrite({
        guarded,
        matchId: "44444444-4444-4444-8444-444444444444",
        eventType: "point",
        payload: { side: "a" },
        confirmedEvents,
        directInsert: async () => {
          calls.direct += 1;
        },
        guardedAppend: async (input) => {
          calls.guarded += 1;
          calls.expected = input.expectedLastEventId;
          return guardedAppend(input);
        },
      }),
  };
}

async function main(): Promise<void> {
  await test("expected id with no events is 0", () => {
    expectEq(expectedLastEventId([]), 0);
  });

  await test("optimistic and fake ids are ignored", () => {
    expectEq(expectedLastEventId([{ id: fakeId }]), 0);
    expectEq(expectedLastEventId([{ id: OPTIMISTIC_EVENT_ID_FLOOR }]), 0);
    expectEq(expectedLastEventId([{ id: 0 }, { id: -4 }, { id: 1.5 }]), 0);
    expectEq(expectedLastEventId([{ id: fakeId }, { id: 6 }]), 6);
  });

  await test("highest confirmed id is selected", () => {
    expectEq(expectedLastEventId([{ id: 2 }, { id: 9 }, { id: fakeId }, { id: 4 }]), 9);
  });

  await test("successful rpc response", () => {
    expectEq(
      interpretGuardedAppend(null, [
        { ok: true, conflict: false, event_id: 12, last_event_id: 12 },
      ]),
      { status: "appended", eventId: 12, lastEventId: 12 },
    );
  });

  await test("conflict response keeps the actual last event id", () => {
    expectEq(
      interpretGuardedAppend(null, [
        { ok: false, conflict: true, event_id: null, last_event_id: 12 },
      ]),
      { status: "conflict", lastEventId: 12 },
    );
    expectEq(
      SCORE_CONFLICT_MESSAGE,
      "Score changed on another device. Review the latest score and try again.",
    );
  });

  await test("rpc error never triggers a direct-write fallback", async () => {
    const missing = writer(true, async () => ({
      status: "error",
      message: "Could not find the function append_score_event_guarded",
    }));
    const missingResult = await missing.run([{ id: 3 }]);
    expectEq(missing.calls.direct, 0);
    expectEq(missing.calls.guarded, 1);
    expectEq(missingResult, {
      path: "guarded",
      result: { status: "error", message: "Could not find the function append_score_event_guarded" },
    });

    const thrown = writer(true, async () => {
      throw new Error("rpc unavailable");
    });
    let threw = false;
    try {
      await thrown.run([{ id: 3 }]);
    } catch (e: unknown) {
      threw = e instanceof Error && e.message === "rpc unavailable";
    }
    if (!threw) throw new Error("expected the rpc error to propagate");
    expectEq(thrown.calls.direct, 0);
    expectEq(thrown.calls.guarded, 1);

    const conflict = writer(true, async () => ({ status: "conflict", lastEventId: 8 }));
    const conflictResult = await conflict.run([{ id: 8 }, { id: fakeId }]);
    expectEq(conflict.calls.direct, 0);
    expectEq(conflict.calls.guarded, 1);
    expectEq(conflict.calls.expected, 8);
    expectEq(conflictResult, { path: "guarded", result: { status: "conflict", lastEventId: 8 } });
  });

  await test("feature flag disabled uses the legacy path", async () => {
    const previous = process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED;
    delete process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED;
    try {
      if (isGuardedScoringEnabled()) throw new Error("unset flag must be false");
      process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED = "false";
      if (isGuardedScoringEnabled()) throw new Error("false flag must stay off");
      const legacy = writer(isGuardedScoringEnabled(), async () => ({
        status: "appended",
        eventId: 1,
        lastEventId: 1,
      }));
      const result = await legacy.run([{ id: 4 }]);
      expectEq(result, { path: "legacy" });
      expectEq(legacy.calls.direct, 1);
      expectEq(legacy.calls.guarded, 0);
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED;
      else process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED = previous;
    }
  });

  await test("conflict refetches for a new projection and does not retry", () => {
    const conflict = presentGuardedAppend({ status: "conflict", lastEventId: 12 });
    expectEq(conflict, {
      rollbackToConfirmed: true,
      refetch: true,
      alertTitle: SCORE_CONFLICT_MESSAGE,
      alertBody: null,
    });
    const error = presentGuardedAppend({
      status: "error",
      message: "match_not_live",
    });
    expectEq(error.refetch, false);
    expectEq(error.rollbackToConfirmed, true);
    expectEq(error.alertTitle, "Not recorded");
    expectEq(error.alertBody, "match_not_live");
    const appended = presentGuardedAppend({ status: "appended", eventId: 9, lastEventId: 9 });
    expectEq(appended.alertTitle, null);
    expectEq(appended.refetch, true);
    expectEq(appended.rollbackToConfirmed, false);
  });

  await test("feature flag enabled uses the guarded path", async () => {
    const previous = process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED;
    process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED = "true";
    try {
      if (!isGuardedScoringEnabled()) throw new Error("true flag must enable guarded scoring");
      const guarded = writer(isGuardedScoringEnabled(), async () => ({
        status: "appended",
        eventId: 5,
        lastEventId: 5,
      }));
      const result = await guarded.run([{ id: 2 }, { id: fakeId }, { id: 4 }]);
      expectEq(guarded.calls.direct, 0);
      expectEq(guarded.calls.guarded, 1);
      expectEq(guarded.calls.expected, 4);
      expectEq(result, { path: "guarded", result: { status: "appended", eventId: 5, lastEventId: 5 } });
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED;
      else process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED = previous;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
