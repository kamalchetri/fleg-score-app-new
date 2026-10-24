import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { formatXp, xpProgress } from "@/lib/xp";
import { Txt } from "@/components/kit";

export function XpProgressCard({ xp }: { xp: number | null }) {
  const progress = xpProgress(xp);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.levelBadge}><MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.onPrimary} /><Txt variant="labelPill" color={Colors.onPrimary}>LVL {progress.level}</Txt></View>
        <View style={styles.heading}><Txt variant="labelCaps" color={Colors.primary}>FLEG XP</Txt><Txt variant="headlineSm">{progress.title}</Txt></View>
        <View style={styles.total}><Txt variant="headlineSm" color={Colors.primary}>{formatXp(progress.total)}</Txt><Txt variant="bodySm" color={Colors.textDim}>XP</Txt></View>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, progress.progress * 100)}%` }]} /></View>
      <View style={styles.meta}>{progress.nextLevel == null ? <Txt variant="bodySm" color={Colors.primary}>Maximum level reached</Txt> : <Txt variant="bodySm" color={Colors.textDim}>{formatXp(progress.remaining)} XP to level {progress.level + 1}</Txt>}<Txt variant="bodySm" color={Colors.textDim}>Verified play & picks</Txt></View>
      <View style={styles.note}><MaterialCommunityIcons name="information-outline" size={16} color={Colors.textDim} /><Txt variant="bodySm" color={Colors.textDim} style={{ flex: 1 }}>XP currently comes from verified predictions. Future participation and fair-play rewards will never change a match result.</Txt></View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface1, borderColor: "rgba(206,242,2,0.28)", borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg },
  top: { alignItems: "center", flexDirection: "row", gap: Spacing.md },
  levelBadge: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.lg, gap: 2, height: 58, justifyContent: "center", width: 58 },
  heading: { flex: 1, gap: 2 },
  total: { alignItems: "flex-end", gap: 1 },
  track: { backgroundColor: Colors.surface3, borderRadius: Radius.pill, height: 8, overflow: "hidden", width: "100%" },
  fill: { backgroundColor: Colors.primary, borderRadius: Radius.pill, height: "100%" },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  note: { alignItems: "center", borderTopColor: Colors.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, paddingTop: Spacing.sm },
});

