import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { listEvents, type EventKind, type EventSummary } from "@/lib/events-live";
import { Screen, StatusPill, Txt } from "@/components/kit";

const FILTERS: { key: EventKind | "all"; label: string }[] = [
  { key: "all", label: "All" }, { key: "tournament", label: "Tournaments" },
  { key: "run", label: "Runs" }, { key: "clinic", label: "Clinics" }, { key: "fundraiser", label: "Fundraisers" },
];

export default function Discover() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [kind, setKind] = useState<EventKind | "all">("all");
  const [query, setQuery] = useState("");
  useEffect(() => { void listEvents(kind === "all" ? undefined : kind).then(setEvents); }, [kind]);
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return events.filter((event) => !q || [event.title, event.city, event.sport, event.organiser].filter(Boolean).join(" ").toLowerCase().includes(q)); }, [events, query]);
  return <Screen><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Txt variant="labelCaps" color={Colors.primary}>DISCOVER & COMPETE</Txt><Txt variant="displayHero">Events</Txt>
    <View style={styles.search}><MaterialCommunityIcons name="magnify" size={20} color={Colors.textDim} /><TextInput value={query} onChangeText={setQuery} placeholder="Search events" placeholderTextColor={Colors.textDim} style={styles.input} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((filter) => <Pressable key={filter.key} onPress={() => setKind(filter.key)} style={[styles.filter, kind === filter.key && styles.filterOn]}><Txt variant="labelPill" color={kind === filter.key ? Colors.onPrimary : Colors.textDim}>{filter.label}</Txt></Pressable>)}</ScrollView>
    <View style={styles.list}>{visible.map((event) => <EventCard key={event.slug} event={event} />)}{visible.length === 0 ? <Txt variant="bodyMd" color={Colors.textDim}>No events match your search.</Txt> : null}</View>
  </ScrollView></Screen>;
}

function EventCard({ event }: { event: EventSummary }) {
  const status = event.status === "registration_open" ? "open" : event.status === "live" ? "live" : event.status === "past" ? "completed" : "scheduled";
  const date = event.startDate ? new Date(event.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date to be announced";
  return <Pressable style={styles.card} onPress={() => event.isNspg ? router.push("/(tabs)/nspg" as never) : router.push(`/(tabs)/discover/${event.slug}` as never)}>
    {event.bannerUrl ? <Image source={{ uri: event.bannerUrl }} style={styles.banner} /> : <View style={styles.bannerFallback}><MaterialCommunityIcons name={event.kind === "run" ? "run" : "trophy-outline"} size={30} color={Colors.primary} /></View>}
    <View style={styles.cardBody}><View style={styles.row}><Txt variant="labelCaps" color={Colors.primary}>{event.kind.toUpperCase()}{event.sport ? ` · ${event.sport.toUpperCase()}` : ""}</Txt><StatusPill status={status} /></View><Txt variant="headlineSm">{event.title}</Txt><Txt variant="bodySm" color={Colors.textDim}>{[date, event.city, event.venue].filter(Boolean).join(" · ")}</Txt><View style={styles.row}><Txt variant="bodySm" color={Colors.textDim}>{event.organiser ?? "FLEG"}</Txt><Txt variant="labelPill" color={event.paid ? Colors.primary : Colors.text}>{event.paid && event.priceFrom ? `FROM ₹${event.priceFrom}` : "FREE"}</Txt></View></View>
  </Pressable>;
}

const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: 120 }, search: { alignItems: "center", backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.pill, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 14 }, input: { color: Colors.text, flex: 1, fontFamily: "PlusJakartaSans_500Medium", height: 48 }, filters: { gap: 8 }, filter: { backgroundColor: Colors.surface2, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10 }, filterOn: { backgroundColor: Colors.primary }, list: { gap: Spacing.md }, card: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" }, banner: { height: 130, width: "100%" }, bannerFallback: { alignItems: "center", backgroundColor: Colors.surface2, height: 110, justifyContent: "center" }, cardBody: { gap: 8, padding: Spacing.lg }, row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 } });
