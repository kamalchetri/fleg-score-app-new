import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Fixture } from "@/lib/nspg-live";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { Crest, StatusPill, Txt } from "@/components/kit";

export function PublicMatchCard({ fixture, onPress }: { fixture: Fixture; onPress?: () => void }) {
  const score = fixture.status === "scheduled" ? "vs" : `${fixture.sideA.score ?? 0}  –  ${fixture.sideB.score ?? 0}`;
  const status = fixture.status === "live" ? "live" : fixture.status === "final" ? "completed" : "scheduled";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]}>
      <View style={styles.top}>
        <Txt variant="labelCaps" color={Colors.textDim}>{fixture.roundLabel.toUpperCase()} · {fixture.category.toUpperCase()}</Txt>
        <StatusPill status={status} />
      </View>
      <View style={styles.teams}>
        <View style={styles.side}><Crest name={fixture.sideA.name} size={38} /><Txt variant="bodyLg" numberOfLines={1}>{fixture.sideA.name}</Txt><Txt variant="bodySm" color={Colors.textDim}>{fixture.sideA.district}</Txt></View>
        <Txt variant="scoreDisplay" color={fixture.status === "live" ? Colors.primary : Colors.text}>{score}</Txt>
        <View style={styles.side}><Crest name={fixture.sideB.name} size={38} /><Txt variant="bodyLg" numberOfLines={1} align="right">{fixture.sideB.name}</Txt><Txt variant="bodySm" color={Colors.textDim}>{fixture.sideB.district}</Txt></View>
      </View>
      <View style={styles.footer}>
        <MaterialCommunityIcons name="map-marker-outline" size={15} color={Colors.textDim} />
        <Txt variant="bodySm" color={Colors.textDim}>{fixture.venue ?? "Venue TBA"}</Txt>
        {fixture.clock ? <Txt variant="labelCaps" color={Colors.danger}>{fixture.clock}</Txt> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  teams: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between" },
  side: { alignItems: "center", flex: 1, gap: 4 },
  footer: { alignItems: "center", flexDirection: "row", gap: 5 },
});
