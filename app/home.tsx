import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
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
import { listEvents, type EventSummary } from "@/lib/events-live";
import { useRole } from "@/lib/role";
import {
  BottomNav,
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
  const [eventCatalog, setEventCatalog] = useState<EventSummary[]>([]);
  const heroPulse = useRef(new Animated.Value(0)).current;
  const { canOrganise, canManageNspg } = useRole();
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [heroPulse]);
  useEffect(() => { void listEvents().then(setEventCatalog); }, []);
  const feed = useHomeFeed(sport);
  const pickIds = useMemo(
    () => [...feed.live, ...feed.fixtures].map((m) => m.id),
    [feed.live, feed.fixtures],
  );
  const tallies = usePickTallies(pickIds);

  const hero = feed.live[0];
  const topTournaments = useMemo(() => {
    return eventCatalog
      .filter((event) => isFreshEvent(event) && isTournamentLike(event))
      .sort((a, b) => tournamentPriority(b) - tournamentPriority(a))
      .slice(0, 4);
  }, [eventCatalog]);
  const topIds = useMemo(() => new Set(topTournaments.map((event) => event.slug)), [topTournaments]);
  const upcomingTournaments = useMemo(() => {
    return eventCatalog
      .filter((event) => isFreshEvent(event) && isTournamentLike(event) && !topIds.has(event.slug))
      .sort((a, b) => eventTime(a) - eventTime(b))
      .slice(0, 6);
  }, [eventCatalog, topIds]);
  const upcomingEvents = useMemo(() => {
    return eventCatalog
      .filter((event) => isFreshEvent(event) && !isTournamentLike(event) && event.status !== "live")
      .sort((a, b) => eventTime(a) - eventTime(b))
      .slice(0, 6);
  }, [eventCatalog]);

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <Image
            source={require("../assets/fleg-score-logo-white.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.brandText}>
            <Txt variant="labelCaps" color={Colors.primary}>FLEG SCORE</Txt>
            <Txt variant="bodySm" color={Colors.textDim}>Home</Txt>
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
        {/* Greeting + dashboard hero */}
        {canOrganise || canManageNspg ? <Pressable style={styles.adminShortcut} onPress={() => router.push("/organiser" as never)}><MaterialCommunityIcons name="shield-star-outline" size={18} color={Colors.primary} /><Txt variant="labelPill" color={Colors.text}>Admin · Organiser dashboard</Txt><MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textDim} /></Pressable> : null}
        <Txt variant="bodySm" color={Colors.textDim}>{greeting()} 👋</Txt>
        <View style={styles.welcomeHero}>
          <Animated.View
            style={[
              styles.heroHalo,
              {
                opacity: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                transform: [{ scale: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
              },
            ]}
          />
          <View style={styles.heroCopy}>
            <View style={styles.heroEyebrow}><MaterialCommunityIcons name="broadcast" size={14} color={Colors.onPrimary} /><Txt variant="labelCaps" color={Colors.onPrimary}>YOUR SPORTS HUB</Txt></View>
            <Txt variant="displayHero" color={Colors.onPrimary}>Play. Follow. Win.</Txt>
            <Txt variant="bodySm" color="rgba(11,12,16,0.72)" style={styles.heroDescription}>Live scores, tournaments and your next big moment — all in one place.</Txt>
            <View style={styles.heroActions}>
              <Pressable onPress={() => router.replace("/(tabs)/live" as never)} style={({ pressed }) => [styles.heroAction, { opacity: pressed ? 0.8 : 1 }]}>
                <MaterialCommunityIcons name="play-circle" size={17} color={Colors.onPrimary} />
                <Txt variant="labelPill" color={Colors.onPrimary}>Watch live</Txt>
              </Pressable>
              <Pressable onPress={() => router.replace("/events")} style={({ pressed }) => [styles.heroActionGhost, { opacity: pressed ? 0.72 : 1 }]}>
                <Txt variant="labelPill" color={Colors.onPrimary}>Explore events</Txt>
                <MaterialCommunityIcons name="arrow-right" size={17} color={Colors.onPrimary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="trophy-variant-outline" size={36} color={Colors.onPrimary} />
            <Txt variant="labelCaps" color={Colors.onPrimary}>FLEG</Txt>
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="broadcast" label="Live now" detail={hero ? "On air" : "No matches"} onPress={() => router.replace("/(tabs)/live" as never)} />
          <QuickAction icon="calendar-star" label="Events" detail={`${eventCatalog.length || "—"} to explore`} onPress={() => router.replace("/events")} />
          <QuickAction icon="trophy-outline" label="My games" detail="XP & picks" onPress={() => router.replace("/games")} />
        </View>

        {/* FLEG is also the place to launch a tournament and onboard its players. */}
        <View style={styles.creatorCard}>
          <View style={styles.creatorOrb}>
            <MaterialCommunityIcons name="trophy-variant-outline" size={30} color={Colors.onPrimary} />
          </View>
          <View style={styles.creatorCopy}>
            <Txt variant="labelCaps" color={Colors.primary}>BUILD WITH FLEG</Txt>
            <Txt variant="headlineSm">Create. Host. Score.</Txt>
            <Txt variant="bodySm" color={Colors.textDim}>Launch a beautiful tournament, collect entries, and run every fixture from one place.</Txt>
            <View style={styles.creatorActions}>
              <Pressable onPress={() => router.push("/tournament/new")} style={({ pressed }) => [styles.creatorAction, { opacity: pressed ? 0.72 : 1 }]}>
                <MaterialCommunityIcons name="plus" size={16} color={Colors.onPrimary} />
                <Txt variant="labelPill" color={Colors.onPrimary}>Create tournament</Txt>
              </Pressable>
              <Pressable onPress={() => router.push("/organize/new")} style={({ pressed }) => [styles.creatorActionGhost, { opacity: pressed ? 0.72 : 1 }]}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={Colors.primary} />
                <Txt variant="labelPill" color={Colors.primary}>Registration form</Txt>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Sport pills — derived from what's actually published */}
        {feed.sports.length > 0 && (
          <View style={styles.sportsBlock}>
          <View style={styles.inlineSectionTitle}><Txt variant="headlineSm">Explore sports</Txt><Txt variant="bodySm" color={Colors.textDim}>Tap to filter</Txt></View>
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
          </View>
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
            {/* Tournament discovery — past events never leak into these cards. */}
            <SectionHeader title="Top tournaments" onViewAll={() => router.replace("/events")} />
            {topTournaments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
                {topTournaments.map((event) => <TournamentPosterCard key={event.slug} event={event} />)}
              </ScrollView>
            ) : <EmptyRow text="No featured tournaments right now." />}

            <SectionHeader title="Upcoming tournaments" onViewAll={() => router.replace("/events")} />
            {upcomingTournaments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
                {upcomingTournaments.map((event) => <TournamentPosterCard key={event.slug} event={event} />)}
              </ScrollView>
            ) : <EmptyRow text="New tournament dates will appear here." />}

            {upcomingEvents.length > 0 ? <>
              <SectionHeader title="Upcoming on FLEG" onViewAll={() => router.replace("/events")} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
                {upcomingEvents.map((event) => <TournamentPosterCard key={event.slug} event={event} />)}
              </ScrollView>
            </> : null}

            {/* Live scoreboard — kept separate from tournament discovery. */}
            <SectionHeader title="Live now" live={!!hero} onViewAll={() => router.replace("/(tabs)/live" as never)} />
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
            ) : <EmptyRow text="No live matches right now." />}
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

function eventTime(event: EventSummary): number {
  const value = event.startDate ? Date.parse(event.startDate) : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function isTournamentLike(event: EventSummary): boolean {
  return event.kind === "tournament" || event.kind === "league";
}

/** Hide stale seed/live rows while still allowing multi-day live tournaments. */
function isFreshEvent(event: EventSummary): boolean {
  if (event.status === "past") return false;
  const start = eventTime(event);
  if (!Number.isFinite(start) || start === Number.MAX_SAFE_INTEGER) return true;
  if (event.status === "live") return Date.now() - start < 14 * 24 * 60 * 60 * 1000;
  return start >= Date.now() - 24 * 60 * 60 * 1000;
}

function tournamentPriority(event: EventSummary): number {
  if (event.isNspg) return 100;
  if (event.status === "live") return 80;
  if (event.status === "registration_open") return 60;
  return 40;
}

function eventPoster(event: EventSummary) {
  if (event.bannerUrl) return { uri: event.bannerUrl };
  if (event.slug === "coffee-run-2") return require("../assets/events/coffee-run.jpg");
  if (event.slug === "amateur-weekend-league-awl") return require("../assets/events/amateur-weekend-league.jpg");
  if (event.isNspg) return require("../assets/nspg/nspg-logo-color.jpg");
  if (event.kind === "run") return require("../assets/nspg/nagaland-athletics.png");
  return require("../assets/fleg-score-logo-white.png");
}

function eventStatusLabel(status: EventSummary["status"]): string {
  if (status === "registration_open") return "REGISTRATION OPEN";
  if (status === "live") return "LIVE NOW";
  return "UPCOMING";
}

function eventDateLabel(event: EventSummary): string {
  if (!event.startDate) return "DATE TO BE ANNOUNCED";
  return new Date(event.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

function TournamentPosterCard({ event }: { event: EventSummary }) {
  const open = () => event.isNspg
    ? router.push("/(tabs)/nspg" as never)
    : router.push(`/(tabs)/discover/${event.slug}` as never);
  const hasBanner = Boolean(event.bannerUrl || event.slug === "coffee-run-2" || event.slug === "amateur-weekend-league-awl");
  const posterMode = hasBanner ? "cover" : "contain";
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.tournamentCard, { opacity: pressed ? 0.9 : 1 }]}>
      <ImageBackground
        source={eventPoster(event)}
        resizeMode={posterMode}
        imageStyle={styles.posterImage}
        style={[styles.poster, event.isNspg && styles.nspgPoster]}
      >
        {hasBanner ? <View style={styles.posterShade} /> : null}
        <View style={styles.posterTop}>
          <View style={[styles.posterPill, !hasBanner && styles.posterPillLight]}><Txt variant="labelPill" color={hasBanner ? Colors.onPrimary : Colors.text}>{eventStatusLabel(event.status)}</Txt></View>
          {event.isNspg ? <View style={styles.nspgTag}><MaterialCommunityIcons name="trophy-outline" size={13} color={Colors.onPrimary} /><Txt variant="labelCaps" color={Colors.onPrimary}>NSPG 2026</Txt></View> : null}
        </View>
        {hasBanner ? <View style={styles.posterBottom}>
          <Txt variant="headlineSm" color={Colors.text} numberOfLines={2}>{event.title}</Txt>
          <Txt variant="bodySm" color="rgba(255,255,255,0.75)" numberOfLines={1}>{event.organiser ?? "FLEG SCORE"}</Txt>
        </View> : null}
      </ImageBackground>
      <View style={styles.tournamentMeta}>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="headlineSm" numberOfLines={2}>{event.title}</Txt>
          <Txt variant="labelCaps" color={Colors.textDim} numberOfLines={1}>{eventDateLabel(event)}</Txt>
          <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>{[event.city, event.venue].filter(Boolean).join(" · ") || "Multiple venues"}</Txt>
        </View>
        <View style={styles.pricePill}>
          <Txt variant="labelPill" color={event.paid ? Colors.primary : Colors.live}>{event.paid && event.priceFrom ? `₹${event.priceFrom}` : "FREE"}</Txt>
        </View>
      </View>
    </Pressable>
  );
}

function QuickAction({ icon, label, detail, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={styles.quickIcon}><MaterialCommunityIcons name={icon} size={18} color={Colors.primary} /></View>
      <Txt variant="labelPill" numberOfLines={1}>{label}</Txt>
      <Txt variant="labelCaps" color={Colors.textDim} numberOfLines={1}>{detail}</Txt>
    </Pressable>
  );
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
  logo: { width: 42, height: 28 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: { gap: 1 },
  body: { paddingHorizontal: Spacing.margin, paddingBottom: 120, gap: Spacing.lg },
  italic: { fontStyle: "italic" },
  center: { paddingVertical: 40, alignItems: "center", gap: 6 },
  welcomeHero: { backgroundColor: Colors.primary, borderRadius: 28, minHeight: 220, overflow: "hidden", padding: 20, position: "relative" },
  heroHalo: { position: "absolute", width: 220, height: 220, borderRadius: 110, right: -58, top: -72, backgroundColor: "rgba(255,255,255,0.19)", borderWidth: 24, borderColor: "rgba(11,12,16,0.07)" },
  heroCopy: { gap: 9, maxWidth: "78%" },
  heroEyebrow: { alignItems: "center", flexDirection: "row", gap: 6 },
  heroDescription: { maxWidth: 270 },
  heroActions: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 5 },
  heroAction: { alignItems: "center", backgroundColor: "rgba(11,12,16,0.14)", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  heroActionGhost: { alignItems: "center", borderColor: "rgba(11,12,16,0.22)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 11, paddingVertical: 8 },
  heroBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(11,12,16,0.12)", borderRadius: 22, borderWidth: 1, justifyContent: "center", paddingVertical: 12, position: "absolute", right: 18, top: 70, width: 62 },
  quickRow: { flexDirection: "row", gap: 9 },
  quickAction: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: 19, borderWidth: 1, flex: 1, gap: 5, minHeight: 96, padding: 11 },
  quickIcon: { alignItems: "center", backgroundColor: "rgba(206,242,2,0.12)", borderRadius: 12, height: 30, justifyContent: "center", width: 30 },
  creatorCard: { backgroundColor: Colors.surface1, borderColor: "rgba(206,242,2,0.32)", borderRadius: 24, borderWidth: 1, flexDirection: "row", gap: 14, overflow: "hidden", padding: 16, position: "relative" },
  creatorOrb: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 20, height: 58, justifyContent: "center", width: 58 },
  creatorCopy: { flex: 1, gap: 5 },
  creatorActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
  creatorAction: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  creatorActionGhost: { alignItems: "center", borderColor: "rgba(206,242,2,0.42)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  inlineSectionTitle: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  sportsBlock: { gap: 5 },
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
  cardRail: { gap: 14, paddingRight: 12 },
  tournamentCard: { width: 304, overflow: "hidden", borderRadius: 26, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(31,34,42,0.94)", shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  poster: { height: 184, justifyContent: "space-between", overflow: "hidden", backgroundColor: "#20232A" },
  nspgPoster: { backgroundColor: "#F3F5EE" },
  posterImage: {},
  posterShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,9,12,0.28)" },
  posterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  posterPill: { backgroundColor: "rgba(8,9,12,0.72)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  posterPillLight: { backgroundColor: "rgba(255,255,255,0.86)" },
  nspgTag: { alignItems: "center", backgroundColor: "rgba(11,12,16,0.86)", borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  posterBottom: { padding: 14, gap: 3 },
  tournamentMeta: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, paddingVertical: 15 },
  pricePill: { borderRadius: 999, backgroundColor: "rgba(206,242,2,0.13)", paddingHorizontal: 10, paddingVertical: 6 },
  adminShortcut: { alignItems: "center", backgroundColor: Colors.surface2, borderColor: Colors.primary, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
});
