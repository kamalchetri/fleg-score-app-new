import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScoringEvent } from "@/lib/scoring";
import { projectMatchState, type ScoringMatch } from "@/lib/scoring/project-match";
import { SCORING_LAB_FIXTURES, SCORING_LAB_LONG_NAMES, type ScoringLabFixture } from "@/lib/scoring-lab/fixtures";
import { MatchScoringView } from "@/components/scoring/MatchScoringView";
import { EmptyState, Screen } from "@/components/ui";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";

const STATUSES = ["scheduled", "live", "completed"] as const;

export default function ScoringLabRoute() {
  if (!__DEV__) {
    return (
      <Screen>
        <EmptyState title="Not available." />
      </Screen>
    );
  }
  return <ScoringLab />;
}

function ScoringLab() {
  const [fixtureId, setFixtureId] = useState(SCORING_LAB_FIXTURES[0].id);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [eventsOverride, setEventsOverride] = useState<ScoringEvent[] | null>(null);
  const [longNames, setLongNames] = useState(false);
  const [busyOn, setBusyOn] = useState(false);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fixtureScroller = useRef<ScrollView>(null);
  const chipOffset = useRef<Record<string, number>>({});
  const fixture = SCORING_LAB_FIXTURES.find((item) => item.id === fixtureId) ?? SCORING_LAB_FIXTURES[0];
  const clockOrigin = useMemo(() => Date.now() - 20_000, [fixture.id]);
  const events = useMemo(() => {
    const source = eventsOverride ?? fixture.events;
    return source.map((event) =>
      event.event_type === "period_start" && event.created_at.startsWith("2026-01-01")
        ? { ...event, created_at: new Date(clockOrigin).toISOString() }
        : event,
    );
  }, [clockOrigin, eventsOverride, fixture.events]);
  const match = useMemo(() => presentMatch(fixture, statusOverride, longNames), [fixture, statusOverride, longNames]);

  function selectFixture(next: ScoringLabFixture) {
    setFixtureId(next.id);
    setStatusOverride(null);
    setEventsOverride(null);
    setBusyOn(false);
    setOffline(false);
  }

  function resetFixture() {
    setStatusOverride(null);
    setEventsOverride(null);
    setBusyOn(false);
    setOffline(false);
    setLongNames(false);
  }

  function onEvent(eventType: string, payload: Record<string, unknown>) {
    if (busyOn || offline) return;
    setEventsOverride((current) => {
      const base = current ?? fixture.events;
      const nextId = base.reduce((max, event) => Math.max(max, event.id), 0) + 1;
      return [
        ...base,
        { id: nextId, event_type: eventType, payload, created_at: new Date().toISOString() },
      ];
    });
  }

  function onConfirm() {
    const projected = projectMatchState(match, events);
    if (!projected?.winnerSide) return;
    const winner = projected.winnerSide === "a" ? match.a : match.b;
    if (!winner) return;
    Alert.alert(
      "Confirm result",
      `${winner.display_name} wins ${projected.display}. This finalizes the match and advances the winner.`,
      [
        { text: "Not yet", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: () => setStatusOverride("completed") },
      ],
    );
  }

  const notice = offline ? "Not recorded. Nothing was sent." : null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const x = chipOffset.current[fixture.id];
    if (x == null) return;
    fixtureScroller.current?.scrollTo({ x: Math.max(0, x - Spacing.md), animated: true });
  }, [fixture.id]);

  return (
    <Screen edges={["left", "right", "bottom"]} style={{ paddingBottom: 24 }}>
      <View style={styles.tools}>
        <Text style={styles.kicker}>Scoring lab</Text>
        <ScrollView
          ref={fixtureScroller}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          style={styles.fixtureScroll}
          contentContainerStyle={styles.row}
        >
          {SCORING_LAB_FIXTURES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              on={item.id === fixture.id}
              onPress={() => selectFixture(item)}
              onLayout={(x) => {
                chipOffset.current[item.id] = x;
              }}
            />
          ))}
        </ScrollView>
        <View style={styles.rowWrap}>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              label={status}
              on={(statusOverride ?? fixture.match.status) === status}
              onPress={() => setStatusOverride(status)}
            />
          ))}
          <Chip label="Long names" on={longNames} onPress={() => setLongNames((value) => !value)} />
          <Chip label="Busy" on={busyOn} onPress={() => setBusyOn((value) => !value)} />
          <Chip label="Connection error" on={offline} onPress={() => setOffline((value) => !value)} />
          <Chip label="Reset" on={false} onPress={resetFixture} />
        </View>
      </View>
      <MatchScoringView
        key={fixture.id}
        match={match}
        events={events}
        busy={busyOn}
        now={now}
        notice={notice}
        archeryDraft={fixture.archeryDraft}
        onEvent={onEvent}
        onStart={() => setStatusOverride("live")}
        onConfirm={onConfirm}
      />
    </Screen>
  );
}

function presentMatch(fixture: ScoringLabFixture, statusOverride: string | null, longNames: boolean): ScoringMatch {
  const status = statusOverride ?? fixture.match.status;
  if (!longNames) return { ...fixture.match, status };
  return {
    ...fixture.match,
    status,
    a: fixture.match.a ? { ...fixture.match.a, display_name: SCORING_LAB_LONG_NAMES.a } : null,
    b: fixture.match.b ? { ...fixture.match.b, display_name: SCORING_LAB_LONG_NAMES.b } : null,
  };
}

function Chip({
  label,
  on,
  onPress,
  onLayout,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  onLayout?: (x: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLayout={onLayout ? (event) => onLayout(event.nativeEvent.layout.x) : undefined}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tools: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  kicker: {
    color: Colors.textDim,
    fontFamily: Font.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: { gap: Spacing.sm, paddingVertical: Spacing.xs, alignItems: "center" },
  fixtureScroll: { flexGrow: 0, minHeight: 56 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { color: Colors.text, fontFamily: Font.bold, fontSize: 14 },
  chipTextOn: { color: Colors.green },
});
