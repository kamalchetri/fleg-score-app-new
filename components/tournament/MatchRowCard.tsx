// Reusable match card used by the Fixtures tab and (later) the Schedule tab.
// List-first view: round label + entrant names + status + score + walkover.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, statusColors } from "@/lib/theme";
import { Badge } from "@/components/ui";
import { roundLabel } from "@/lib/bracket/knockout";
import type { HubMatch } from "@/lib/queries";

interface EntrantLookup {
  nameById: Map<string, string>;
}

function entrantName(map: Map<string, string>, id: string | null): string {
  if (!id) return "TBD";
  return map.get(id) ?? "TBD";
}

function scoreOf(m: HubMatch): string {
  const s = (m.score ?? {}) as { display?: string };
  return typeof s.display === "string" && s.display.length > 0 ? s.display : "";
}

interface Props {
  match: HubMatch;
  entrants: EntrantLookup;
  totalRounds: number;
  /** Knockout round label vs. numeric "Round N" — pass `null` to always show numeric. */
  knockoutRounds?: number | null;
  onPress?: () => void;
}

export function MatchRowCard({ match, entrants, totalRounds, knockoutRounds, onPress }: Props) {
  const go = onPress ?? (() => router.push(`/live/${match.id}`));
  const label =
    knockoutRounds != null && match.round
      ? roundLabel(match.round, knockoutRounds)
      : `Round ${match.round}`;
  const winnerSide =
    match.winner_id != null
      ? match.winner_id === match.entrant_a
        ? "a"
        : match.winner_id === match.entrant_b
          ? "b"
          : null
      : null;
  return (
    <Pressable onPress={go}>
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.round}>{label}</Text>
          <Badge status={match.status} />
        </View>
        <View style={styles.line}>
          <Text
            style={[
              styles.team,
              winnerSide === "a" && styles.winner,
            ]}
            numberOfLines={1}
          >
            {entrantName(entrants.nameById, match.entrant_a)}
          </Text>
          <Text style={styles.score}>{scoreOf(match) || "—"}</Text>
          <Text
            style={[
              styles.team,
              styles.right,
              winnerSide === "b" && styles.winner,
            ]}
            numberOfLines={1}
          >
            {entrantName(entrants.nameById, match.entrant_b)}
          </Text>
        </View>
        {match.scheduled_at || match.court ? (
          <Text style={styles.meta}>
            {match.court ? `${match.court}` : ""}
            {match.court && match.scheduled_at ? " · " : ""}
            {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }) : ""}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  round: { color: Colors.textDim, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  team: { color: Colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
  right: { textAlign: "right" },
  winner: { color: Colors.green, fontWeight: "800" },
  score: { color: Colors.textDim, fontSize: 14, fontVariant: ["tabular-nums"], minWidth: 60, textAlign: "center" },
  meta: { color: Colors.textFaint, fontSize: 12, marginTop: Spacing.xs },
});
