import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getMedalists, getMedalTally, type MedalRow, type Medalist } from "@/lib/nspg-live";
import { PrimaryButton, Screen, Txt } from "@/components/kit";
import { PublicHeader } from "@/components/nspg/PublicHeader";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function MedalTally() {
  const [rows, setRows] = useState<MedalRow[]>([]);
  const [medalists, setMedalists] = useState<Medalist[]>([]);
  useEffect(() => {
    void Promise.all([getMedalTally(), getMedalists()]).then(([tally, winners]) => {
      setRows(tally);
      setMedalists(winners);
    });
  }, []);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PublicHeader title="Medals & athlete records" />
        <Txt variant="labelCaps" color={Colors.primary}>NSPG 2026 · OFFICIAL RESULTS</Txt>
        <Txt variant="displayHero">Medal tally</Txt>
        <Txt variant="bodyMd" color={Colors.textDim}>District standings and published athlete results. Tap any athlete to open their record, ranking, history, and performance analytics.</Txt>
        <View style={styles.table}>
          {rows.length === 0 ? <Txt variant="bodyMd" color={Colors.textDim}>No official medal tally has been published yet.</Txt> : null}
          <View style={styles.head}><Txt variant="labelCaps" color={Colors.textDim}>DISTRICT</Txt><Txt variant="labelCaps" color={Colors.textDim}>G · S · B · TOTAL</Txt></View>
          {rows.map((row, i) => <View key={row.district} style={styles.row}><Txt variant="bodyLg">{i + 1}. {row.district}</Txt><View style={styles.medals}><Medal value={row.gold} color={Colors.gold} /><Medal value={row.silver} color={Colors.silver} /><Medal value={row.bronze} color={Colors.bronze} /><Txt variant="labelPill" color={Colors.primary}>{row.total}</Txt></View></View>)}
        </View>
        <View style={styles.sectionHead}><Txt variant="headlineSm">Featured medalists</Txt><Txt variant="labelCaps" color={Colors.textDim}>PUBLISHED</Txt></View>
        <View style={styles.winnerList}>{medalists.length === 0 ? <Txt variant="bodyMd" color={Colors.textDim}>No published medalists yet.</Txt> : null}{medalists.map((winner) => { const color = medalColor(winner.medal); return <Pressable key={`${winner.regId}-${winner.event}`} onPress={() => router.push(`/athlete/${winner.regId}` as never)} style={styles.winner}><View style={[styles.medalIcon, { backgroundColor: `${color}22` }]}><MaterialCommunityIcons name="medal" size={22} color={color} /></View><View style={styles.winnerText}><Txt variant="bodyLg">{winner.name}</Txt><Txt variant="bodySm" color={Colors.textDim}>{winner.event} · {winner.sport} · {winner.district}</Txt></View><Txt variant="labelPill" color={color}>{winner.medal.toUpperCase()}</Txt></Pressable>; })}</View>
        <PrimaryButton label="Browse athletes & analytics" icon="account-search" onPress={() => router.push("/(tabs)/nspg/athletes" as never)} />
      </ScrollView>
    </Screen>
  );
}
function Medal({ value, color }: { value: number; color: string }) { return <View style={[styles.medal, { backgroundColor: `${color}22` }]}><Txt variant="labelPill" color={color}>{value}</Txt></View>; }
function medalColor(medal: Medalist["medal"]): string { return medal === "gold" ? Colors.gold : medal === "silver" ? Colors.silver : Colors.bronze; }
const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl }, table: { backgroundColor: Colors.surface1, borderRadius: Radius.xl, gap: Spacing.sm, padding: Spacing.lg }, head: { flexDirection: "row", justifyContent: "space-between" }, row: { alignItems: "center", borderBottomColor: Colors.hairline, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.md }, medals: { alignItems: "center", flexDirection: "row", gap: 5 }, medal: { alignItems: "center", borderRadius: Radius.pill, minWidth: 28, paddingHorizontal: 7, paddingVertical: 5 }, sectionHead: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" }, winnerList: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" }, winner: { alignItems: "center", borderBottomColor: Colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.md, padding: Spacing.md }, medalIcon: { alignItems: "center", borderRadius: Radius.pill, height: 44, justifyContent: "center", width: 44 }, winnerText: { flex: 1, gap: 3 } });
