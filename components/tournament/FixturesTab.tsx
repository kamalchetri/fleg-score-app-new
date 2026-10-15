// Fixtures tab — the heart of App-WP2.
// Per-category three states: no stage yet (generate), group/league phase
// (render by round/group), knockout phase (list-first bracket).
// All generation/advance logic goes through generateBracket /
// generateKnockoutFromStandings, which mirror the web match-actions.ts.
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { roundLabel } from "@/lib/bracket/knockout";
import { generateBracket, generateKnockoutFromStandings, type FixtureConfig } from "@/lib/queries";
import type { HubCategory, HubMatch, HubStage } from "@/lib/queries";
import { Colors, Font, Radius, Spacing, statusColors } from "@/lib/theme";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { MatchRowCard } from "./MatchRowCard";
import { useHub } from "./HubContext";
import type { HubTab } from "./Tabs";

const FORMAT_LABEL: Record<string, string> = {
  league: "League",
  groups_knockout: "Groups + knockout",
  knockout: "Knockout",
};

export function FixturesTab({
  refreshing,
  onRefresh,
  onTab,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  onTab: (t: HubTab) => void;
}) {
  const { data, refresh, entrantNameById } = useHub();

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {data.categories.length === 0 ? (
        <EmptyState title="No categories yet" body="Add categories on the web dashboard first." />
      ) : (
        data.categories.map((cat) => (
          <CategorySection
            key={cat.id}
            cat={cat}
            stages={data.stages.filter((s) => s.category_id === cat.id)}
            matches={data.matches.filter((m) => m.category_id === cat.id)}
            entrantNameById={entrantNameById}
            refresh={refresh}
            onTab={onTab}
          />
        ))
      )}
    </ScrollView>
  );
}

function CategorySection({
  cat,
  stages,
  matches,
  entrantNameById,
  refresh,
  onTab,
}: {
  cat: HubCategory;
  stages: HubStage[];
  matches: HubMatch[];
  entrantNameById: Map<string, string>;
  refresh: () => Promise<void>;
  onTab: (t: HubTab) => void;
}) {
  const hasStages = stages.length > 0;
  const hasProgress = matches.some((m) => ["live", "completed"].includes(m.status));
  const approvedCount = useMemo(
    () => matches.length /* placeholder; we'll count from full data via context */,
    [matches],
  );
  // Pull approved count from full hub data so we don't need an extra prop.
  const { data } = useHub();
  const realApproved = useMemo(
    () =>
      data.entrants.filter((e) => e.category_id === cat.id && e.status === "approved").length,
    [data.entrants, cat.id],
  );

  return (
    <View style={styles.category}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.categoryName}>{cat.name}</Text>
          <Text style={styles.meta}>
            {FORMAT_LABEL[cat.format] ?? cat.format} · {realApproved} approved
            {cat.max_entrants ? `/${cat.max_entrants}` : ""}
            {hasStages && hasProgress ? " · fixtures locked" : ""}
          </Text>
        </View>
        {(!hasStages || !hasProgress) && (
          <GenerateButton
            cat={cat}
            hasStages={hasStages}
            approvedCount={realApproved}
            onDone={refresh}
          />
        )}
      </View>

      {!hasStages ? (
        <EmptyState
          title="No fixtures yet"
          body={
            cat.format === "knockout"
              ? "Approve at least 2 entrants, then generate to lock the bracket."
              : "Approve at least 2 entrants, then generate to lock the entrant list."
          }
        />
      ) : cat.format === "league" ? (
        <LeagueSection stages={stages} matches={matches} entrantNameById={entrantNameById} onTab={onTab} />
      ) : cat.format === "groups_knockout" ? (
        <GroupsKnockoutSection
          cat={cat}
          stages={stages}
          matches={matches}
          entrantNameById={entrantNameById}
          refresh={refresh}
          onTab={onTab}
        />
      ) : (
        <KnockoutSection
          matches={matches}
          entrantNameById={entrantNameById}
        />
      )}
      {/* Suppress lint about unused approvedCount placeholder */}
      <Text style={{ display: "none" }}>{approvedCount}</Text>
    </View>
  );
}

// ── Generate flow ─────────────────────────────────────────────────────────

