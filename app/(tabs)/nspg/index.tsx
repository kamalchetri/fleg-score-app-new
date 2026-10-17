import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeroCard, PrimaryButton, Screen, Txt } from "@/components/kit";
import { PublicMatchCard } from "@/components/nspg/PublicMatchCard";
import { getLiveMatches, listNspgSports, type NspgSport, type Fixture } from "@/lib/nspg-live";
import { Colors, Radius, Spacing, Type } from "@/lib/theme";

export default function NspgHub() {
  const [sports, setSports] = useState<NspgSport[]>([]);
  const [live, setLive] = useState<Fixture[]>([]);
  useEffect(() => { void Promise.all([listNspgSports(), getLiveMatches()]).then(([s, m]) => { setSports(s); setLive(m); }); }, []);
  const hero = live[0];
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="labelCaps" color={Colors.primary}>NAGALAND STATE & PARA GAMES</Txt>
        <Txt variant="displayHero">NSPG 2026</Txt>
        <HeroCard
          competition="2–14 NOV · CHÜMOUKEDIMA & DIMAPUR"
          home={hero?.sideA.name ?? "17 districts"}
          away={hero?.sideB.name ?? "9 disciplines"}
          homeScore={hero?.sideA.score ?? "—"}
          awayScore={hero?.sideB.score ?? "—"}
          clock={hero?.clock ?? "UPCOMING"}
          onPress={hero ? () => router.push(`/(tabs)/live/${hero.id}` as never) : undefined}
        />
        {live.length > 0 ? <><Txt variant="headlineSm">Live now</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>{live.map((m) => <View key={m.id} style={styles.liveCard}><PublicMatchCard fixture={m} onPress={() => router.push(`/(tabs)/live/${m.id}` as never)} /></View>)}</ScrollView></> : null}
        <View style={styles.sectionHead}><Txt variant="headlineSm">Sports</Txt><Txt variant="bodySm" color={Colors.textDim}>2026 programme</Txt></View>
        <View style={styles.grid}>{sports.map((sport) => <SportCard key={sport.slug} sport={sport} />)}</View>
        <PrimaryButton label="View medal tally" icon="medal-outline" onPress={() => router.push("/(tabs)/nspg/medals" as never)} />
      </ScrollView>
    </Screen>
  );
}

function SportCard({ sport }: { sport: NspgSport }) {
  return <Pressable style={styles.sport} onPress={() => router.push(`/(tabs)/nspg/${sport.slug}` as never)}><View style={styles.icon}><MaterialCommunityIcons name={sport.icon as never} size={24} color={Colors.primary} /></View><Txt variant="headlineSm">{sport.name}</Txt><Txt variant="labelPill" color={sport.liveCount ? Colors.danger : Colors.textDim}>{sport.liveCount ? `${sport.liveCount} LIVE` : `${sport.todayCount} TODAY`}</Txt></Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl },
  liveRow: { gap: Spacing.md }, liveCard: { width: 320 },
  sectionHead: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  sport: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg, width: "47%" },
  icon: { alignItems: "center", backgroundColor: Colors.surface3, borderRadius: Radius.pill, height: 44, justifyContent: "center", width: 44 },
});
