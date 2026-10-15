import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { type ScoringEvent } from "@/lib/scoring";
import {
  dispatchScoreWrite,
  isGuardedScoringEnabled,
  presentGuardedAppend,
} from "@/lib/guarded-scoring";
import {
  appendScoreEventGuarded,
  confirmResult,
  fetchEvents,
  fetchMatch,
  insertEvent,
  isStaff,
  startMatch,
  updateSnapshot,
  type MatchDetail,
} from "@/lib/queries";
import { projectMatchState } from "@/lib/scoring/project-match";
import { EmptyState, Screen } from "@/components/ui";
import { MatchScoringView } from "@/components/scoring/MatchScoringView";

type Gate = "loading" | "denied" | "ok";
const SCORE_REFRESH_MS = 2500;

export default function MatchControl() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate, setGate] = useState<Gate>("loading");
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const optimisticId = useRef(-1);
  const busyRef = useRef(false);
  const appActive = useRef(true);

  const load = useCallback(async () => {
    const m = await fetchMatch(id);
    if (!m || !m.tournament) {
      setGate("denied");
      return;
    }
    const staff = await isStaff(m.tournament_id);
    if (!staff) {
      setGate("denied");
      return;
    }
    setMatch(m);
    setEvents(await fetchEvents(id));
    setGate("ok");
  }, [id]);

  useEffect(() => {
    load().catch(() => setGate("denied"));
  }, [load]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Keep a second scorer or the web fallback visible on this device. The
  // append-only event log remains authoritative; polling needs no Realtime DDL.
  useEffect(() => {
    const refreshEvents = async () => {
      if (!id || !appActive.current || busyRef.current || gate !== "ok") return;
      try {
        setEvents(await fetchEvents(id));
      } catch {
        // Keep the last confirmed state during a transient connection loss.
      }
    };
    const timer = setInterval(refreshEvents, SCORE_REFRESH_MS);
    const sub = AppState.addEventListener("change", (status) => {
      appActive.current = status === "active";
      if (status === "active") refreshEvents();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [gate, id]);

  // 1s tick for the futsal period timer.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const state = useMemo(() => {
    if (!match?.tournament) return null;
    return projectMatchState(match, events);
  }, [match, events]);

  async function tap(eventType: string, payload: Record<string, unknown>) {
    if (busyRef.current || busy || !match) return;
    busyRef.current = true;
    setBusy(true);
    const prev = events;
    // Optimistic: fake id below any real id ordering (appended last, engine sorts by id —
    // use a large id so it lands at the end of the replay order).
    const fake: ScoringEvent = {
      id: Number.MAX_SAFE_INTEGER + optimisticId.current--,
      event_type: eventType,
      payload,
      created_at: new Date().toISOString(),
    };
    setEvents([...prev, fake]);
    try {
      const outcome = await dispatchScoreWrite({
        guarded: isGuardedScoringEnabled(),
        matchId: match.id,
        eventType,
        payload,
        confirmedEvents: prev,
        directInsert: insertEvent,
        guardedAppend: appendScoreEventGuarded,
      });
      if (outcome.path === "guarded") {
        await finishGuardedAppend(match, prev, outcome.result);
        return;
      }
      const fresh = await fetchEvents(match.id);
      setEvents(fresh);
      const s = projectMatchState(match, fresh);
      if (!s) throw new Error("Tournament scoring configuration is unavailable.");
      await updateSnapshot(match.id, {
        summary: s.scoreSummary,
        display: s.display,
      });
    } catch (e) {
      setEvents(prev); // rollback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Not recorded", e instanceof Error ? e.message : "Try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function finishGuardedAppend(
    current: MatchDetail,
    confirmed: ScoringEvent[],
    result: Awaited<ReturnType<typeof appendScoreEventGuarded>>,
  ) {
    const presentation = presentGuardedAppend(result);
    if (presentation.rollbackToConfirmed) setEvents(confirmed);
    if (presentation.refetch) {
      try {
        const fresh = await fetchEvents(current.id);
        setEvents(fresh);
        if (result.status === "appended") {
          const s = projectMatchState(current, fresh);
          if (s) {
            try {
              await updateSnapshot(current.id, {
                summary: s.scoreSummary,
                display: s.display,
              });
            } catch {
              // The append is already confirmed. The snapshot is only a cache.
            }
          }
        }
      } catch {
        if (result.status === "appended") setEvents(confirmed);
      }
    }
    if (presentation.alertTitle) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(presentation.alertTitle, presentation.alertBody ?? undefined);
    }
  }

  async function onStart() {
    if (!match) return;
    setBusy(true);
    try {
      await startMatch(match.id);
      setMatch({ ...match, status: "live" });
    } catch (e) {
      Alert.alert("Could not start", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onConfirmResult() {
    if (!match || !state || !state.winnerSide) return;
    const winner = state.winnerSide === "a" ? match.a : match.b;
    if (!winner) return;
    Alert.alert(
      "Confirm result",
      `${winner.display_name} wins ${state.display}. This finalizes the match and advances the winner.`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await confirmResult(match.id, winner.id, {
                summary: state.scoreSummary,
                display: state.display,
              });
              setMatch({ ...match, status: "completed", winner_id: winner.id });
            } catch (e) {
              Alert.alert("Failed", e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  if (gate === "loading") {
    return (
      <Screen>
        <EmptyState title="Loading match…" />
      </Screen>
    );
  }
  if (gate === "denied" || !match) {
    return (
      <Screen>
        <EmptyState
          title="Not assigned"
          body="You're not on this tournament's staff. Ask the organizer to add you."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]} style={{ paddingBottom: 24 }}>
      <MatchScoringView match={match} events={events} busy={busy} now={now} onEvent={tap} onStart={onStart} onConfirm={onConfirmResult} />
    </Screen>
  );
}
