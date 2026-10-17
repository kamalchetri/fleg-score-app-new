import { StyleSheet, View } from "react-native";
import { Screen, Txt, LiveDot } from "@/components/kit";
import { Colors, Spacing } from "@/lib/theme";

export default function LiveTab() {
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.heading}><LiveDot /><Txt variant="displayHero">Live</Txt></View>
        <Txt variant="bodyLg" color={Colors.textDim}>Live scoreboards will appear here when approved competitions are running.</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: Spacing.lg, padding: Spacing.margin },
  heading: { alignItems: "center", flexDirection: "row", gap: Spacing.md },
});
