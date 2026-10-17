import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen, Txt, StatusPill } from "@/components/kit";
import { Colors, Radius, Spacing, Type } from "@/lib/theme";

export default function NspgTab() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={Type.labelCaps}>NAGALAND STATE POLICE GAMES</Text>
        <Txt variant="displayHero">NSPG 2026</Txt>
        <Txt variant="bodyLg" color={Colors.textDim}>
          Competition hub foundation. Fixtures, officials, and live results will appear here after approved setup.
        </Txt>
        <View style={styles.hero}>
          <StatusPill status="scheduled" />
          <Txt variant="headlineMd">Association workspace</Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>Built for controlled tournament operations across Nagaland.</Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl },
  hero: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, padding: Spacing.xl },
});
