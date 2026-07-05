import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { computeMatchState, type ScoringEvent } from "@/lib/scoring";
import type { FutsalDetail, PickleballDetail } from "@/lib/scoring";
import { fetchEvents, fetchMatch, type MatchDetail } from "@/lib/queries";
import { Colors, Spacing } from "@/lib/theme";
import { Badge, EmptyState, Screen } from "@/components/ui";

const POLL_MS = 3000;

export default function LiveScoreboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [missing, setMissing] = useState(false);
  const appActive = useRef(true);

  const load = useCallback(async () => {
    try {
      const m = await fetchMatch(id);
      if (!m) {
        setMissing(true);
        return;
      }
      setMatch(m);
      setEvents(await fetchEvents(id));
    } catch {
      // transient network errors: keep last known state
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (appActive.current) load();
    }, POLL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      appActive.current = s === "active";
      if (s === "active") load(); // instant refresh on return
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [load]);

  const state = useMemo(
    () =>
      match?.tournament
        ? computeMatchState(match.tournament.sport, match.tournament.sport_config, events)
        : null,
    [match, events],
  );

  if (missing) {
    return (
      <Screen>
        <EmptyState title="Match not found" body="It may not be public yet." />
      </Screen>
    );
  }
  if (!match || !state) {
    return (
      <Screen>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }

  const detail = state.detail;
  const ticker = [...events]
    .filter((e) => e.event_type === "goal" || e.event_type === "point" || e.event_type === "card")
    .slice(-5)
    .reverse();

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.meta}>
          {match.tournament?.name} · {match.category?.name}
        </Text>
        <Badge status={match.status} />

        <View style={styles.scoreBlock}>
          <Text style={styles.team} numberOfLines={2}>
            {match.a?.display_name ?? "TBD"}
          </Text>
          <Text style={styles.bigScore}>
            {state.scoreSummary.a}
            <Text style={{ color: Colors.textFaint }}> – </Text>
            {state.scoreSummary.b}
          </Text>
          <Text style={styles.team} numberOfLines={2}>
            {match.b?.display_name ?? "TBD"}
          </Text>
        </View>

        <Text style={styles.display}>{state.display}</Text>
        {detail.sport === "futsal" ? (
          <Text style={styles.subline}>
            {(detail as FutsalDetail).inShootout
              ? "Penalty shootout"
              : (detail as FutsalDetail).currentPeriod
                ? `Period ${(detail as FutsalDetail).currentPeriod}`
                : match.status === "completed"
                  ? "Full time"
                  : ""}
          </Text>
        ) : (
          <Text style={styles.subline}>
            {match.status === "completed"
              ? "Final"
              : `Game ${(detail as PickleballDetail).completedGames.length + 1}: ${(detail as PickleballDetail).currentGame.a}–${(detail as PickleballDetail).currentGame.b}`}
          </Text>
        )}

        <View style={styles.ticker}>
          {ticker.map((e) => (
            <Text key={e.id} style={styles.tickerLine}>
              {e.event_type === "card"
                ? `${String(e.payload["cardType"] ?? "card").toUpperCase()} card — `
                : `${e.event_type.toUpperCase()} — `}
              {e.payload["side"] === "a" ? match.a?.display_name : match.b?.display_name}
            </Text>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", padding: Spacing.xl, gap: Spacing.md },
  meta: { color: Colors.textDim, fontSize: 14, textAlign: "center" },
  scoreBlock: { alignItems: "center", marginTop: Spacing.xl },
  team: { color: Colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  bigScore: {
    color: Colors.green,
    fontSize: 96,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginVertical: Spacing.sm,
  },
  display: { color: Colors.textDim, fontSize: 16 },
  subline: { color: Colors.textDim, fontSize: 14 },
  ticker: { marginTop: Spacing.xl, gap: Spacing.xs },
  tickerLine: { color: Colors.textFaint, fontSize: 13, textAlign: "center" },
});
