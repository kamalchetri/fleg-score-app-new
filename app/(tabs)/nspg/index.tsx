import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton, Screen, Txt } from "@/components/kit";
import { PublicMatchCard } from "@/components/nspg/PublicMatchCard";
import { PublicHeader } from "@/components/nspg/PublicHeader";
import { NspgBrand } from "@/components/nspg/NspgBrand";
import { getLiveMatches, listNspgSports, type NspgSport, type Fixture } from "@/lib/nspg-live";
import { Colors, Radius, Spacing, Type } from "@/lib/theme";

export default function NspgHub() {
  const [sports, setSports] = useState<NspgSport[]>([]);
  const [live, setLive] = useState<Fixture[]>([]);
  useEffect(() => { void Promise.all([listNspgSports(), getLiveMatches()]).then(([s, m]) => { setSports(s); setLive(m); }); }, []);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PublicHeader />
        <Txt variant="labelCaps" color={Colors.primary}>NAGALAND STATE & PARA GAMES</Txt>
        <Txt variant="displayHero">NSPG 2026</Txt>
        <View style={styles.hero}>
          <NspgBrand tone="light" compact />
          <View style={styles.heroTop}>
            <MaterialCommunityIcons name="trophy" size={18} color={Colors.onPrimary} />
            <Txt variant="labelCaps" color={Colors.onPrimary} style={styles.heroCompetition}>
              2–14 NOV · CHÜMOUKEDIMA & DIMAPUR
            </Txt>
          </View>
          <Txt variant="headlineSm" color={Colors.onPrimary}>National multi-sport competition</Txt>
          <Txt variant="bodySm" color={Colors.onPrimary} style={styles.heroMeta}>
            Nagaland · 17 districts · 14 sports
          </Txt>
          {live.length > 0 ? (
            <Pressable style={styles.heroLive} onPress={() => router.push("/(tabs)/live" as never)}>
              <View style={styles.heroLiveDot} />
              <Txt variant="labelCaps" color={Colors.primary}>{live.length} MATCHES LIVE</Txt>
            </Pressable>
          ) : null}
        </View>
        {live.length > 0 ? <><View style={styles.sectionHead}><Txt variant="headlineSm">Live now</Txt><Txt variant="labelCaps" color={Colors.danger}>● ON AIR</Txt></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>{live.map((m) => <View key={m.id} style={styles.liveCard}><PublicMatchCard fixture={m} onPress={() => router.push(`/(tabs)/live/${m.id}` as never)} /></View>)}</ScrollView></> : null}
        <View style={styles.sectionHead}><Txt variant="headlineSm">Sports</Txt><Txt variant="bodySm" color={Colors.textDim}>2026 programme</Txt></View>
        <View style={styles.grid}>{sports.map((sport) => <SportCard key={sport.slug} sport={sport} />)}</View>
        <View style={styles.actionStack}>
          <PrimaryButton label="Athletes & analytics" icon="account-star-outline" onPress={() => router.push("/(tabs)/nspg/athletes" as never)} />
          <PrimaryButton label="View medal tally" icon="medal-outline" onPress={() => router.push("/(tabs)/nspg/medals" as never)} />
        </View>
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
  hero: { backgroundColor: Colors.primary, borderRadius: Radius.xl, gap: Spacing.sm, padding: Spacing.lg },
  heroTop: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.sm },
  heroCompetition: { flex: 1, flexWrap: "wrap" },
  heroMeta: { opacity: 0.75 },
  heroLive: { alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.onPrimary, borderRadius: Radius.pill, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  heroLiveDot: { backgroundColor: Colors.primary, borderRadius: 4, height: 8, width: 8 },
  sectionHead: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  sport: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg, width: "47%" },
  icon: { alignItems: "center", backgroundColor: Colors.surface3, borderRadius: Radius.pill, height: 44, justifyContent: "center", width: 44 },
  actionStack: { gap: Spacing.sm },
});
