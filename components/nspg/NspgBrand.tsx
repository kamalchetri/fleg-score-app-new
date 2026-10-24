import { Image, StyleSheet, View } from "react-native";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { Txt } from "@/components/kit";

type NspgBrandProps = {
  /** Dark is for app/navigation surfaces; light is for the chartreuse hero. */
  tone?: "dark" | "light";
  compact?: boolean;
  partners?: boolean;
};

export function NspgBrand({ tone = "dark", compact = false, partners = false }: NspgBrandProps) {
  const dark = tone === "dark";
  return (
    <View style={[styles.wrap, compact && styles.compactWrap, dark ? styles.darkWrap : styles.lightWrap]}>
      <View style={styles.identity}>
        <Image
          source={dark ? require("../../assets/nspg/nspg-icon-white.png") : require("../../assets/nspg/noa.png")}
          style={compact ? styles.compactEmblem : styles.emblem}
          resizeMode="contain"
          accessibilityLabel="NSPG emblem"
        />
        <View style={styles.copy}>
          <Txt variant={compact ? "labelCaps" : "labelCaps"} color={dark ? Colors.text : Colors.onPrimary}>
            NAGALAND STATE & PARA GAMES
          </Txt>
          {!compact ? <Txt variant="bodySm" color={dark ? Colors.textDim : Colors.onPrimary}>NSPG 2026 · OFFICIAL SCOREBOARD</Txt> : null}
        </View>
      </View>
      {partners ? (
        <View style={styles.partners}>
          <Image source={require("../../assets/nspg/noa.png")} style={styles.partnerNoa} resizeMode="contain" accessibilityLabel="Nagaland Olympic Association" />
          <Image source={require("../../assets/nspg/nagaland-govt.png")} style={styles.partner} resizeMode="contain" accessibilityLabel="Government of Nagaland" />
          <Image source={require("../../assets/nspg/nagaland-athletics.png")} style={styles.partner} resizeMode="contain" accessibilityLabel="Nagaland athletics partner mark" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, gap: Spacing.md, padding: Spacing.md },
  compactWrap: { paddingHorizontal: 0, paddingVertical: 0 },
  darkWrap: { backgroundColor: Colors.surface1 },
  lightWrap: { backgroundColor: "rgba(255,255,255,0.18)" },
  identity: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  emblem: { height: 54, width: 54 },
  compactEmblem: { height: 34, width: 34 },
  copy: { flex: 1, gap: 3 },
  partners: { alignItems: "center", flexDirection: "row", gap: Spacing.md, paddingLeft: 2 },
  partner: { height: 28, width: 54 },
  partnerNoa: { height: 30, width: 30 },
});