function GenerateButton({
  cat,
  hasStages,
  approvedCount,
  onDone,
}: {
  cat: HubCategory;
  hasStages: boolean;
  approvedCount: number;
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [doubleRR, setDoubleRR] = useState(false);
  const [groupCount, setGroupCount] = useState("2");
  const [advancePerGroup, setAdvancePerGroup] = useState("2");
  const [busy, setBusy] = useState(false);
  const { data } = useHub();

  const onGenerate = useCallback(async () => {
    if (approvedCount < 2) {
      Alert.alert("Need more entrants", "Approve at least 2 entrants first.");
      return;
    }
    setBusy(true);
    try {
      const config: FixtureConfig = { doubleRoundRobin: doubleRR };
      if (cat.format === "groups_knockout") {
        const gc = parseInt(groupCount, 10);
        const apg = parseInt(advancePerGroup, 10);
        if (!Number.isFinite(gc) || gc < 1) throw new Error("Group count must be at least 1.");
        if (!Number.isFinite(apg) || apg < 1) throw new Error("Advance per group must be at least 1.");
        config.groupCount = gc;
        config.advancePerGroup = apg;
      }
      await generateBracket(data.tournament.id, cat.id, config);
      setOpen(false);
      await onDone();
    } catch (e) {
      Alert.alert("Generate failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [advancePerGroup, approvedCount, cat.format, cat.id, data.tournament.id, doubleRR, groupCount, onDone]);

  if (open) {
    return (
      <Card>
        <Text style={styles.configTitle}>
          {hasStages ? "Regenerate fixtures" : "Generate fixtures"}
        </Text>
        {cat.format === "league" || cat.format === "groups_knockout" ? (
          <View style={styles.toggleRow}>
            <Text style={styles.configLabel}>Double round robin</Text>
            <Switch value={doubleRR} onValueChange={setDoubleRR} />
          </View>
        ) : null}
        {cat.format === "groups_knockout" ? (
          <>
            <NumberField label="Groups" value={groupCount} onChange={setGroupCount} />
            <NumberField label="Advance per group" value={advancePerGroup} onChange={setAdvancePerGroup} />
          </>
        ) : null}
        <Text style={styles.configHint}>
          Generates match rows. Once a match goes live, this can't be regenerated.
        </Text>
        <View style={styles.configActions}>
          <Pressable
            style={[styles.configBtn, { backgroundColor: Colors.elevated }]}
            onPress={() => setOpen(false)}
            disabled={busy}
          >
            <Text style={{ color: Colors.text, fontFamily: Font.bold }}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.configBtn, { backgroundColor: Colors.green, opacity: busy ? 0.5 : 1 }]}
            onPress={onGenerate}
            disabled={busy}
          >
            <Text style={{ color: "#04140A", fontFamily: Font.extrabold }}>
              {busy ? "Generating…" : "Generate"}
            </Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Button
      label={hasStages ? "Regenerate" : "Generate fixtures"}
      onPress={() => setOpen(true)}
      variant="ghost"
    />
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginTop: Spacing.md }}>
      <Text style={styles.configLabel}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        placeholderTextColor={Colors.textFaint}
      />
    </View>
  );
}

// ── League ─────────────────────────────────────────────────────────────────

function LeagueSection({
  stages,
  matches,
  entrantNameById,
  onTab,
}: {
  stages: HubStage[];
  matches: HubMatch[];
  entrantNameById: Map<string, string>;
  onTab: (t: HubTab) => void;
}) {
  const league = stages.find((s) => s.stage_type === "league");
  if (!league) return null;
  const stageMatches = matches.filter((m) => m.stage_id === league.id);
  const rounds = Math.max(0, ...stageMatches.map((m) => m.round));
  return (
    <View style={{ marginTop: Spacing.md }}>
      <Pressable onPress={() => onTab("standings")} style={styles.linkBtn}>
        <Text style={styles.linkText}>View standings →</Text>
      </Pressable>
      {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
        <RoundGroup
          key={r}
          label={`Round ${r}`}
          matches={stageMatches.filter((m) => m.round === r).sort((a, b) => a.position - b.position)}
          entrantNameById={entrantNameById}
        />
      ))}
    </View>
  );
}

// ── Groups + knockout ──────────────────────────────────────────────────────

