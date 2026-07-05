import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { fetchMyMatches, fetchMyTournaments, type MyMatch, type MyTournament } from "@/lib/queries";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { Colors, Spacing } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Screen } from "@/components/ui";

export default function Home() {
  const { session } = useAuth();
  const [matches, setMatches] = useState<MyMatch[]>([]);
  const [tournaments, setTournaments] = useState<MyTournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const [m, t] = await Promise.all([
        fetchMyMatches(session.user.id),
        fetchMyTournaments(session.user.id),
      ]);
      setMatches(m);
      setTournaments(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data.");
    }
  }, [session]);

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const liveFirst = [...matches].sort((x, y) =>
    x.status === y.status ? 0 : x.status === "live" ? -1 : 1,
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.section}>My matches</Text>
        {liveFirst.length === 0 ? (
          <EmptyState
            title="No matches assigned"
            body="Matches appear here when an organizer assigns you as referee."
          />
        ) : (
          liveFirst.map((m) => (
            <Pressable key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.matchTeams} numberOfLines={1}>
                    {m.a?.display_name ?? "TBD"} vs {m.b?.display_name ?? "TBD"}
                  </Text>
                  <Badge status={m.status} />
                </View>
                <Text style={styles.meta}>
                  {m.tournament?.name} · {m.category?.name}
                </Text>
                <Text style={styles.meta}>
                  {m.court ? `${m.court} · ` : ""}
                  {formatDateTime(m.scheduled_at)}
                </Text>
                <Button label="Open scoring" onPress={() => router.push(`/match/${m.id}`)} />
              </Card>
            </Pressable>
          ))
        )}

        <Text style={styles.section}>My tournaments</Text>
        {tournaments.length === 0 ? (
          <EmptyState
            title="No tournaments"
            body="Tournaments you organize or staff appear here. Create tournaments at fleg.in."
          />
        ) : (
          tournaments.map((t) =>
            t.tournament ? (
              <Pressable
                key={t.tournament.id}
                onPress={() => router.push(`/tournament/${t.tournament!.id}`)}
              >
                <Card>
                  <View style={styles.rowBetween}>
                    <Text style={styles.tName} numberOfLines={1}>
                      {t.tournament.name}
                    </Text>
                    <Badge status={t.tournament.status} />
                  </View>
                  <Text style={styles.meta}>
                    {t.tournament.sport} · {t.staff_role.replace("_", "-")} ·{" "}
                    {formatDateRange(t.tournament.starts_at, t.tournament.ends_at)}
                  </Text>
                </Card>
              </Pressable>
            ) : null,
          )
        )}

        <Button label="Settings" variant="ghost" onPress={() => router.push("/settings")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  matchTeams: { color: Colors.text, fontSize: 16, fontWeight: "700", flex: 1 },
  tName: { color: Colors.text, fontSize: 16, fontWeight: "700", flex: 1 },
  meta: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.xs },
  error: { color: Colors.red, marginBottom: Spacing.md },
});
