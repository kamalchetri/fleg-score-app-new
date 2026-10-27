import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton, Screen, Txt } from "@/components/kit";
import { PublicMatchCard } from "@/components/nspg/PublicMatchCard";
import { PublicHeader } from "@/components/nspg/PublicHeader";
import { NspgBrand } from "@/components/nspg/NspgBrand";
import {
  getLiveMatches, getNspgParaGroup, listNspgDistricts, listNspgSports,
  type NspgSport, type Fixture,
} from "@/lib/nspg-live";
import type { NspgDiscipline } from "@/lib/nspg-programme";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function NspgHub() {
  const [sports, setSports] = useState<NspgSport[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [para, setPara] = useState<NspgDiscipline | null>(null);
  const [live, setLive] = useState<Fixture[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [allSports, allDistricts, paraGroup, liveMatches] = await Promise.all([
        listNspgSports(), listNspgDistricts(), getNspgParaGroup(), getLiveMatches(),
      ]);
      setSports(allSports);
      setDistricts(allDistricts);
      setPara(paraGroup);
      setLive(liveMatches);
    } catch (e) {
      setSports([]);
      setDistricts([]);
      setPara(null);
      setLive([]);
      setError(e instanceof Error ? e.message : "Unable to load the NSPG programme.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  const visibleDistricts = useMemo(
    () => districts.filter((district) => district.toLowerCase().includes(query.trim().toLowerCase())),
    [districts, query],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
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
            Nagaland · {districts.length} districts · {sports.length} sports
          </Txt>
          {live.length > 0 ? (
            <Pressable style={styles.heroLive} onPress={() => router.push("/(tabs)/live" as never)}>
              <View style={styles.heroLiveDot} />
              <Txt variant="labelCaps" color={Colors.primary}>{live.length} MATCHES LIVE</Txt>
            </Pressable>
          ) : null}
        </View>

        {loading ? <Txt variant="bodyMd" color={Colors.textDim}>Loading NSPG programme from Supabase…</Txt> : null}
        {error ? (
          <View style={styles.errorCard}>
            <Txt variant="bodyMd" color={Colors.danger}>{error}</Txt>
            <PrimaryButton label="Retry loading programme" icon="refresh" onPress={() => void refresh()} />
          </View>
        ) : null}

        {live.length > 0 ? (
          <>
            <View style={styles.sectionHead}><Txt variant="headlineSm">Live now</Txt><Txt variant="labelCaps" color={Colors.danger}>● ON AIR</Txt></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
              {live.map((match) => <View key={match.id} style={styles.liveCard}>
                <PublicMatchCard fixture={match} onPress={() => router.push(`/(tabs)/live/${match.id}` as never)} />
              </View>)}
            </ScrollView>
          </>
        ) : null}

        {!error && !loading ? (
          <>
            <View style={styles.sectionHead}>
              <Txt variant="headlineSm">Sports</Txt>
              <Txt variant="bodySm" color={Colors.textDim}>{sports.length} from Supabase</Txt>
            </View>
            <View style={styles.grid}>{sports.map((sport) => <SportCard key={sport.slug} sport={sport} />)}</View>
            {para ? (
              <Pressable style={styles.paraCard} onPress={() => router.push("/(tabs)/nspg/para" as never)}>
                <MaterialCommunityIcons name="wheelchair-accessibility" color={Colors.primary} size={24} />
                <View style={{ flex: 1 }}>
                  <Txt variant="headlineSm">{para.name}</Txt>
                  <Txt variant="bodySm" color={Colors.textDim}>{para.categories.length} event categories · Separate programme</Txt>
                </View>
                <MaterialCommunityIcons name="chevron-right" color={Colors.textDim} size={22} />
              </Pressable>
            ) : null}

            <View style={styles.sectionHead}>
              <Txt variant="headlineSm">Districts</Txt>
              <Txt variant="bodySm" color={Colors.textDim}>{districts.length} districts</Txt>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search districts"
              placeholderTextColor={Colors.textDim}
              accessibilityLabel="Search districts"
              style={styles.searchInput}
            />
            <View style={styles.districtGrid}>
              {visibleDistricts.map((district) => (
                <View key={district} style={styles.districtChip}><Txt variant="bodySm">{district}</Txt></View>
              ))}
            </View>
            {visibleDistricts.length === 0 ? <Txt variant="bodySm" color={Colors.textDim}>No matching districts.</Txt> : null}
          </>
        ) : null}
        <View style={styles.actionStack}>
          <PrimaryButton label="Athletes & analytics" icon="account-star-outline" onPress={() => router.push("/(tabs)/nspg/athletes" as never)} />
          <PrimaryButton label="View medal tally" icon="medal-outline" onPress={() => router.push("/(tabs)/nspg/medals" as never)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SportCard({ sport }: { sport: NspgSport }) {
  return <Pressable style={styles.sport} onPress={() => router.push(`/(tabs)/nspg/${sport.slug}` as never)}>
    <View style={styles.icon}><MaterialCommunityIcons name={sport.icon as never} size={24} color={Colors.primary} /></View>
    <Txt variant="headlineSm">{sport.name}</Txt>
    <Txt variant="labelPill" color={sport.liveCount ? Colors.danger : Colors.textDim}>
      {sport.liveCount ? `${sport.liveCount} LIVE` : `${sport.categoryCount ?? 0} CATEGORIES`}
    </Txt>
  </Pressable>;
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
  paraCard: { alignItems: "center", backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, flexDirection: "row", gap: Spacing.md, padding: Spacing.lg },
  searchInput: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.md, borderWidth: 1, color: Colors.text, fontSize: 15, paddingHorizontal: Spacing.md, height: 46 },
  districtGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  districtChip: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  actionStack: { gap: Spacing.sm },
  errorCard: { backgroundColor: Colors.surface1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
});
