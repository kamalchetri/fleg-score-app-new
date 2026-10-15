import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RankedResultsView } from "@/components/ranked-results/RankedResultsView";
import { EmptyState, Screen } from "@/components/ui";
import { parseRankedRules, type RankedBoard } from "@/lib/ranked-results/engine";
import { RANKED_LAB_FIXTURES, type RankedLabFixture } from "@/lib/ranked-results/fixtures";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { isReviewBuild } from "@/lib/build-flags";
import { ReviewBanner } from "@/components/review/ReviewBanner";

export default function RankedResultsLabRoute() {
  if (!__DEV__ && !isReviewBuild()) {
    return (
      <Screen>
        <EmptyState title="Not available." />
      </Screen>
    );
  }
  return <RankedResultsLab />;
}

function RankedResultsLab() {
  const [fixtureId, setFixtureId] = useState(RANKED_LAB_FIXTURES[0].id);
  const [boards, setBoards] = useState<Record<string, RankedBoard>>(() =>
    Object.fromEntries(RANKED_LAB_FIXTURES.map((fixture) => [fixture.id, boardFor(fixture)])),
  );
  const fixture = RANKED_LAB_FIXTURES.find((item) => item.id === fixtureId) ?? RANKED_LAB_FIXTURES[0];
  const parsed = parseRankedRules(fixture.rules);
  const board = boards[fixture.id] ?? boardFor(fixture);

  return (
    <Screen edges={["left", "right", "bottom"]}>
      {isReviewBuild() && <ReviewBanner />}
      <View style={styles.tools}>
        <Text style={styles.kicker}>Ranked results lab</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chips}>
          {RANKED_LAB_FIXTURES.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setFixtureId(item.id)}
              style={[styles.chip, item.id === fixture.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, item.id === fixture.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <RankedResultsView
        key={fixture.id}
        rules={parsed.ok ? parsed.rules : null}
        rulesReason={parsed.ok ? null : parsed.reason}
        board={board}
        note={fixture.note}
        finalized={fixture.finalized}
        onBoard={(next) => setBoards((current) => ({ ...current, [fixture.id]: next }))}
      />
    </Screen>
  );
}

function boardFor(fixture: RankedLabFixture): RankedBoard {
  return { entrants: fixture.entrants, actions: fixture.actions };
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
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
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
