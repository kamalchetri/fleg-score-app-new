import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { PublicMatchCard } from "@/components/nspg/PublicMatchCard";
import { Screen, Txt } from "@/components/kit";
import { getLiveMatches, listNspgSports, subscribeLive, type Fixture, type NspgSport } from "@/lib/nspg-live";
import { Colors, Spacing } from "@/lib/theme";

export default function LiveTab() {
  const [matches, setMatches] = useState<Fixture[]>([]); const [sports, setSports] = useState<NspgSport[]>([]);
  useEffect(() => { const load = () => { void Promise.all([getLiveMatches(), listNspgSports()]).then(([m, s]) => { setMatches(m); setSports(s); }); }; load(); return subscribeLive(load); }, []);
  return <Screen><ScrollView contentContainerStyle={styles.content}><Txt variant="labelCaps" color={Colors.danger}>● LIVE NOW</Txt><Txt variant="displayHero">Live</Txt>{matches.length === 0 ? <Txt variant="bodyLg" color={Colors.textDim}>No live matches right now.</Txt> : sports.map((sport) => { const rows = matches.filter((m) => m.sportSlug === sport.slug); return rows.length ? <View key={sport.slug} style={styles.group}><Txt variant="headlineSm">{sport.name}</Txt>{rows.map((m) => <PublicMatchCard key={m.id} fixture={m} onPress={() => router.push(`/(tabs)/live/${m.id}` as never)} />)}</View> : null; })}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl }, group: { gap: Spacing.md } });
