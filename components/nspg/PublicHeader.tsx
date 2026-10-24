import { Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { Txt } from "@/components/kit";

export function PublicHeader({ title = "NSPG 2026" }: { title?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Image source={require("../../assets/nspg/nspg-icon-white.png")} style={styles.emblem} resizeMode="contain" accessibilityLabel="NSPG emblem" />
          <View style={styles.title}><Txt variant="labelCaps" color={Colors.primary}>NSPG 2026</Txt><Txt variant="bodySm" color={Colors.textDim}>{title}</Txt></View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/login" as never)} style={styles.signIn}>
          <MaterialCommunityIcons name="account-outline" size={16} color={Colors.onPrimary} />
          <Txt variant="labelPill" color={Colors.onPrimary}>Sign in</Txt>
        </Pressable>
      </View>
      <View style={styles.partnerRow}>
        <Image source={require("../../assets/nspg/noa.png")} style={styles.partnerNoa} resizeMode="contain" accessibilityLabel="Nagaland Olympic Association" />
        <Image source={require("../../assets/nspg/nagaland-govt.png")} style={styles.partner} resizeMode="contain" accessibilityLabel="Government of Nagaland" />
        <Image source={require("../../assets/nspg/nagaland-athletics.png")} style={styles.partner} resizeMode="contain" accessibilityLabel="Nagaland athletics partner mark" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: Spacing.sm },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brand: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: Spacing.sm },
  emblem: { height: 34, width: 34 },
  title: { flexShrink: 1, gap: 2 },
  partnerRow: { alignItems: "center", flexDirection: "row", gap: 8, marginLeft: 42 },
  partner: { height: 24, width: 42 },
  partnerNoa: { height: 26, width: 26 },
  signIn: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.pill, flexDirection: "row", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
});
