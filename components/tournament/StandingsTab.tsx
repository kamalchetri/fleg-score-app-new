// Standings tab — league / groups categories only. Computed on read via
// the pure standings engine (lib/formats/standings.ts). Never persisted.
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/lib/theme";
import { Card, EmptyState } from "@/components/ui";
import { useHub } from "./HubContext";
import {
  computeStandings,
  standingsConfigForSport,
} from "@/lib/formats/standings";
import { toStandingsMatches } from "@/lib/formats/db-mapping";
import type { HubStage } from "@/lib/queries";

export function StandingsTab({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { data } = useHub();

  const cfg = useMemo(
    () => standingsConfigForSport((data.tournament.sport_config ?? {}) as { table_points?: { win: number; draw: number; loss: number } }),
    [data.tournament.sport_config],
  );

  const leagueStages = data.stages.filter((s) => s.stage_type === "league");
  const groupStages = data.stages.filter((s) => s.stage_type === "group");
  const stageToCategory = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of data.stages) m.set(s.id, s.category_id);
    return m;
  }, [data.stages]);

  const renderable = (s: HubStage) =>
    data.categories.find((c) => c.id === s.category_id);

  const showDraws = cfg.drawsAllowed;

  if (leagueStages.length === 0 && groupStages.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        <EmptyState
          title="No standings yet"
          body="Generate fixtures first — standings appear once any match finishes."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {leagueStages.map((s) => {
        const cat = renderable(s);
        const matches = data.matches.filter((m) => m.stage_id === s.id);
        const ids = data.entrants
          .filter((e) => e.category_id === s.category_id && e.status === "approved")
          .map((e) => e.id);
        return (
          <View key={s.id} style={styles.section}>
            <Text style={styles.title}>{cat?.name ?? s.name} — League</Text>
            <StandingsTable
              rows={computeStandings(
                toStandingsMatches(matches),
                ids.map((id) => ({ id, name: data.entrants.find((e) => e.id === id)?.display_name ?? id })),
                cfg,
              )}
              showDraws={showDraws}
            />
          </View>
        );
      })}

      {groupStages.map((s) => {
        const cat = renderable(s);
        const cfg = (s.config ?? {}) as { entrant_ids?: string[]; advance_per_group?: number };
        const ids = cfg.entrant_ids ?? [];
        const matches = data.matches.filter((m) => m.stage_id === s.id);
        return (
          <View key={s.id} style={styles.section}>
            <Text style={styles.title}>
              {cat?.name ?? s.name} — Group {s.name}
            </Text>
            <StandingsTable
              rows={computeStandings(
                toStandingsMatches(matches),
                ids.map((id) => ({ id, name: data.entrants.find((e) => e.id === id)?.display_name ?? id })),
                standingsConfigForSport((data.tournament.sport_config ?? {}) as { table_points?: { win: number; draw: number; loss: number } }),
              )}
              showDraws={showDraws}
              qualifyCount={cfg.advance_per_group ?? 2}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

function StandingsTable({
  rows,
  showDraws,
  qualifyCount,
}: {
  rows: ReturnType<typeof computeStandings>;
  showDraws: boolean;
  qualifyCount?: number;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No data" body="Standings will appear once matches are scored." />;
  }
  return (
    <Card style={{ padding: 0 }}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.rank]}>#</Text>
        <Text style={[styles.cell, styles.name]}>Entrant</Text>
        <Text style={[styles.cell, styles.num]}>P</Text>
        <Text style={[styles.cell, styles.num]}>W</Text>
        {showDraws ? <Text style={[styles.cell, styles.num]}>D</Text> : null}
        <Text style={[styles.cell, styles.num]}>L</Text>
        <Text style={[styles.cell, styles.num]}>+/-</Text>
        <Text style={[styles.cell, styles.num, styles.pts]}>Pts</Text>
      </View>
      {rows.map((r) => (
        <View
          key={r.entrantId}
          style={[
            styles.row,
            qualifyCount != null && r.rank <= qualifyCount && styles.qualifyRow,
          ]}
        >
          <Text style={[styles.cell, styles.rank, { color: Colors.textDim }]}>{r.rank}</Text>
          <Text style={[styles.cell, styles.name]} numberOfLines={1}>{r.name}</Text>
          <Text style={[styles.cell, styles.num]}>{r.played}</Text>
          <Text style={[styles.cell, styles.num]}>{r.won}</Text>
          {showDraws ? <Text style={[styles.cell, styles.num]}>{r.drawn}</Text> : null}
          <Text style={[styles.cell, styles.num]}>{r.lost}</Text>
          <Text style={[styles.cell, styles.num, { color: r.diff >= 0 ? Colors.green : Colors.red }]}>
            {r.diff > 0 ? `+${r.diff}` : r.diff}
          </Text>
          <Text style={[styles.cell, styles.num, styles.pts]}>{r.points}</Text>
        </View>
      ))}
      {qualifyCount != null ? (
        <Text style={styles.legend}>Top {qualifyCount} qualify for knockout.</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  qualifyRow: { backgroundColor: Colors.greenDim },
  cell: { color: Colors.text, fontSize: 13, fontVariant: ["tabular-nums"] },
  rank: { width: 28, fontWeight: "700" },
  name: { flex: 1, fontWeight: "600" },
  num: { width: 36, textAlign: "right" },
  pts: { color: Colors.green, fontWeight: "800", width: 44 },
  legend: {
    color: Colors.textFaint,
    fontSize: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontStyle: "italic",
  },
});
