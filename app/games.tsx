import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/lib/theme";
import { formatDateRange, formatDateTime } from "@/lib/format";
import {
  fetchMyMatches,
  fetchMyTournaments,
  type MyMatch,
  type MyTournament,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import {
  BottomNav,
  FixtureCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  TournamentCard,
  Txt,
} from "@/components/kit";

export default function Games() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MyMatch[]>([]);
  const [tournaments, setTournaments] = useState<MyTournament[]>([]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!uid) {
        setLoading(false);
        return;
      }
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const [m, t] = await Promise.all([fetchMyMatches(uid), fetchMyTournaments(uid)]);
        setMatches(m);
        setTournaments(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your games.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Refresh when returning to the tab (a match may have gone live).
  useFocusEffect(
    useCallback(() => {
      if (!loading) void load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const empty = !loading && matches.length === 0 && tournaments.length === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Txt variant="headlineMd">My Games</Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          Matches you referee and tournaments you run
        </Txt>
        <Pressable onPress={() => router.push("/organize/earnings")}>
          <Txt variant="labelPill" color={Colors.primary}>
            Earnings & payouts
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Txt variant="bodyMd" color={Colors.red}>
              {error}
            </Txt>
            <Txt variant="bodySm" color={Colors.textDim}>
              Pull down to retry.
            </Txt>
          </View>
        ) : empty ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="whistle-outline" size={40} color={Colors.textDim} />
            <Txt variant="headlineSm" align="center">
              No games yet
            </Txt>
            <Txt variant="bodySm" color={Colors.textDim} align="center">
              Matches assigned to you as a referee, and tournaments you organise, show up here.
            </Txt>
            <View style={{ height: 8 }} />
            <PrimaryButton
              label="Create a tournament"
              icon="plus"
              onPress={() => router.push("/tournament/new")}
            />
          </View>
        ) : (
          <>
            {matches.length > 0 && (
              <>
                <SectionHeader title="Matches to score" />
                <View style={{ gap: 12 }}>
                  {matches.map((m) => (
                    <FixtureCard
                      key={m.id}
                      home={m.a?.display_name ?? "TBD"}
                      away={m.b?.display_name ?? "TBD"}
                      status={m.status}
                      meta={[m.tournament?.name, m.court, m.scheduled_at ? formatDateTime(m.scheduled_at) : m.category?.name]
                        .filter(Boolean)
                        .join(" · ")}
                      onPress={() => router.push(`/match/${m.id}`)}
                    />
                  ))}
                </View>
              </>
            )}

            {tournaments.length > 0 && (
              <>
                <SectionHeader title="My tournaments" onViewAll={() => router.push("/tournament/new")} />
                <View style={{ gap: 12 }}>
                  {tournaments.map((t) =>
                    t.tournament ? (
                      <TournamentCard
                        key={t.tournament.id}
                        name={t.tournament.name}
                        sport={t.tournament.sport}
                        status={t.tournament.status}
                        meta={[roleLabel(t.staff_role), formatDateRange(t.tournament.starts_at, t.tournament.ends_at)]
                          .filter(Boolean)
                          .join(" · ")}
                        onPress={() => router.push(`/tournament/${t.tournament!.id}`)}
                      />
                    ) : null,
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <BottomNav active="games" />
    </Screen>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: "Owner",
    co_organizer: "Co-organiser",
    referee: "Referee",
    scorekeeper: "Scorekeeper",
  };
  return map[role] ?? role;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.margin, paddingTop: 12, paddingBottom: 8, gap: 2 },
  body: { paddingHorizontal: Spacing.margin, paddingBottom: 120, gap: Spacing.lg, flexGrow: 1 },
  center: { paddingVertical: 60, alignItems: "center", gap: 6 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 20 },
});
