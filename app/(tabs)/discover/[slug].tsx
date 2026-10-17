import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { getEvent, startRegistration, type EventDetail } from "@/lib/events-live";
import { useAuth } from "@/lib/auth-context";
import { PrimaryButton, Screen, Txt } from "@/components/kit";

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (slug) void getEvent(Array.isArray(slug) ? slug[0] : slug).then(setEvent); }, [slug]);
  const closed = !!event?.registrationCloseAt && new Date(event.registrationCloseAt).getTime() <= Date.now();
  const total = useMemo(() => event?.categories.filter((c) => selected.includes(c.id)).reduce((sum, c) => sum + c.price, 0) ?? 0, [event, selected]);
  if (!event) return <Screen><View style={styles.center}><Txt variant="bodyMd" color={Colors.textDim}>Loading event…</Txt></View></Screen>;
  const detail = event;
  async function register() {
    if (detail.requiresLogin && !session) { Alert.alert("Sign in required", "Sign in to register for this event."); return; }
    if (closed || (detail.categories.length > 0 && selected.length === 0)) return;
    setBusy(true); try { const result = await startRegistration(detail.slug, selected); Alert.alert(result.mode === "free" ? "Registration confirmed" : "Checkout ready", result.mode === "free" ? `Reference ${result.submissionRef}` : `Order ${result.orderId}`); } catch (e) { Alert.alert("Registration unavailable", e instanceof Error ? e.message : "Please try again later."); } finally { setBusy(false); }
  }
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Txt variant="labelPill" color={Colors.primary}>← BACK TO EVENTS</Txt></Pressable>
    <Txt variant="labelCaps" color={event.status === "live" ? Colors.live : Colors.primary}>{event.status.replaceAll("_", " ").toUpperCase()}</Txt>
    <Txt variant="displayHero">{event.title}</Txt>
    <Txt variant="bodyMd" color={Colors.textDim}>{[event.startDate ? new Date(event.startDate).toLocaleDateString("en-IN", { dateStyle: "long" }) : null, event.venue, event.city].filter(Boolean).join(" · ")}</Txt>
    {event.description ? <Txt variant="bodyMd">{event.description}</Txt> : null}
    {event.organiser ? <View style={styles.panel}><Txt variant="labelCaps" color={Colors.textDim}>ORGANISED BY</Txt><Txt variant="headlineSm">{event.organiser}</Txt></View> : null}
    {event.rules ? <View style={styles.panel}><Txt variant="labelCaps" color={Colors.textDim}>RULES</Txt><Txt variant="bodyMd">{event.rules}</Txt></View> : null}
    {event.categories.length > 0 ? <View style={styles.panel}><Txt variant="headlineSm">Choose category</Txt>{event.categories.map((category) => { const on = selected.includes(category.id); return <Pressable key={category.id} onPress={() => setSelected((current) => on ? current.filter((id) => id !== category.id) : [...current, category.id])} style={[styles.category, on && styles.categoryOn]}><Txt variant="bodyMd">{category.name}</Txt><Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.primary}>{category.price ? `₹${category.price}` : "FREE"}</Txt></Pressable>; })}</View> : null}
    {event.importantNotes ? <Txt variant="bodySm" color={Colors.textDim}>{event.importantNotes}</Txt> : null}
    <PrimaryButton label={closed ? "Registration closed" : total > 0 ? `Register · ₹${total}` : "Register free"} disabled={closed || busy || (event.categories.length > 0 && selected.length === 0)} onPress={() => void register()} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: 120 }, center: { alignItems: "center", flex: 1, justifyContent: "center" }, panel: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg }, category: { alignItems: "center", backgroundColor: Colors.surface2, borderRadius: Radius.md, flexDirection: "row", justifyContent: "space-between", padding: Spacing.md }, categoryOn: { backgroundColor: Colors.primary } });
