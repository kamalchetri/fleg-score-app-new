import { Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Txt } from "@/components/kit";

export function PublicHeader({ title = "NSPG 2026" }: { title?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image source={require("../../assets/fleg-score-logo-white.png")} style={styles.logo} resizeMode="contain" />
        <View><Txt variant="labelCaps" color={Colors.primary}>FLEG SCORE</Txt><Txt variant="bodySm" color={Colors.textDim}>{title}</Txt></View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/login" as never)} style={styles.signIn}>
        <MaterialCommunityIcons name="account-outline" size={16} color={Colors.onPrimary} />
        <Txt variant="labelPill" color={Colors.onPrimary}>Sign in</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({ header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm }, brand: { alignItems: "center", flexDirection: "row", gap: Spacing.sm }, logo: { height: 34, width: 34 }, signIn: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.pill, flexDirection: "row", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm } });
