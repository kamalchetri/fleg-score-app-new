import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  confirmRankedAction,
  formatStoredValue,
  projectRankedBoard,
  resultUnitLabel,
  reviewRankedDraft,
  undoRankedAction,
  type RankedAction,
  type RankedBoard,
  type RankedRules,
  type RankedStanding,
} from "@/lib/ranked-results/engine";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";

export function RankedResultsView({
  rules,
  rulesReason,
  board,
  note,
  finalized,
  onBoard,
}: {
  rules: RankedRules | null;
  rulesReason: string | null;
  board: RankedBoard;
  note: string;
  finalized: boolean;
  onBoard: (board: RankedBoard) => void;
}) {
  const [selectedId, setSelectedId] = useState(board.entrants[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [review, setReview] = useState<{ action: RankedAction; summary: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const projection = rules ? projectRankedBoard(rules, board) : null;
  const selected = board.entrants.find((entrant) => entrant.id === selectedId) ?? board.entrants[0];

  function selectEntrant(entrantId: string) {
    setSelectedId(entrantId);
    setReview(null);
    setMessage(null);
  }

  function startReview(draft: { entrantId: string; kind: "attempt"; raw: string } | { entrantId: string; kind: "status"; status: string }) {
    if (!rules || !selected) return;
    const reviewed = reviewRankedDraft(rules, board, draft);
    if (!reviewed.ok) {
      setReview(null);
      setMessage(reviewed.reason.replace(/_/g, " "));
      return;
    }
    setMessage(null);
    setReview({ action: reviewed.action, summary: reviewed.summary });
  }

  function confirmReview() {
    if (!rules || !review) return;
    const confirmed = confirmRankedAction(rules, board, review.action);
    if (!confirmed.ok) {
      setMessage(confirmed.reason.replace(/_/g, " "));
      return;
    }
    onBoard(confirmed.board);
    setReview(null);
    setRaw("");
    setMessage(null);
  }

  function undo() {
    const next = undoRankedAction(board);
    if (!next) return;
    onBoard(next);
    setReview(null);
    setMessage(null);
  }

  return (
    <View style={styles.fill}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>{note}</Text>
        {projection?.qualificationNote === "unresolved_tie" ? (
          <Text style={styles.unresolved}>Unresolved tie. Nobody on the cut is selected.</Text>
        ) : null}
        <Text style={styles.kicker}>Standings</Text>
        {rulesReason ? <Text style={styles.unresolved}>Rules are incomplete. Nothing can be recorded.</Text> : null}
        {rulesReason
          ? board.entrants.map((entrant) => (
              <View key={entrant.id} style={styles.row}>
                <Text style={styles.rank}>–</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.name}>{entrant.name}</Text>
                  <Text style={styles.district}>{entrant.district}</Text>
                </View>
              </View>
            ))
          : null}
        {projection?.rows.map((row) => (
          <StandingRow
            key={row.entrantId}
            rules={rules}
            row={row}
            selected={row.entrantId === selected?.id}
            onPress={() => selectEntrant(row.entrantId)}
          />
        ))}
        <Text style={styles.footerNote}>The qualifier list is informational. It does not create entrants or a bracket.</Text>
      </ScrollView>
      {rules && selected && !finalized ? (
        <View style={styles.dock}>
          <Text style={styles.dockName} numberOfLines={2}>
            {selected.name}
          </Text>
          {review ? (
            <View style={styles.review}>
              <Text style={styles.summary}>{review.summary}</Text>
              <View style={styles.dockRow}>
                <DockButton label="Edit" onPress={() => setReview(null)} />
                <DockButton label="Confirm" primary onPress={confirmReview} />
              </View>
            </View>
          ) : (
            <>
              <TextInput
                value={raw}
                onChangeText={setRaw}
                placeholder={rules.unit === "points" ? "Points" : rules.unit === "ms" ? "ss.mmm" : "m.mmm"}
                placeholderTextColor={Colors.textFaint}
                keyboardType={rules.unit === "points" ? "number-pad" : "decimal-pad"}
                autoCorrect={false}
                style={styles.input}
              />
              <View style={styles.dockRow}>
                <DockButton label="Review" primary onPress={() => startReview({ entrantId: selected.id, kind: "attempt", raw })} />
                {rules.allowedStatuses.map((status) => (
                  <DockButton
                    key={status}
                    label={status}
                    onPress={() => startReview({ entrantId: selected.id, kind: "status", status })}
                  />
                ))}
                <DockButton label="Undo" onPress={undo} />
              </View>
            </>
          )}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function StandingRow({
  rules,
  row,
  selected,
  onPress,
}: {
  rules: RankedRules | null;
  row: RankedStanding;
  selected: boolean;
  onPress: () => void;
}) {
  const value =
    rules && row.rankedValue !== null ? `${formatStoredValue(rules, row.rankedValue)} ${resultUnitLabel(rules)}` : null;
  const attempts =
    rules && row.attempts.length > 1
      ? row.attempts.map((attempt) => formatStoredValue(rules, attempt)).join("  ")
      : null;
  return (
    <Pressable onPress={onPress} style={[styles.row, selected && styles.rowOn]}>
      <Text style={styles.rank}>{row.rank === null ? "–" : String(row.rank)}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{row.name}</Text>
        <Text style={styles.district}>{row.district}</Text>
        {attempts ? <Text style={styles.attempts}>Attempts {attempts}</Text> : null}
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.value}>{row.status ?? value ?? "No result"}</Text>
        <Text style={styles.qual}>{qualificationLabel(row)}</Text>
      </View>
    </Pressable>
  );
}

function qualificationLabel(row: RankedStanding): string {
  if (row.qualification === "unresolved_tie") return "Unresolved tie";
  const parts: string[] = [];
  if (row.tied) parts.push("Tied");
  if (row.qualification === "qualified") parts.push("Qualified");
  if (row.qualification === "not_qualified") parts.push("Not qualified");
  return parts.join(" · ");
}

function DockButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, primary && styles.buttonOn]}>
      <Text style={[styles.buttonText, primary && styles.buttonTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  note: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 13, lineHeight: 18 },
  unresolved: { color: Colors.amber, fontFamily: Font.bold, fontSize: 14, lineHeight: 20 },
  kicker: {
    color: Colors.textDim,
    fontFamily: Font.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: Spacing.sm,
  },
  footerNote: { color: Colors.textFaint, fontFamily: Font.medium, fontSize: 12, lineHeight: 18, marginTop: Spacing.sm },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowOn: { borderColor: Colors.green },
  rank: { width: 28, color: Colors.text, fontFamily: Font.extrabold, fontSize: 18 },
  rowBody: { flex: 1, gap: 2 },
  name: { color: Colors.text, fontFamily: Font.bold, fontSize: 15, lineHeight: 20 },
  district: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 12, lineHeight: 16 },
  attempts: { color: Colors.textFaint, fontFamily: Font.medium, fontSize: 12 },
  rowEnd: { maxWidth: 110, alignItems: "flex-end", gap: 2 },
  value: { color: Colors.text, fontFamily: Font.bold, fontSize: 14, textAlign: "right" },
  qual: { color: Colors.amber, fontFamily: Font.bold, fontSize: 11, textAlign: "right" },
  dock: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.canvas,
  },
  dockName: { color: Colors.text, fontFamily: Font.bold, fontSize: 16 },
  dockRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontFamily: Font.bold,
    fontSize: 20,
  },
  review: { gap: Spacing.sm },
  summary: { color: Colors.text, fontFamily: Font.medium, fontSize: 15, lineHeight: 22 },
  message: { color: Colors.danger, fontFamily: Font.bold, fontSize: 13 },
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOn: { backgroundColor: Colors.green, borderColor: Colors.green },
  buttonText: { color: Colors.text, fontFamily: Font.bold, fontSize: 14 },
  buttonTextOn: { color: Colors.onPrimary },
});
