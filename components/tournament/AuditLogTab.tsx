import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AUDIT_ACTIONS,
  AUDIT_PAGE_SIZE,
  actorLabel,
  auditReadPlan,
  formatAuditDetails,
  formatAuditTime,
  humanizeAction,
  localDayRange,
} from "@/lib/audit";
import { fetchActorNames, fetchAuditPage, type AuditLogRow } from "@/lib/audit-log";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Card, EmptyState } from "@/components/ui";
import { useHub } from "./HubContext";

type DatePreset = "all" | "today" | "7" | "30";

export function AuditLogTab({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { tournamentId } = useHub();
  const [action, setAction] = useState<string | null>(null);
  const [dates, setDates] = useState<DatePreset>("all");
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [names, setNames] = useState<Map<string, string | null>>(new Map());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameNote, setNameNote] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const range = dates === "all" ? null : localDayRange(now, dates === "today" ? 0 : dates === "7" ? 7 : 30);
      const plan = auditReadPlan({
        tournamentId,
        action,
        occurredGte: range?.from ?? null,
        occurredLte: range?.to ?? null,
        page: nextPage,
      });
      if (!plan) {
        setError("Those filters are not valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await fetchAuditPage(plan);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setError(null);
      setRows((current) => (replace ? result.rows : [...current, ...result.rows]));
      setHasMore(result.rows.length === AUDIT_PAGE_SIZE);
      setPage(nextPage);
      const actorIds = result.rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id));
      const actors = await fetchActorNames(actorIds);
      if (actors.error) setNameNote("Names could not be loaded. Short ids are shown instead.");
      setNames((current) => {
        const merged = new Map(replace ? [] : current);
        for (const [id, name] of actors.names) merged.set(id, name);
        return merged;
      });
      setLoading(false);
    },
    [action, dates, now, tournamentId],
  );

  useEffect(() => {
    load(0, true).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load the audit log.");
      setLoading(false);
    });
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      <Text style={styles.note}>Newest first. This log is read-only.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All actions" selected={action === null} onPress={() => setAction(null)} />
        {AUDIT_ACTIONS.map((item) => (
          <FilterChip key={item} label={humanizeAction(item)} selected={action === item} onPress={() => setAction(item)} />
        ))}
      </ScrollView>
      <View style={styles.chips}>
        <FilterChip label="All dates" selected={dates === "all"} onPress={() => setDates("all")} />
        <FilterChip label="Today" selected={dates === "today"} onPress={() => setDates("today")} />
        <FilterChip label="7 days" selected={dates === "7"} onPress={() => setDates("7")} />
        <FilterChip label="30 days" selected={dates === "30"} onPress={() => setDates("30")} />
      </View>
      {nameNote ? <Text style={styles.note}>{nameNote}</Text> : null}
      {error ? <EmptyState title="Audit log unavailable" body={error} /> : null}
      {!error && rows.length === 0 && !loading ? <EmptyState title="No audit events" /> : null}
      {rows.map((row) => (
        <Card key={row.id}>
          <Text style={styles.time}>{formatAuditTime(row.occurred_at, now)}</Text>
          <Text style={styles.line}>
            {actorLabel(row.actor_id, names)} · {humanizeAction(row.action)}
          </Text>
          {formatAuditDetails(row.details) ? <Text style={styles.details}>{formatAuditDetails(row.details)}</Text> : null}
        </Card>
      ))}
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => load(page + 1, false)}
          style={styles.more}
        >
          <Text style={styles.moreText}>{loading ? "Loading…" : "Load more"}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  note: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { color: Colors.text, fontFamily: Font.bold, fontSize: 13 },
  chipTextOn: { color: Colors.green },
  time: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 12 },
  line: { color: Colors.text, fontFamily: Font.bold, fontSize: 16, marginTop: 4 },
  details: { color: Colors.textDim, fontFamily: Font.medium, fontSize: 14, marginTop: 4, lineHeight: 20 },
  more: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moreText: { color: Colors.text, fontFamily: Font.bold, fontSize: 15 },
});
