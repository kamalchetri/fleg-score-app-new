import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getMedalists, type Medalist } from "@/lib/nspg-live";
import { getAthleteByRegId } from "@/lib/athlete-live";
import { PublicHeader } from "@/components/nspg/PublicHeader";
import { EmptyState, Screen } from "@/components/ui";
import { PrimaryButton, Txt } from "@/components/kit";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function AthletesDirectory() {
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [featured, setFeatured] = useState<Medalist[]>([]);
  useEffect(() => { void getMedalists().then(setFeatured); }, []);
  const records = useMemo(() => featured.filter((row) => `${row.name} ${row.regId} ${row.district} ${row.sport}`.toLowerCase().includes(query.trim().toLowerCase())), [featured, query]);
  async function openSearch() {
    const key = query.trim();
    if (!key) return;
    const exact = await getAthleteByRegId(key);
    if (exact) { setNotFound(false); router.push(`/athlete/${exact.regId}` as never); } else setNotFound(true);
  }
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <PublicHeader title="Athlete records & analytics" />
    <Txt variant="labelCaps" color={Colors.primary}>NSPG 2026 · ATHLETE CENTRE</Txt>
    <Txt variant="displayHero">Athletes</Txt>
    <Txt variant="bodyMd" color={Colors.textDim}>Explore published competition records, medals, rankings, match history, FLEG XP, and sport-specific performance trends.</Txt>
    <View style={styles.searchRow}><TextInput value={query} onChangeText={(value) => { setQuery(value); setNotFound(false); }} placeholder="Search name or Reg ID" placeholderTextColor={Colors.textDim} autoCapitalize="characters" style={styles.input} onSubmitEditing={() => void openSearch()} /><Pressable style={styles.searchButton} onPress={() => void openSearch()}><MaterialCommunityIcons name="magnify" size={22} color={Colors.onPrimary} /></Pressable></View>
    {notFound ? <EmptyState title="Athlete not found" body="Check the published registration ID and try again." /> : null}
    <View style={styles.feature}><Txt variant="headlineSm">Featured records</Txt><Txt variant="bodySm" color={Colors.textDim}>Tap a card for the full athlete dashboard.</Txt>{records.map((row) => <AthleteCard key={row.regId} row={row} />)}{!records.length && !notFound ? <Txt variant="bodyMd" color={Colors.textDim}>No published athletes match that search.</Txt> : null}</View>
    <PrimaryButton label="Open medal tally" icon="medal-outline" onPress={() => router.push("/(tabs)/nspg/medals" as never)} />
  </ScrollView></Screen>;
}

function AthleteCard({ row }: { row: Medalist }) {
  const color = row.medal === "gold" ? Colors.gold : row.medal === "silver" ? Colors.silver : Colors.bronze;
  return <Pressable style={styles.card} onPress={() => router.push(`/athlete/${row.regId}` as never)}><View style={[styles.avatar, { backgroundColor: `${color}22` }]}><Txt variant="headlineLg" color={color}>{row.name.slice(0, 1)}</Txt></View><View style={styles.cardText}><Txt variant="bodyLg">{row.name}</Txt><Txt variant="bodySm" color={Colors.textDim}>{row.regId} · {row.district}</Txt><Txt variant="bodySm" color={Colors.textDim}>{row.sport} · {row.event}</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textDim} /></Pressable>;
}

const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl }, searchRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm }, input: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.md, borderWidth: 1, color: Colors.text, flex: 1, fontFamily: "PlusJakartaSans_500Medium", fontSize: 16, height: 52, paddingHorizontal: Spacing.md }, searchButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.md, height: 52, justifyContent: "center", width: 52 }, feature: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg }, card: { alignItems: "center", borderTopColor: Colors.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.md, paddingVertical: Spacing.md }, avatar: { alignItems: "center", borderRadius: Radius.pill, height: 48, justifyContent: "center", width: 48 }, cardText: { flex: 1, gap: 3 } });
