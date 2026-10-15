import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Palette, Radius, Spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { scoreParts, type FeedMatch } from "@/lib/queries";
import { sportIcon, sportLabel } from "@/lib/home-feed";
import {
  dayLabel,
  eventOnDay,
  monthLabel,
  shiftWeek,
  useEventsFeed,
  weekDays,
  type EventSegment,
  type FillInfo,
  type PublicEvent,
} from "@/lib/events-feed";
import { formatInr, formatPrizePool } from "@/lib/money";
import { usePickTallies } from "@/lib/picks";
import {
  BottomNav,
  Crest,
  PrimaryButton,
  Screen,
  SportPill,
  StatusPill,
  Txt,
} from "@/components/kit";
import { PickEntry, PickSheet, type PickTarget } from "@/components/PickSheet";

const SEGMENTS: { key: EventSegment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tournaments", label: "Tournaments" },
  { key: "register", label: "Register" },
  { key: "live", label: "Live" },
];

export default function Events() {
  const feed = useEventsFeed();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<EventSegment>("all");
  const [sport, setSport] = useState("all");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [pick, setPick] = useState<PickTarget | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const liveIds = useMemo(
    () => Object.values(feed.liveByTournament).map((m) => m.id),
    [feed.liveByTournament],
  );
  const tallies = usePickTallies(liveIds);

  const dayEvents = useMemo(
    () => feed.events.filter((event) => eventOnDay(event, selected)),
    [feed.events, selected],
  );

  const counts = useMemo(() => {
    const live = dayEvents.filter(
      (event) => event.status === "live" || (event.source === "tournament" && feed.liveByTournament[event.id]),
    ).length;
    return {
      all: dayEvents.length,
      tournaments: dayEvents.filter((event) => event.source === "tournament").length,
      register: dayEvents.filter((event) => event.source === "form" || event.source === "workshop").length,
      live,
    };
  }, [dayEvents, feed.liveByTournament]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dayEvents.filter((event) => {
      if (segment === "tournaments" && event.source !== "tournament") return false;
      if (segment === "register" && event.source !== "form" && event.source !== "workshop") return false;
      if (segment === "live") {
        const isLive = event.status === "live" || !!feed.liveByTournament[event.id];
        if (!isLive) return false;
      }
      if (sport === "workshops" && event.source !== "workshop") return false;
      if (sport !== "all" && sport !== "workshops" && (event.source === "workshop" || event.sport !== sport)) {
        return false;
      }
      if (!q) return true;
      const hay = [event.title, event.city, event.state, event.sport, event.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [dayEvents, segment, sport, query, feed.liveByTournament]);

  const daysWithEvents = useMemo(() => {
    const marks = new Set<string>();
    for (const day of days) {
      if (feed.events.some((event) => eventOnDay(event, day))) marks.add(day.toDateString());
    }
    return marks;
  }, [days, feed.events]);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Txt variant="labelCaps" color={Colors.primary}>
            DISCOVER & COMPETE
          </Txt>
          <Txt variant="headlineMd">Events</Txt>
        </View>
        <Pressable
          onPress={() => setAnchor(new Date())}
          style={styles.calBtn}
          accessibilityLabel="Jump to this week"
        >
          <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tournaments, workshops, runs..."
          placeholderTextColor={Colors.textFaint}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textDim} onPress={() => setQuery("")} />
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments} style={{ flexGrow: 0 }}>
        {SEGMENTS.map((item) => {
          const on = segment === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSegment(item.key)}
              style={[styles.segment, { backgroundColor: on ? Colors.primary : Colors.surface2 }]}
            >
              {item.key === "live" && !on ? <View style={styles.livePip} /> : null}
              <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.textDim}>
                {item.label}
              </Txt>
              <View style={[styles.count, { backgroundColor: on ? "rgba(11,12,16,0.15)" : Colors.surface3 }]}>
                <Txt variant="labelCaps" color={on ? Colors.onPrimary : Colors.textDim} style={{ fontSize: 10 }}>
                  {counts[item.key]}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.weekHead}>
        <Pressable onPress={() => setAnchor((d) => shiftWeek(d, -1))} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.textDim} />
        </Pressable>
        <Txt variant="labelCaps" color={Colors.textDim}>
          SCHEDULE WEEK
        </Txt>
        <Txt variant="labelCaps" color={Colors.primary} style={{ flex: 1, textAlign: "right" }}>
          {monthLabel(selected).toUpperCase()}
        </Txt>
        <Pressable onPress={() => setAnchor((d) => shiftWeek(d, 1))} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textDim} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week} style={{ flexGrow: 0 }}>
        {days.map((day) => {
          const on = day.toDateString() === selected.toDateString();
          const marked = daysWithEvents.has(day.toDateString());
          return (
            <Pressable
              key={day.toDateString()}
              onPress={() => setSelected(day)}
              style={[styles.day, on && styles.dayOn]}
            >
              <Txt variant="labelCaps" color={on ? Colors.onPrimary : Colors.textDim} style={{ fontSize: 10 }}>
                {dayLabel(day)}
              </Txt>
              <Txt variant="headlineSm" color={on ? Colors.onPrimary : Colors.text}>
                {day.getDate()}
              </Txt>
              {marked ? <View style={[styles.dayDot, { backgroundColor: on ? Colors.onPrimary : Colors.primary }]} /> : <View style={styles.dayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {feed.sports.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={{ flexGrow: 0 }}>
          <SportPill label="All" icon="star-four-points" active={sport === "all"} onPress={() => setSport("all")} />
          {feed.sports.map((s) => (
            <SportPill key={s.key} label={s.label} icon={s.icon} active={sport === s.key} onPress={() => setSport(s.key)} />
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={Colors.primary} />}
      >
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
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={Colors.textDim} />
            <Txt variant="bodySm" color={Colors.textDim}>
              {query ? "No events match your search." : "Nothing scheduled on this day."}
            </Txt>
          </View>
        ) : (
          visible.map((event) =>
            event.source === "workshop" ? (
              <WorkshopCard key={`workshop-${event.id}`} event={event} />
            ) : event.source === "form" ? (
              <RegistrationCard
                key={`form-${event.id}`}
                event={event}
                fill={feed.fills[event.id]}
                organizer={event.organizer_id ? feed.organizers[event.organizer_id] : undefined}
              />
            ) : (
              <TournamentEventCard
                key={`t-${event.id}`}
                event={event}
                live={feed.liveByTournament[event.id]}
                tallyTotal={feed.liveByTournament[event.id] ? tallies[feed.liveByTournament[event.id]!.id]?.total ?? 0 : 0}
                onPick={(target) => setPick(target)}
              />
            ),
          )
        )}

        <PrimaryButton label="Submit Event" icon="plus" onPress={() => router.push("/organize/new")} />
      </ScrollView>

      <PickSheet target={pick} onClose={() => setPick(null)} />
      <BottomNav active="events" />
    </Screen>
  );
}

function RegistrationCard({
  event,
  fill,
  organizer,
}: {
  event: PublicEvent;
  fill?: FillInfo;
  organizer?: string;
}) {
  const capacity = fill?.capacity ?? null;
  const registered = fill?.registered ?? 0;
  const ratio = capacity && capacity > 0 ? Math.min(1, registered / capacity) : 0;
  const left = capacity != null && capacity > 0 ? Math.max(0, capacity - registered) : null;
  const when = formatDateTime(event.starts_at ?? event.registration_closes_at);
  return (
    <View style={styles.card}>
      {event.banner_url ? (
        <Image source={{ uri: event.banner_url }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.bannerFallback]}>
          <MaterialCommunityIcons name={sportIcon(event.sport)} size={28} color={Colors.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <View style={styles.tag}>
            <Txt variant="labelCaps" color={Colors.primary}>
              {sportLabel(event.sport).toUpperCase()}
            </Txt>
          </View>
          <View style={[styles.price, { backgroundColor: event.fee == null || !event.is_paid ? Colors.surface3 : Colors.primary }]}>
            <Txt variant="labelPill" color={event.fee == null || !event.is_paid ? Colors.text : Colors.onPrimary}>
              {!event.is_paid || event.fee == null ? "FREE" : formatInr(event.fee)}
            </Txt>
          </View>
        </View>
        {organizer ? (
          <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>
            by {organizer}
          </Txt>
        ) : null}
        <Txt variant="headlineSm" numberOfLines={2}>
          {event.title}
        </Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          {[when, event.city].filter(Boolean).join(" · ")}
        </Txt>
        {capacity != null && capacity > 0 ? (
          <View style={{ gap: 6 }}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <Txt variant="bodySm" color={Colors.textDim}>
              {registered}/{capacity}
              {left != null ? ` · ${left} spots left` : ""}
            </Txt>
          </View>
        ) : null}
        <PrimaryButton label="Register" onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })} />
      </View>
    </View>
  );
}

function WorkshopCard({ event }: { event: PublicEvent }) {
  const when = formatDateTime(event.starts_at);
  const free = !event.is_paid || event.fee == null || event.fee === 0;
  const page = event.slug ? `https://www.fleg.in/workshops/${event.slug}` : null;
  return (
    <View style={styles.card}>
      {event.banner_url ? (
        <Image source={{ uri: event.banner_url }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.bannerFallback]}>
          <MaterialCommunityIcons name="account-group" size={28} color={Colors.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <View style={styles.tag}>
            <Txt variant="labelCaps" color={Colors.primary}>
              WORKSHOP
            </Txt>
          </View>
          <View style={[styles.price, { backgroundColor: free ? Colors.surface3 : Colors.primary }]}>
            <Txt variant="labelPill" color={free ? Colors.text : Colors.onPrimary}>
              {free ? "FREE" : formatInr(event.fee)}
            </Txt>
          </View>
        </View>
        <Txt variant="headlineSm" numberOfLines={2}>
          {event.title}
        </Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          {[when, event.city].filter(Boolean).join(" · ")}
        </Txt>
        <PrimaryButton
          label="Register on web"
          disabled={!page}
          onPress={() => {
            if (page) void Linking.openURL(page);
          }}
        />
      </View>
    </View>
  );
}

function TournamentEventCard({
  event,
  live,
  tallyTotal,
  onPick,
}: {
  event: PublicEvent;
  live?: FeedMatch;
  tallyTotal: number;
  onPick: (target: PickTarget) => void;
}) {
  const pill = live ? "live" : event.status === "completed" ? "completed" : "published";
  const parts = live ? scoreParts(live.score) : null;
  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Crest name={event.title} size={40} />
            <Txt variant="labelCaps" color={Colors.textDim} style={{ flex: 1 }} numberOfLines={1}>
              {`TOURNAMENT · ${sportLabel(event.sport).toUpperCase()}`}
            </Txt>
          </View>
          <StatusPill status={pill} />
        </View>
        <Txt variant="headlineSm" numberOfLines={2}>
          {event.title}
        </Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          {[event.city, event.prize_pool != null ? formatPrizePool(event.prize_pool) : null].filter(Boolean).join(" · ")}
        </Txt>
        {live && parts ? (
          <View style={styles.mini}>
            <Txt variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
              {live.a?.display_name ?? "TBD"}
            </Txt>
            <Txt variant="labelPill" color={Colors.primary}>
              {parts.home} – {parts.away}
            </Txt>
            <Txt variant="bodySm" numberOfLines={1} align="right" style={{ flex: 1 }}>
              {live.b?.display_name ?? "TBD"}
            </Txt>
          </View>
        ) : null}
        {live ? (
          <PickEntry
            total={tallyTotal}
            onPick={() =>
              onPick({
                id: live.id,
                home: live.a?.display_name ?? "TBD",
                away: live.b?.display_name ?? "TBD",
                status: live.status,
                startedAt: live.started_at,
              })
            }
          />
        ) : null}
        <PrimaryButton label="View" onPress={() => router.push(`/tournament/${event.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: Spacing.margin,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  segments: { gap: 8, paddingHorizontal: Spacing.margin, paddingVertical: 12 },
  segment: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, borderRadius: Radius.pill },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  livePip: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  weekHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.margin,
  },
  week: { gap: 8, paddingHorizontal: Spacing.margin, paddingVertical: 10 },
  day: {
    width: 52,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayOn: { backgroundColor: Colors.primary },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  pills: { gap: 8, paddingHorizontal: Spacing.margin, paddingBottom: 8 },
  body: { paddingHorizontal: Spacing.margin, paddingBottom: 120, gap: 14 },
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
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: "hidden",
  },
  banner: { width: "100%", height: 120 },
  bannerFallback: { backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: Spacing.lg, gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Colors.surface2 },
  price: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: Colors.primary },
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceLow,
  },
});
