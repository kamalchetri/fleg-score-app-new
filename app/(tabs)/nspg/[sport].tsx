import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PublicMatchCard } from "@/components/nspg/PublicMatchCard";
import { Screen, Txt } from "@/components/kit";
import {
  getSportFixtures, getStandings, listNspgCategories, listNspgSports, getNspgParaGroup,
  type Fixture, type Standings,
} from "@/lib/nspg-live";
import type { NspgEventCategory } from "@/lib/nspg-programme";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function SportScreen() {
  const { sport = "" } = useLocalSearchParams<{ sport?: string }>();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<Standings | null>(null);
  const [categories, setCategories] = useState<NspgEventCategory[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"fixtures" | "standings" | "results">("fixtures");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    setQuery("");
    void Promise.all([
      getSportFixtures(sport), getStandings(sport), listNspgSports(),
      listNspgCategories(sport), getNspgParaGroup(),
    ]).then(([f, s, all, cats, para]) => {
      if (!active) return;
      setFixtures(f);
      setStandings(s);
      setCategories(cats);
      setName(sport === "para" ? para?.name ?? "" : all.find((item) => item.slug === sport)?.name ?? "");
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load sport details.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sport, refreshKey]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase())),
    [categories, query],
  );
  const visible = fixtures.filter((fixture) =>
    (selected === null || fixture.category === selected)
    && (tab === "results" ? fixture.status === "final" : tab === "fixtures" ? fixture.status !== "final" : true),
  );

  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRefreshKey((key) => key + 1)} />}>
    <Txt variant="labelCaps" color={Colors.primary}>NSPG SPORT</Txt>
    <Txt variant="displayHero">{name || (loading ? "Loading…" : sport)}</Txt>
    {error ? <Txt variant="bodyMd" color={Colors.danger}>{error}</Txt> : null}
    {!error && !loading && !name ? <Txt variant="bodyMd" color={Colors.textDim}>Discipline not found in the NSPG programme.</Txt> : null}
    {!error && !loading && name ? <>
      <Txt variant="headlineSm">Event categories ({categories.length})</Txt>
      <TextInput
        value={query} onChangeText={setQuery} style={styles.searchInput}
        placeholder="Search event categories" placeholderTextColor={Colors.textDim}
        accessibilityLabel="Search event categories"
      />
      <View style={styles.categories}>
        <Pressable style={[styles.chip, selected === null && styles.chipSelected]} onPress={() => setSelected(null)}>
          <Txt variant="bodySm" color={selected === null ? Colors.onPrimary : Colors.text}>All categories</Txt>
        </Pressable>
        {filteredCategories.map((category) => (
          <Pressable key={category.id}
            onPress={() => setSelected(selected === category.name ? null : category.name)}
            style={[styles.chip, selected === category.name && styles.chipSelected]}>
            <Txt variant="bodySm" color={selected === category.name ? Colors.onPrimary : Colors.text}>
              {category.name}
            </Txt>
          </Pressable>
        ))}
      </View>
      {filteredCategories.length === 0
        ? <Txt variant="bodySm" color={Colors.textDim}>No categories match this search.</Txt> : null}
      <View style={styles.segment}>
        {(["fixtures", "standings", "results"] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)}
            style={[styles.segmentItem, tab === item && styles.segmentOn]}>
            <Txt variant="labelPill" color={tab === item ? Colors.onPrimary : Colors.textDim}>{item.toUpperCase()}</Txt>
          </Pressable>
        ))}
      </View>
      {tab !== "standings" ? (visible.length
        ? <FixtureList fixtures={visible} />
        : <Txt variant="bodyMd" color={Colors.textDim}>
          {tab === "fixtures" ? "No published fixtures for this selection yet." : "No published results for this selection yet."}
        </Txt>) : <StandingsView standings={standings} fixtures={visible} />}
    </> : null}
  </ScrollView></Screen>;
}

function FixtureList({ fixtures }: { fixtures: Fixture[] }) {
  const grouped = fixtures.reduce<Record<string, Fixture[]>>((acc, fixture) => {
    (acc[fixture.roundLabel] ??= []).push(fixture);
    return acc;
  }, {});
  return <>{Object.entries(grouped).map(([round, rows]) =>
    <View key={round} style={styles.group}>
      <Txt variant="headlineSm">{round}</Txt>
      {rows.map((match) => <PublicMatchCard key={match.id} fixture={match}
        onPress={() => router.push(`/(tabs)/live/${match.id}` as never)} />)}
    </View>)}</>;
}
function StandingsView({ standings, fixtures }: { standings: Standings | null; fixtures: Fixture[] }) {
  if (!standings) return <Txt variant="bodyMd" color={Colors.textDim}>Standings will appear once official results are published.</Txt>;
  if (standings.format === "knockout") return <FixtureList fixtures={fixtures} />;
  return <>{standings.groups.map((group) => <View key={group.groupLabel} style={styles.table}>
    <Txt variant="headlineSm">{group.groupLabel}</Txt>
    <View style={styles.tableHead}><Txt variant="labelCaps" color={Colors.textDim}>TEAM</Txt><Txt variant="labelCaps" color={Colors.textDim}>P W D L PTS</Txt></View>
    {group.rows.map((row) => <View key={row.team} style={[styles.row, row.rank <= group.qualifyCount && styles.qualify]}>
      <Txt variant="bodyMd">{row.rank}. {row.team}</Txt>
      <Txt variant="bodyMd" color={row.rank <= group.qualifyCount ? Colors.primary : Colors.textDim}>{row.played} {row.won} {row.drawn} {row.lost} {row.points}</Txt>
    </View>)}
  </View>)}</>;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl },
  categories: { gap: Spacing.sm, flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.hairline },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  searchInput: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.md, borderWidth: 1, color: Colors.text, fontSize: 15, paddingHorizontal: Spacing.md, height: 46 },
  segment: { backgroundColor: Colors.surface2, borderRadius: Radius.pill, flexDirection: "row", padding: 4 },
  segmentItem: { alignItems: "center", borderRadius: Radius.pill, flex: 1, paddingVertical: Spacing.sm },
  segmentOn: { backgroundColor: Colors.primary },
  group: { gap: Spacing.md },
  table: { backgroundColor: Colors.surface1, borderRadius: Radius.xl, gap: Spacing.sm, padding: Spacing.lg },
  tableHead: { flexDirection: "row", justifyContent: "space-between" },
  row: { borderBottomColor: Colors.hairline, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.sm },
  qualify: { backgroundColor: Colors.greenDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm },
});
