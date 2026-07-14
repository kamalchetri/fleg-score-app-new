// App-WP2: tournament hub. Tabs (Entrants · Fixtures · Standings · Schedule
// · Settings) gated by staff membership — non-staff users see the read-only
// summary (the same screen they got pre-WP2).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchHub, isStaff } from "@/lib/queries";
import { formatDateRange } from "@/lib/format";
import { Colors, Spacing } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Screen } from "@/components/ui";
import { HubProvider, useHub, type HubContextValue } from "@/components/tournament/HubContext";
import { Tabs, type HubTab } from "@/components/tournament/Tabs";
import { EntrantsTab } from "@/components/tournament/EntrantsTab";
import { FixturesTab } from "@/components/tournament/FixturesTab";
import { StandingsTab } from "@/components/tournament/StandingsTab";
import { ScheduleTab } from "@/components/tournament/ScheduleTab";
import { SettingsTab } from "@/components/tournament/SettingsTab";

type Gate = "loading" | "denied" | "staff" | "public";

export default function TournamentHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate, setGate] = useState<Gate>("loading");
  const [data, setData] = useState<HubContextValue["data"] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const d = await fetchHub(id);
    if (!d) {
      setGate("denied");
      return;
    }
    setData(d);
  }, [id]);

  const loadWithGate = useCallback(async () => {
    if (!id) return;
    try {
      const d = await fetchHub(id);
      if (!d) {
        setGate("denied");
        return;
      }
      setData(d);
      const staff = await isStaff(id);
      setGate(staff ? "staff" : "public");
    } catch {
      setGate("denied");
    }
  }, [id]);

  useEffect(() => {
    loadWithGate().catch(() => setGate("denied"));
  }, [loadWithGate]);

  useFocusEffect(
    useCallback(() => {
      // Re-check staff on focus so a freshly invited co-organizer sees the hub.
      if (gate === "staff" || gate === "public") loadWithGate().catch(() => {});
    }, [gate, loadWithGate]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (gate === "loading" || !data) {
    return (
      <Screen>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (gate === "denied") {
    return (
      <Screen>
        <EmptyState title="Tournament not found" body="It may be unpublished or archived." />
      </Screen>
    );
  }
  if (gate === "public") {
    return <PublicSummary data={data} onRefresh={onRefresh} refreshing={refreshing} openWeb={() => Linking.openURL(`https://www.fleg.in/dashboard/t/${data.tournament.id}`)} />;
  }

  return <StaffHub data={data} refresh={refresh} />;
}

function PublicSummary({
  data,
  refreshing,
  onRefresh,
  openWeb,
}: {
  data: HubContextValue["data"];
  refreshing: boolean;
  onRefresh: () => void;
  openWeb: () => void;
}) {
  const live = data.matches.filter((m) => m.status === "live");
  const rest = data.matches.filter((m) => m.status !== "live");
  const nameById = useMemo(() => new Map(data.entrants.map((e) => [e.id, e.display_name])), [data.entrants]);
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{data.tournament.name}</Text>
            <Badge status={data.tournament.status} />
          </View>
          <Text style={styles.meta}>
            {data.tournament.sport} · {formatDateRange(data.tournament.starts_at, data.tournament.ends_at)}
            {data.tournament.venue_name ? ` · ${data.tournament.venue_name}` : ""}
            {data.tournament.city ? `, ${data.tournament.city}` : ""}
          </Text>
          <Text style={[styles.meta, { marginTop: Spacing.sm }]}>
            Management tools (entrants, fixtures, schedule) open once you're added as staff on the web dashboard.
          </Text>
          <Button label="Open web dashboard" variant="ghost" onPress={openWeb} />
        </Card>
        {live.length > 0 ? <Text style={styles.section}>Live now</Text> : null}
        {live.map((m) => (
          <PublicMatchCard key={m.id} m={m} nameById={nameById} />
        ))}
        <Text style={styles.section}>Matches</Text>
        {rest.length === 0 ? (
          <EmptyState title="No matches yet" />
        ) : (
          rest.map((m) => <PublicMatchCard key={m.id} m={m} nameById={nameById} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function PublicMatchCard({
  m,
  nameById,
}: {
  m: HubContextValue["data"]["matches"][number];
  nameById: Map<string, string>;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.teams} numberOfLines={1}>
          {(m.entrant_a ? nameById.get(m.entrant_a) ?? "TBD" : "TBD") +
            " vs " +
            (m.entrant_b ? nameById.get(m.entrant_b) ?? "TBD" : "TBD")}
        </Text>
        <Badge status={m.status} />
      </View>
    </Card>
  );
}

function StaffHub({ data, refresh }: { data: HubContextValue["data"]; refresh: () => Promise<void> }) {
  const [tab, setTab] = useState<HubTab>("entrants");
  const [refreshing, setRefreshing] = useState(false);

  const ctx = useMemo<HubContextValue>(() => {
    const entrantNameById = new Map<string, string>();
    for (const e of data.entrants) entrantNameById.set(e.id, e.display_name);
    return { tournamentId: data.tournament.id, data, refresh, entrantNameById };
  }, [data, refresh]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <HubProvider value={ctx}>
      <Screen>
        <View style={styles.stickyHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {data.tournament.name}
            </Text>
            <Badge status={data.tournament.status} />
          </View>
          <Tabs active={tab} onChange={setTab} />
        </View>
        {tab === "entrants" ? (
          <EntrantsTab refreshing={refreshing} onRefresh={onRefresh} />
        ) : tab === "fixtures" ? (
          <FixturesTab refreshing={refreshing} onRefresh={onRefresh} onTab={setTab} />
        ) : tab === "standings" ? (
          <StandingsTab refreshing={refreshing} onRefresh={onRefresh} />
        ) : tab === "schedule" ? (
          <ScheduleTab refreshing={refreshing} onRefresh={onRefresh} />
        ) : (
          <SettingsTab refreshing={refreshing} onRefresh={onRefresh} />
        )}
      </Screen>
    </HubProvider>
  );
}

const styles = StyleSheet.create({
  stickyHeader: { backgroundColor: Colors.bg },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  name: { color: Colors.text, fontSize: 18, fontWeight: "800", flex: 1 },
  meta: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.xs },
  section: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  teams: { color: Colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
});