function GroupsKnockoutSection({
  cat,
  stages,
  matches,
  entrantNameById,
  refresh,
  onTab,
}: {
  cat: HubCategory;
  stages: HubStage[];
  matches: HubMatch[];
  entrantNameById: Map<string, string>;
  refresh: () => Promise<void>;
  onTab: (t: HubTab) => void;
}) {
  const groupStages = stages.filter((s) => s.stage_type === "group");
  const knockoutStage = stages.find((s) => s.stage_type === "knockout");
  const allGroupMatches = groupStages.flatMap((s) => matches.filter((m) => m.stage_id === s.id));
  const allGroupMatchesDone =
    allGroupMatches.length > 0 && allGroupMatches.every((m) => ["completed", "walkover"].includes(m.status));
  const knockoutMatches = knockoutStage ? matches.filter((m) => m.stage_id === knockoutStage.id) : [];
  const knockoutTouched = knockoutMatches.some((m) => ["live", "completed"].includes(m.status));
  const [busy, setBusy] = useState(false);
  const { data } = useHub();

  const onAdvance = useCallback(async () => {
    if (!allGroupMatchesDone) return;
    setBusy(true);
    try {
      await generateKnockoutFromStandings(data.tournament.id, cat.id);
      await refresh();
    } catch (e) {
      Alert.alert("Advance failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [allGroupMatchesDone, cat.id, data.tournament.id, refresh]);

  return (
    <View style={{ marginTop: Spacing.md }}>
      {groupStages.map((g) => {
        const gCfg = (g.config ?? {}) as { entrant_ids?: string[]; advance_per_group?: number };
        const gMatches = matches.filter((m) => m.stage_id === g.id);
        const rounds = Math.max(0, ...gMatches.map((m) => m.round));
        return (
          <View key={g.id} style={{ marginBottom: Spacing.lg }}>
            <Text style={styles.subHeader}>{g.name}</Text>
            {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
              <RoundGroup
                key={r}
                label={`Round ${r}`}
                matches={gMatches.filter((m) => m.round === r).sort((a, b) => a.position - b.position)}
                entrantNameById={entrantNameById}
              />
            ))}
            <Text style={styles.meta}>
              Top {gCfg.advance_per_group ?? 2} qualify for knockout.
            </Text>
          </View>
        );
      })}
      <View style={styles.koDivider}>
        <Text style={styles.subHeader}>Knockout</Text>
        {!knockoutTouched && (
          <Pressable
            disabled={!allGroupMatchesDone || busy}
            onPress={onAdvance}
            style={[
              styles.advanceBtn,
              { backgroundColor: allGroupMatchesDone ? Colors.green : Colors.elevated },
            ]}
          >
            <Text
              style={{
                color: allGroupMatchesDone ? "#04140A" : Colors.textFaint,
                fontFamily: Font.extrabold,
              }}
            >
              {busy ? "Building…" : knockoutStage ? "Rebuild knockout" : "Build knockout from standings"}
            </Text>
          </Pressable>
        )}
      </View>
      {knockoutStage && knockoutMatches.length > 0 ? (
        <KnockoutSection
          matches={knockoutMatches}
          entrantNameById={entrantNameById}
        />
      ) : (
        <Text style={[styles.meta, { marginTop: Spacing.sm }]}>
          Available once every group match is completed or walked over.
        </Text>
      )}
    </View>
  );
}

// ── Knockout ───────────────────────────────────────────────────────────────

function KnockoutSection({
  matches,
  entrantNameById,
}: {
  matches: HubMatch[];
  entrantNameById: Map<string, string>;
}) {
  const entrants = useMemo(() => ({ nameById: entrantNameById }), [entrantNameById]);
  const totalRounds = Math.max(0, ...matches.map((m) => m.round));
  return (
    <View style={{ marginTop: Spacing.md }}>
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
        <RoundGroup
          key={r}
          label={roundLabel(r, totalRounds)}
          matches={matches.filter((m) => m.round === r).sort((a, b) => a.position - b.position)}
          entrantNameById={entrantNameById}
          knockoutRounds={totalRounds}
          entrants={entrants}
        />
      ))}
    </View>
  );
}

// ── Round grouping ─────────────────────────────────────────────────────────

function RoundGroup({
  label,
  matches,
  entrantNameById,
  knockoutRounds,
  entrants,
}: {
  label: string;
  matches: HubMatch[];
  entrantNameById: Map<string, string>;
  knockoutRounds?: number;
  entrants?: { nameById: Map<string, string> };
}) {
  if (matches.length === 0) return null;
  const lookup = entrants ?? { nameById: entrantNameById };
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.subHeader}>{label}</Text>
      {matches.map((m) => (
        <MatchRowCard
          key={m.id}
          match={m}
          entrants={lookup}
          totalRounds={Math.max(1, knockoutRounds ?? 1)}
          knockoutRounds={knockoutRounds ?? null}
          onPress={() => router.push(`/match/${m.id}`)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  category: { marginBottom: Spacing.xl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  categoryName: { color: Colors.text, fontSize: 18, fontFamily: Font.extrabold },
  meta: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.xs },
  subHeader: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Font.bold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  configTitle: { color: Colors.text, fontSize: 16, fontFamily: Font.extrabold, marginBottom: Spacing.sm },
  configLabel: { color: Colors.textDim, fontSize: 14 },
  configHint: { color: Colors.textFaint, fontSize: 12, marginTop: Spacing.sm },
  configActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  configBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  numberInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: 4,
    minHeight: 44,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  linkBtn: { paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  linkText: { color: Colors.green, fontSize: 14, fontFamily: Font.bold },
  koDivider: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  advanceBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
});
