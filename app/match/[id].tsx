import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { computeMatchState, type ScoringEvent } from "@/lib/scoring";
import type { FutsalDetail, PickleballDetail } from "@/lib/scoring";
import {
  confirmResult,
  fetchEvents,
  fetchMatch,
  insertEvent,
  isStaff,
  startMatch,
  updateSnapshot,
  type MatchDetail,
} from "@/lib/queries";
import { elapsedSince } from "@/lib/format";
import { Colors, Spacing } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Screen, ScorePad } from "@/components/ui";

type Gate = "loading" | "denied" | "ok";

export default function MatchControl() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate, setGate] = useState<Gate>("loading");
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const optimisticId = useRef(-1);

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

  // 1s tick for the futsal period timer.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const state = useMemo(
    () =>
      match?.tournament
        ? computeMatchState(match.tournament.sport, match.tournament.sport_config, events)
        : null,
    [match, events],
  );

  async function tap(eventType: string, payload: Record<string, unknown>) {
    if (busy || !match) return;
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
      await insertEvent(match.id, eventType, payload);
      const fresh = await fetchEvents(match.id);
      setEvents(fresh);
      const s = computeMatchState(match.tournament!.sport, match.tournament!.sport_config, fresh);
      await updateSnapshot(match.id, {
        summary: s.scoreSummary,
        display: s.display,
      });
    } catch (e) {
      setEvents(prev); // rollback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Not recorded", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
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
  if (gate === "denied" || !match || !state) {
    return (
      <Screen>
        <EmptyState
          title="Not assigned"
          body="You're not on this tournament's staff. Ask the organizer to add you."
        />
      </Screen>
    );
  }

  const aName = match.a?.display_name ?? "TBD";
  const bName = match.b?.display_name ?? "TBD";
  const sport = match.tournament!.sport;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.meta}>
              {match.tournament!.name} · {match.category?.name}
            </Text>
            <Badge status={match.status} />
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.team} numberOfLines={2}>
              {aName}
            </Text>
            <Text style={styles.score}>
              {state.scoreSummary.a} – {state.scoreSummary.b}
            </Text>
            <Text style={[styles.team, { textAlign: "right" }]} numberOfLines={2}>
              {bName}
            </Text>
          </View>
          <Text style={styles.display}>{state.display}</Text>
          {sport === "futsal" ? <FutsalSubline detail={state.detail as FutsalDetail} now={now} /> : null}
          {sport === "pickleball" ? (
            <PickleballSubline detail={state.detail as PickleballDetail} />
          ) : null}
        </Card>

        {match.status === "scheduled" ? (
          <Button label="Start match" onPress={onStart} loading={busy} />
        ) : null}

        {match.status === "live" ? (
          <>
            {sport === "futsal" ? (
              <FutsalControls
                detail={state.detail as FutsalDetail}
                busy={busy}
                aName={aName}
                bName={bName}
                tap={tap}
              />
            ) : (
              <View style={styles.padRow}>
                <ScorePad label={`POINT`} sublabel={aName} disabled={busy} onPress={() => tap("point", { side: "a" })} />
                <ScorePad label={`POINT`} sublabel={bName} disabled={busy} onPress={() => tap("point", { side: "b" })} />
              </View>
            )}

            <Button
              label="UNDO last"
              variant="ghost"
              disabled={busy || events.length === 0}
              onPress={() => tap("undo", {})}
            />

            {state.isComplete && state.winnerSide ? (
              <Button label="Confirm result" onPress={onConfirmResult} loading={busy} />
            ) : null}
          </>
        ) : null}

        {match.status === "completed" ? (
          <EmptyState title="Match completed" body={`Final: ${state.display}`} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FutsalSubline({ detail, now }: { detail: FutsalDetail; now: number }) {
  let line: string;
  if (detail.inShootout) line = "Penalty shootout";
  else if (detail.currentPeriod && detail.periodStartedAt)
    line = `Period ${detail.currentPeriod} · ${elapsedSince(detail.periodStartedAt, now)}`;
  else if (detail.periodsCompleted === 0) line = "Not started";
  else line = `${detail.periodsCompleted}/${detail.regulationPeriods} periods played`;
  return <Text style={styles.subline}>{line}</Text>;
}

function PickleballSubline({ detail }: { detail: PickleballDetail }) {
  return (
    <Text style={styles.subline}>
      Game {detail.completedGames.length + 1} · {detail.currentGame.a}–{detail.currentGame.b} · to{" "}
      {detail.pointsTo} (win by {detail.winBy})
    </Text>
  );
}

function FutsalControls({
  detail,
  busy,
  aName,
  bName,
  tap,
}: {
  detail: FutsalDetail;
  busy: boolean;
  aName: string;
  bName: string;
  tap: (t: string, p: Record<string, unknown>) => void;
}) {
  const periodLive = detail.currentPeriod !== null;
  const scoringOpen = periodLive || detail.inShootout;
  return (
    <>
      <View style={styles.padRow}>
        <ScorePad
          label="GOAL"
          sublabel={aName}
          disabled={busy || !scoringOpen}
          onPress={() => tap("goal", { side: "a" })}
        />
        <ScorePad
          label="GOAL"
          sublabel={bName}
          disabled={busy || !scoringOpen}
          onPress={() => tap("goal", { side: "b" })}
        />
      </View>
      <View style={styles.cardRow}>
        {(["a", "b"] as const).map((side) => (
          <View key={side} style={styles.cardCol}>
            <Button
              label={`Yellow · ${side === "a" ? aName : bName}`}
              variant="ghost"
              disabled={busy || !periodLive}
              onPress={() => tap("card", { side, cardType: "yellow", player: null })}
            />
            <Button
              label={`Red · ${side === "a" ? aName : bName}`}
              variant="danger"
              disabled={busy || !periodLive}
              onPress={() => tap("card", { side, cardType: "red", player: null })}
            />
          </View>
        ))}
      </View>
      {periodLive ? (
        <Button label={`End period ${detail.currentPeriod}`} variant="ghost" disabled={busy} onPress={() => tap("period_end", {})} />
      ) : (
        <Button
          label={
            detail.periodsCompleted >= detail.regulationPeriods
              ? "Start shootout period"
              : `Start period ${detail.periodsCompleted + 1}`
          }
          disabled={busy}
          onPress={() => tap("period_start", {})}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  meta: { color: Colors.textDim, fontSize: 13, flex: 1 },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  team: { color: Colors.text, fontSize: 16, fontWeight: "700", flex: 1 },
  score: {
    color: Colors.green,
    fontSize: 44,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginHorizontal: Spacing.md,
  },
  display: { color: Colors.textDim, textAlign: "center", marginTop: Spacing.sm },
  subline: { color: Colors.textDim, textAlign: "center", marginTop: Spacing.xs, fontSize: 13 },
  padRow: { flexDirection: "row", marginVertical: Spacing.md },
  cardRow: { flexDirection: "row", gap: Spacing.md },
  cardCol: { flex: 1 },
});
