import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ReviewBanner } from "@/components/review/ReviewBanner";
import { EmptyState, Screen } from "@/components/ui";
import {
  ARCHERY_COMPOUND_PRESET,
  ARCHERY_RECURVE_PRESET,
  BADMINTON_PRESET,
  BASKETBALL_PRESET,
  COMBAT_BOUT_PRESET,
  SEPAKTAKRAW_REGU_PRESET,
  TABLE_TENNIS_SINGLES_PRESET,
  VOLLEYBALL_PRESET,
} from "@/lib/sports/rules-presets";
import { isReviewBuild } from "@/lib/build-flags";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";

type RuleRow = { label: string; description: string; pending?: boolean };

const rows: RuleRow[] = [
  { label: "Football", description: "Existing futsal-style engine; halves and duration require TC confirmation." },
  { label: "Basketball", description: describe(BASKETBALL_PRESET.rules) },
  { label: "Badminton singles", description: describe(BADMINTON_PRESET.rules) },
  { label: "Table tennis singles", description: describe(TABLE_TENNIS_SINGLES_PRESET.rules) },
  { label: "Lawn tennis singles", description: "No approved preset — full third set versus match tiebreak requires TC decision." },
  { label: "Volleyball", description: describe(VOLLEYBALL_PRESET.rules) },
  { label: "Sepaktakraw Regu", description: describe(SEPAKTAKRAW_REGU_PRESET.rules) },
  { label: "Combat bouts", description: "Winner plus explicit method (decision, stoppage, walkover, disqualification, or other); rounds require TC confirmation." },
  { label: "Archery Recurve Olympic Round", description: describe(ARCHERY_RECURVE_PRESET.rules) },
  { label: "Archery Compound Olympic Round", description: describe(ARCHERY_COMPOUND_PRESET.rules) },
  { label: "Archery Indian Round", description: "Cumulative ranked results; bracket rules require TC decision." },
  { label: "Athletics track", description: "Rank by time in milliseconds; lower result ranks first; heats and finals require TC workflow." },
  { label: "Athletics field", description: "Rank by distance in millimetres; higher result ranks first; event rules require TC workflow." },
  { label: "Wushu non-Sanda / Pencak artistic", description: "No scoring engine or preset — structured result workflow requires TC decision." },
  { label: "Futsal, pickleball, and darts", description: "Existing app rules remain unchanged; NSPG use requires event-specific confirmation." },
];

export default function RulesReviewRoute() {
  if (!isReviewBuild()) return <Screen><EmptyState title="Not available." /></Screen>;
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ReviewBanner />
        <Text style={styles.title}>Rules in review</Text>
        <Text style={styles.intro}>Read-only standard presets. Every line is pending technical-committee review.</Text>
        {rows.map((row) => <RuleCard key={row.label} row={row} />)}
      </ScrollView>
    </Screen>
  );
}

function RuleCard({ row }: { row: RuleRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={styles.pending}>TC REVIEW: PENDING</Text>
      </View>
      <Text style={styles.description}>{row.description}</Text>
    </View>
  );
}

function describe(value: unknown): string {
  if (!value || typeof value !== "object") return "No approved preset — TC decision required.";
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.best_of === "number") parts.push(`best of ${record.best_of}`);
  if (typeof record.best_of_sets === "number") parts.push(`best of ${record.best_of_sets} sets`);
  if (typeof record.points_to === "number") parts.push(`${record.points_to} points`);
  if (typeof record.regular_set_points_to === "number") parts.push(`regular sets to ${record.regular_set_points_to}`);
  if (typeof record.deciding_set_points_to === "number") parts.push(`deciding set to ${record.deciding_set_points_to}`);
  if (typeof record.win_by === "number") parts.push(`win by ${record.win_by}`);
  if (typeof record.cap === "number") parts.push(`cap ${record.cap}`);
  if (typeof record.regular_set_cap === "number") parts.push(`regular cap ${record.regular_set_cap}`);
  if (typeof record.deciding_set_cap === "number") parts.push(`deciding cap ${record.deciding_set_cap}`);
  if (typeof record.periods === "number") parts.push(`${record.periods} periods × ${record.period_minutes} minutes`);
  if (record.format === "set_points") parts.push("set-point format");
  if (record.format === "cumulative") parts.push("cumulative format");
  if (typeof record.regulation_ends === "number") parts.push(`${record.regulation_ends} ends`);
  if (typeof record.arrows_per_end === "number") parts.push(`${record.arrows_per_end} arrows/end`);
  if (typeof record.set_points_to_win === "number") parts.push(`first to ${record.set_points_to_win} set points`);
  return parts.length ? parts.join(", ") + "." : "No approved preset — TC decision required.";
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.xl },
  title: { color: Colors.text, fontFamily: Font.extrabold, fontSize: 27, marginTop: Spacing.lg },
  intro: { color: Colors.textDim, fontFamily: Font.regular, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  heading: { alignItems: "flex-start", gap: Spacing.xs },
  label: { color: Colors.text, fontFamily: Font.bold, fontSize: 16 },
  pending: { color: Colors.amber, fontFamily: Font.bold, fontSize: 10, letterSpacing: 0.8 },
  description: { color: Colors.textDim, fontFamily: Font.regular, fontSize: 14, lineHeight: 21 },
});
