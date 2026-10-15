// Schedule tab — flat match list per category. Each card has edit fields
// (court, scheduled_at ISO text, referee) and a walkover action. Referee
// pulls from the tournament_staff join loaded by fetchHub.
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Badge, Card, EmptyState } from "@/components/ui";
import { setMatchSchedule, setWalkoverAction } from "./schedule-actions";
import type { HubMatch } from "@/lib/queries";
import { useHub } from "./HubContext";
import { roundLabel } from "@/lib/bracket/knockout";

const SCHEDULE_FORMAT_HINT = "YYYY-MM-DDTHH:MM:SSZ (e.g. 2026-07-24T09:00:00Z)";

export function ScheduleTab({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { data, refresh, entrantNameById } = useHub();

  const grouped = useMemo(() => {
    return data.categories.map((cat) => {
      const matches = data.matches
        .filter((m) => m.category_id === cat.id)
        .sort((a, b) => {
          const aSort = a.scheduled_at ?? "9999";
          const bSort = b.scheduled_at ?? "9999";
          if (aSort !== bSort) return aSort < bSort ? -1 : 1;
          return a.round - b.round || a.position - b.position;
        });
      return { cat, matches };
    });
  }, [data.categories, data.matches]);

  if (data.matches.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        <EmptyState title="No matches scheduled" body="Generate fixtures first." />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {grouped.map(({ cat, matches }) => {
        if (matches.length === 0) return null;
        const totalRounds = Math.max(0, ...matches.map((m) => m.round));
        return (
          <View key={cat.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.name}</Text>
            {matches.map((m) => (
              <ScheduleCard
                key={m.id}
                match={m}
                totalRounds={totalRounds}
                entrantNameById={entrantNameById}
                staff={data.staff}
                tournamentId={data.tournament.id}
                refresh={refresh}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function ScheduleCard({
  match,
  totalRounds,
  entrantNameById,
  staff,
  tournamentId,
  refresh,
}: {
  match: HubMatch;
  totalRounds: number;
  entrantNameById: Map<string, string>;
  staff: { user_id: string; staff_role: string; full_name: string | null }[];
  tournamentId: string;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [court, setCourt] = useState(match.court ?? "");
  const [scheduledAt, setScheduledAt] = useState(match.scheduled_at ?? "");
  const [refereeId, setRefereeId] = useState(match.referee_id ?? "");

  const onSave = useCallback(async () => {
    setBusy(true);
    try {
      await setMatchSchedule(tournamentId, match.id, {
        court: court.trim(),
        scheduledAt: scheduledAt.trim(),
        refereeId,
      });
      setOpen(false);
      await refresh();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [court, match.id, refereeId, refresh, scheduledAt, tournamentId]);

  const onWalkover = useCallback(
    (side: "a" | "b") => {
      const winner = side === "a" ? entrantNameById.get(match.entrant_a ?? "") : entrantNameById.get(match.entrant_b ?? "");
      Alert.alert(
        "Confirm walkover",
        `${winner ?? "TBD"} wins by walkover. The match will be marked as walkover and the winner advances (knockout only).`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            style: "destructive",
            onPress: async () => {
              setBusy(true);
              try {
                await setWalkoverAction(tournamentId, match.id, side);
                await refresh();
              } catch (e) {
                Alert.alert("Failed", e instanceof Error ? e.message : "Try again.");
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    },
    [entrantNameById, match.entrant_a, match.entrant_b, match.id, refresh, tournamentId],
  );

  const aName = entrantNameById.get(match.entrant_a ?? "") ?? "TBD";
  const bName = entrantNameById.get(match.entrant_b ?? "") ?? "TBD";

  return (
    <Card>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <View style={styles.cardTop}>
          <Text style={styles.round}>{roundLabel(match.round, totalRounds)}</Text>
          <Badge status={match.status} />
        </View>
        <Text style={styles.teams} numberOfLines={1}>
          {aName} vs {bName}
        </Text>
        <Text style={styles.meta}>
          {match.court ? `${match.court}` : "Court TBD"}
          {match.scheduled_at ? ` · ${new Date(match.scheduled_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : " · Time TBD"}
          {match.referee_id ? ` · ${staff.find((s) => s.user_id === match.referee_id)?.full_name ?? "Referee"}` : ""}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.editor}>
          <Text style={styles.label}>Court</Text>
          <TextInput
            style={styles.input}
            value={court}
            onChangeText={setCourt}
            placeholder="Court 1"
            placeholderTextColor={Colors.textFaint}
          />
          <Text style={styles.label}>Scheduled at</Text>
          <TextInput
            style={styles.input}
            value={scheduledAt}
            onChangeText={setScheduledAt}
            placeholder={SCHEDULE_FORMAT_HINT}
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.label}>Referee</Text>
          <View style={styles.staffRow}>
            <Pressable
              onPress={() => setRefereeId("")}
              style={[styles.staffChip, !refereeId && styles.staffChipActive]}
            >
              <Text style={[styles.staffChipText, !refereeId && styles.staffChipTextActive]}>None</Text>
            </Pressable>
            {staff.map((s) => (
              <Pressable
                key={s.user_id}
                onPress={() => setRefereeId(s.user_id)}
                style={[styles.staffChip, refereeId === s.user_id && styles.staffChipActive]}
              >
                <Text
                  style={[
                    styles.staffChipText,
                    refereeId === s.user_id && styles.staffChipTextActive,
                  ]}
                >
                  {s.full_name ?? s.user_id.slice(0, 6)} ({s.staff_role.replace("_", "-")})
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.saveBtn, busy && { opacity: 0.5 }]}
              onPress={onSave}
              disabled={busy}
            >
              <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
          {match.status !== "completed" ? (
            <View style={styles.walkoverBlock}>
              <Text style={styles.label}>Walkover</Text>
              <View style={styles.staffRow}>
                <Pressable
                  style={[styles.walkBtn, { borderColor: Colors.green }]}
                  onPress={() => onWalkover("a")}
                  disabled={busy || !match.entrant_a}
                >
                  <Text style={[styles.walkText, { color: Colors.green }]}>{aName} wins</Text>
                </Pressable>
                <Pressable
                  style={[styles.walkBtn, { borderColor: Colors.green }]}
                  onPress={() => onWalkover("b")}
                  disabled={busy || !match.entrant_b}
                >
                  <Text style={[styles.walkText, { color: Colors.green }]}>{bName} wins</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: 16, fontFamily: Font.extrabold, marginBottom: Spacing.sm },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  round: {
    color: Colors.textDim,
    fontSize: 11,
    fontFamily: Font.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  teams: { color: Colors.text, fontSize: 15, fontFamily: Font.bold, marginTop: Spacing.xs },
  meta: { color: Colors.textDim, fontSize: 12, marginTop: Spacing.xs },
  editor: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  label: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: 15,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  staffRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.xs },
  staffChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  staffChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  staffChipText: { color: Colors.textDim, fontSize: 12, fontFamily: Font.semibold },
  staffChipTextActive: { color: Colors.green },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.green,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveText: { color: "#04140A", fontFamily: Font.extrabold },
  walkoverBlock: { marginTop: Spacing.md },
  walkBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  walkText: { fontFamily: Font.bold },
});
