import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { Share } from "react-native";
import { type AuditExportEntity } from "@/lib/audit";
import { logDataExported } from "@/lib/audit-log";
import { prepareTournamentExport } from "@/lib/export-csv";
import { Colors, Font, Spacing } from "@/lib/theme";
import { Button, Card } from "@/components/ui";
import { useHub } from "./HubContext";

const EXPORTS: Array<{ kind: AuditExportEntity; label: string; body: string }> = [
  { kind: "results", label: "Export results", body: "Matches, scores, and winners." },
  { kind: "standings", label: "Export standings", body: "League and group tables computed from completed matches." },
  {
    kind: "entrants",
    label: "Export entrants",
    body: "Includes contact name, email, and phone. This stays in the organizer hub.",
  },
];

export function ExportTab({
  role,
  refreshing,
  onRefresh,
}: {
  role: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { data } = useHub();
  const [busy, setBusy] = useState<AuditExportEntity | null>(null);

  async function run(kind: AuditExportEntity) {
    const prepared = prepareTournamentExport(kind, role, data);
    if (!prepared.ok) {
      Alert.alert("Not available", "Exports are limited to the tournament organizer.");
      return;
    }
    setBusy(kind);
    try {
      const shared = await Share.share({ message: prepared.csv, title: prepared.filename });
      if (shared.action === Share.dismissedAction) return;
      const audit = await logDataExported({
        tournamentId: data.tournament.id,
        entityType: kind,
        rows: prepared.rows,
      });
      if (!audit.ok) {
        Alert.alert("Audit log not written", `${prepared.filename} was shared. ${audit.message}`);
      }
    } catch (error: unknown) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      <Card>
        <Text style={styles.title}>Export</Text>
        <Text style={styles.body}>
          Each export is one CSV for this tournament. A successful share writes one data-exported audit row. Entrant
          contacts are not included in results or standings.
        </Text>
      </Card>
      {EXPORTS.map((item) => (
        <Card key={item.kind}>
          <Text style={styles.title}>{item.label}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Button
            label={busy === item.kind ? "Exporting…" : item.label}
            disabled={busy !== null}
            onPress={() => run(item.kind)}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { color: Colors.text, fontFamily: Font.bold, fontSize: 16 },
  body: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 14, lineHeight: 20, marginTop: Spacing.xs },
});
