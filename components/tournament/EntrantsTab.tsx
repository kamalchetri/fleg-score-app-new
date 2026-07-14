// Entrants tab — list by category, approve / reject / waitlist / pending.
// Optimistic local override per entrant, rolls back on error (same pattern
// as match control taps). Contacts are tap-to-reveal so we don't spam PII.
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useHub } from "./HubContext";
import { setEntrantStatus } from "@/lib/queries";
import { Colors, Spacing, statusColors } from "@/lib/theme";
import { Badge, Card, EmptyState } from "@/components/ui";

const ENTRANT_STATUSES: Array<{
  status: "pending" | "approved" | "rejected" | "waitlisted";
  label: string;
  variant: "primary" | "ghost" | "danger";
}> = [
  { status: "approved", label: "Approve", variant: "primary" },
  { status: "waitlisted", label: "Waitlist", variant: "ghost" },
  { status: "rejected", label: "Reject", variant: "danger" },
  { status: "pending", label: "Back to pending", variant: "ghost" },
];

export function EntrantsTab({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { data, refresh, entrantNameById: _ } = useHub();
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const contactsByEntrant = useMemo(() => {
    const m = new Map<string, (typeof data.contacts)[number]>();
    for (const c of data.contacts) m.set(c.entrant_id, c);
    return m;
  }, [data.contacts]);

  const grouped = useMemo(() => {
    return data.categories.map((cat) => {
      const entrants = data.entrants
        .filter((e) => e.category_id === cat.id)
        .map((e) => ({ ...e, status: optimistic[e.id] ?? e.status }));
      const approved = entrants.filter((e) => e.status === "approved").length;
      const pending = entrants.filter((e) => e.status === "pending").length;
      return { cat, entrants, approved, pending };
    });
  }, [data.categories, data.entrants, optimistic]);

  const onAction = useCallback(
    async (entrantId: string, next: string) => {
      if (busyId) return;
      const prev = optimistic[entrantId] ?? data.entrants.find((e) => e.id === entrantId)?.status ?? "pending";
      setOptimistic({ ...optimistic, [entrantId]: next });
      setBusyId(entrantId);
      try {
        await setEntrantStatus(data.tournament.id, entrantId, next);
        // Drop the optimistic override once the server confirms — refresh()
        // will replace the canonical status.
        const { [entrantId]: _, ...rest } = optimistic;
        setOptimistic(rest);
        await refresh();
      } catch (e) {
        setOptimistic({ ...optimistic, [entrantId]: prev });
        Alert.alert("Update failed", e instanceof Error ? e.message : "Try again.");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, data.entrants, data.tournament.id, optimistic, refresh],
  );

  if (data.categories.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        <EmptyState title="No categories yet" body="Add categories on the web dashboard first." />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {grouped.map(({ cat, entrants, approved, pending }) => (
        <View key={cat.id} style={styles.category}>
          <View style={styles.headerRow}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <Text style={styles.counts}>
              {approved}/{cat.max_entrants ?? "∞"} approved · {pending} pending
            </Text>
          </View>
          {entrants.length === 0 ? (
            <EmptyState title="No entrants" />
          ) : (
            entrants.map((e) => {
              const contact = contactsByEntrant.get(e.id);
              return (
                <EntrantCard
                  key={e.id}
                  entrantId={e.id}
                  name={e.display_name}
                  seed={e.seed}
                  status={e.status}
                  busy={busyId === e.id}
                  contactName={contact?.contact_name ?? null}
                  contactEmail={contact?.contact_email ?? null}
                  contactPhone={contact?.contact_phone ?? null}
                  onAction={(s) => onAction(e.id, s)}
                />
              );
            })
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function EntrantCard({
  entrantId: _entrantId,
  name,
  seed,
  status,
  busy,
  contactName,
  contactEmail,
  contactPhone,
  onAction,
}: {
  entrantId: string;
  name: string;
  seed: number | null;
  status: string;
  busy: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  onAction: (s: "pending" | "approved" | "rejected" | "waitlisted") => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const hasContact = contactName || contactEmail || contactPhone;
  const color = statusColors[status] ?? Colors.textDim;
  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {seed != null ? <Text style={styles.seed}> · #{seed}</Text> : null}
          </Text>
        </View>
        <View style={[styles.chip, { borderColor: color }]}>
          <Text style={[styles.chipText, { color }]}>{status}</Text>
        </View>
      </View>
      {hasContact ? (
        <Pressable onPress={() => setRevealed((v) => !v)}>
          <Text style={styles.reveal}>{revealed ? "Hide contact" : "Show contact"}</Text>
          {revealed ? (
            <View style={styles.contactBlock}>
              {contactName ? <Text style={styles.contactLine}>{contactName}</Text> : null}
              {contactPhone ? <Text style={styles.contactLine}>{contactPhone}</Text> : null}
              {contactEmail ? <Text style={styles.contactLine}>{contactEmail}</Text> : null}
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        {ENTRANT_STATUSES.filter((s) => s.status !== status).map((s) => (
          <Pressable
            key={s.status}
            onPress={() => onAction(s.status)}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              s.variant === "primary" && styles.actionPrimary,
              s.variant === "danger" && styles.actionDanger,
              s.variant === "ghost" && styles.actionGhost,
              (pressed || busy) && { opacity: 0.5 },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                s.variant === "primary" && { color: "#04140A" },
                s.variant === "danger" && { color: "#FFFFFF" },
                s.variant === "ghost" && { color: Colors.text },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  category: { marginBottom: Spacing.lg },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  categoryName: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  counts: { color: Colors.textDim, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  name: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  seed: { color: Colors.textDim, fontSize: 14, fontWeight: "500" },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  chipText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  reveal: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.sm },
  contactBlock: { marginTop: Spacing.sm, gap: 2 },
  contactLine: { color: Colors.text, fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: { backgroundColor: Colors.green },
  actionDanger: { backgroundColor: Colors.red },
  actionGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: Colors.border },
  actionText: { fontSize: 14, fontWeight: "700" },
});
