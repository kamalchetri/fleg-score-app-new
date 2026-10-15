// Horizontal tab bar for the tournament hub. Sticky at the top, big
// touch targets, scrollable on 360px screens.
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";

export type HubTab = "entrants" | "fixtures" | "standings" | "schedule" | "settings" | "audit" | "export";

export const TABS: Array<{ key: HubTab; label: string }> = [
  { key: "entrants", label: "Entrants" },
  { key: "fixtures", label: "Fixtures" },
  { key: "standings", label: "Standings" },
  { key: "schedule", label: "Schedule" },
  { key: "settings", label: "Settings" },
];

const GOVERNANCE_TABS: Array<{ key: HubTab; label: string }> = [
  { key: "audit", label: "Audit" },
  { key: "export", label: "Export" },
];

export function Tabs({
  active,
  onChange,
  governance = false,
}: {
  active: HubTab;
  onChange: (t: HubTab) => void;
  governance?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {(governance ? [...TABS, ...GOVERNANCE_TABS] : TABS).map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  row: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    marginVertical: Spacing.xs,
  },
  tabActive: { backgroundColor: Colors.elevated },
  label: { color: Colors.textDim, fontSize: 15, fontFamily: Font.semibold },
  labelActive: { color: Colors.green },
});
