// Settings tab — lifecycle only. Mirror web updateTournamentStatus with
// the same ALLOWED_TRANSITIONS map + .eq("status", from) double-click guard.
// Archive is intentionally web-only.
import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ALLOWED_TRANSITIONS, updateTournamentStatus } from "@/lib/queries";
import { Colors, Radius, Spacing, statusColors, statusLabel } from "@/lib/theme";
import { Card, EmptyState } from "@/components/ui";
import { useHub } from "./HubContext";

export function SettingsTab({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { data, refresh } = useHub();
  const [busy, setBusy] = useState(false);
  const t = data.tournament;

  const onTransition = useCallback(
    async (to: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await updateTournamentStatus(t.id, t.status, to);
        await refresh();
      } catch (e) {
        Alert.alert(
          "Couldn't change status",
          e instanceof Error ? e.message : "Try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, t.id, t.status],
  );

  const allowed = ALLOWED_TRANSITIONS[t.status] ?? [];
  const color = statusColors[t.status] ?? Colors.textDim;

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      <Card>
        <Text style={styles.label}>Status</Text>
        <View style={[styles.chip, { borderColor: color, alignSelf: "flex-start" }]}>
          <Text style={[styles.chipText, { color }]}>{statusLabel(t.status)}</Text>
        </View>
        <Text style={styles.hint}>
          {t.status === "draft"
            ? "Drafts are invisible until you publish. Archiving is on the web dashboard."
            : t.status === "published"
              ? "Published means it's discoverable but registration isn't open yet."
              : t.status === "registration_open"
                ? "New entrants can sign up. Close registration when the cutoff hits."
                : t.status === "registration_closed"
                  ? "Closed for signups, but you can reopen if capacity hasn't filled."
                  : "No transitions available from this state."}
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>Move status</Text>
        {allowed.length === 0 ? (
          <EmptyState title="No transitions" body="Archive lives on the web dashboard." />
        ) : (
          allowed.map((to) => (
            <Pressable
              key={to}
              disabled={busy}
              onPress={() => onTransition(to)}
              style={({ pressed }) => [
                styles.transitionBtn,
                pressed && { opacity: 0.6 },
                busy && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.transitionText}>
                {busy ? "…" : `→ ${statusLabel(to)}`}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.label}>About this screen</Text>
        <Text style={styles.about}>
          Tournament settings (name, dates, venue, visibility) live on the web dashboard.
          Archiving is intentionally web-only.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.textDim, fontSize: 13, marginBottom: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  chipText: { fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
  hint: { color: Colors.textDim, fontSize: 14, lineHeight: 20 },
  transitionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.elevated,
  },
  transitionText: { color: Colors.green, fontWeight: "800", fontSize: 15 },
  about: { color: Colors.textDim, fontSize: 13, lineHeight: 20 },
});
