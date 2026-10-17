import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { scoreParts } from "@/lib/queries";
import { useHomeFeed } from "@/lib/home-feed";
import { usePickTallies } from "@/lib/picks";
import { PickEntry, PickSheet, type PickTarget } from "@/components/PickSheet";
import { listFeaturedEvents, type EventSummary } from "@/lib/events-live";
import {
  BottomNav,
  Crest,
  FixtureCard,
  IconButton,
  LiveHeroCard,
  Screen,
  SectionHeader,
  SportPill,
  Txt,
} from "@/components/kit";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [sport, setSport] = useState("all");
  const [pick, setPick] = useState<PickTarget | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<EventSummary[]>([]);
  useEffect(() => { void listFeaturedEvents().then(setFeaturedEvents); }, []);
  const feed = useHomeFeed(sport);
  const pickIds = useMemo(
    () => [...feed.live, ...feed.fixtures].map((m) => m.id),
    [feed.live, feed.fixtures],
  );
  const tallies = usePickTallies(pickIds);

  const hero = feed.live[0];
  // When nothing is live, surface the most recent result in the hero slot.
  const heroResult = !hero ? feed.results[0] : undefined;

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={require("../assets/fleg-score-logo-white.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Txt variant="labelCaps" color={Colors.primary}>
              FLEG SCORE
            </Txt>
            <Txt variant="headlineSm">Home</Txt>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IconButton icon="magnify" onPress={() => router.replace("/events")} />
          <IconButton icon="bell-outline" onPress={() => {}} />
          <IconButton
            icon="account"
            bg={Colors.primary}
            color={Colors.onPrimary}
            size={36}
            onPress={() => router.replace("/profile")}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Greeting */}
        <Txt variant="bodySm" color={Colors.textDim}>
          {greeting()} 👋
        </Txt>

        {/* Expressive headline */}
        <View style={{ marginTop: -2 }}>
          <Txt variant="headlineLg" color={Colors.text}>
            Choose your
          </Txt>
          <Txt variant="headlineLg" color={Colors.primary} style={styles.italic}>
            Favourite game
          </Txt>
        </View>

        {/* Sport pills — derived from what's actually published */}
        {feed.sports.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            <SportPill
              label="All"
              icon="star-four-points"
              active={sport === "all"}
              onPress={() => setSport("all")}
            />
            {feed.sports.map((s) => (
              <SportPill
                key={s.key}
                label={s.label}
                icon={s.icon}
                active={sport === s.key}
                onPress={() => setSport(s.key)}
              />
            ))}
          </ScrollView>
        )}

        {feed.loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : feed.error ? (
          <View style={styles.center}>
            <Txt variant="bodyMd" color={Colors.red}>
              {feed.error}
            </Txt>
            <Txt variant="bodySm" color={Colors.textDim}>
              Pull down to retry.
            </Txt>
          </View>
        ) : (
          <>
            {/* Top Events — live hero (or latest result when nothing is live) */}
            <SectionHeader title="Top Events" live={!!hero} onViewAll={() => router.replace("/events")} />
            {hero ? (
              <LiveHeroCard
                competition={hero.tournament?.name ?? "Match"}
                home={hero.a?.display_name ?? "TBD"}
                away={hero.b?.display_name ?? "TBD"}
                homeScore={scoreParts(hero.score).home}
                awayScore={scoreParts(hero.score).away}
                clock="LIVE"
                onPress={() => router.push(`/live/${hero.id}`)}
              />
            ) : heroResult ? (
              <LiveHeroCard
                competition={heroResult.tournament?.name ?? "Match"}
                home={heroResult.a?.display_name ?? "TBD"}
                away={heroResult.b?.display_name ?? "TBD"}
                homeScore={scoreParts(heroResult.score).home}
                awayScore={scoreParts(heroResult.score).away}
                clock="FULL TIME"
                onPress={() => router.push(`/live/${heroResult.id}`)}
              />
            ) : (
              <EmptyRow text="No live matches right now." />
            )}
            {hero ? (
              <PickEntry
                total={tallies[hero.id]?.total ?? 0}
                onPick={() =>
                  setPick({
                    id: hero.id,
                    home: hero.a?.display_name ?? "TBD",
                    away: hero.b?.display_name ?? "TBD",
                    status: hero.status,
                    startedAt: hero.started_at,
                  })
                }
              />
            ) : null}

            {/* Fixtures */}
            <SectionHeader title="Fixtures" onViewAll={() => router.replace("/events")} />
            {feed.fixtures.length > 0 ? (
              <View style={{ gap: 12 }}>
                {feed.fixtures.slice(0, 8).map((m) => (
                  <FixtureCard
                    key={m.id}
                    home={m.a?.display_name ?? "TBD"}
                    away={m.b?.display_name ?? "TBD"}
                    status={m.status}
                    meta={fixtureMeta(m.tournament?.name, m.scheduled_at, m.category?.name)}
                    onPress={() => router.push(`/live/${m.id}`)}
                    footer={
                      <PickEntry
                        total={tallies[m.id]?.total ?? 0}
                        onPick={() =>
                          setPick({
                            id: m.id,
                            home: m.a?.display_name ?? "TBD",
                            away: m.b?.display_name ?? "TBD",
                            status: m.status,
                            startedAt: m.started_at,
                          })
                        }
                      />
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyRow text="No upcoming fixtures yet." />
            )}

            {featuredEvents.length > 0 ? <><SectionHeader title="Discover events" onViewAll={() => router.replace("/(tabs)/discover" as never)} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{featuredEvents.slice(0, 4).map((event) => <Pressable key={event.slug} style={styles.eventTile} onPress={() => event.isNspg ? router.push("/(tabs)/nspg" as never) : router.push(`/(tabs)/discover/${event.slug}` as never)}><Txt variant="labelCaps" color={Colors.primary}>{event.kind.toUpperCase()}</Txt><Txt variant="bodyLg" numberOfLines={2}>{event.title}</Txt><Txt variant="bodySm" color={Colors.textDim}>{event.city ?? "Nagaland"}</Txt></Pressable>)}</ScrollView></> : null}

            {/* Tournaments */}
            {feed.tournaments.length > 0 && (
              <>
                <SectionHeader title="Tournaments" onViewAll={() => router.replace("/events")} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14, paddingVertical: 2 }}
                >
                  {feed.tournaments.map((t) => (
                    <Pressable
                      key={t.id}
                      style={{ alignItems: "center", gap: 6, width: 68 }}
                      onPress={() => router.push(`/tournament/${t.id}`)}
                    >
                      <Crest name={t.name} size={52} />
                      <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>
                        {t.name}
                      </Txt>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </ScrollView>

      <PickSheet target={pick} onClose={() => setPick(null)} />
      <BottomNav active="home" />
    </Screen>
  );
}

function fixtureMeta(
  tournament: string | undefined,
  scheduledAt: string | null,
  category: string | undefined,
): string {
  const when = scheduledAt ? formatDateTime(scheduledAt) : category;
  return [tournament, when].filter(Boolean).join(" · ");
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={Colors.textDim} />
      <Txt variant="bodySm" color={Colors.textDim}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.margin,
    paddingVertical: 12,
  },
  logo: { width: 34, height: 34 },
  body: { paddingHorizontal: Spacing.margin, paddingBottom: 120, gap: Spacing.lg },
  italic: { fontStyle: "italic" },
  center: { paddingVertical: 40, alignItems: "center", gap: 6 },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderStyle: "dashed",
  },
  eventTile: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: 18, borderWidth: 1, gap: 6, padding: 14, width: 220 },
});
