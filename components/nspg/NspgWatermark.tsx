import { Image, StyleSheet, View } from "react-native";

/** Fixed, non-interactive NSPG identity mark behind page content. */
export function NspgWatermark() {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Image
        source={require("../../assets/nspg/nspg-icon-white.png")}
        style={styles.emblem}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, alignItems: "flex-end", justifyContent: "flex-start", overflow: "hidden" },
  emblem: { height: 390, opacity: 0.035, position: "absolute", right: -135, top: 108, width: 390 },
});
