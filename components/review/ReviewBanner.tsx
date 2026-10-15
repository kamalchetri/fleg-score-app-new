import { StyleSheet, Text, View } from "react-native";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";

export function ReviewBanner() {
  return (
    <View accessibilityRole="text" style={styles.banner}>
      <Text style={styles.text}>Review build · sample data · not live results.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.greenDim,
    borderColor: Colors.green,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  text: { color: Colors.green, fontFamily: Font.bold, fontSize: 12 },
});
