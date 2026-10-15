// Core UI kit: Screen, Button, Card, Badge, EmptyState, ScorePad.
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Colors, Font, Radius, Spacing, statusColors, statusLabel } from "@/lib/theme";

export function Screen({
  children,
  style,
  edges,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "right" | "bottom" | "left")[];
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ status }: { status: string }) {
  const color = statusColors[status] ?? Colors.textDim;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
      <Text style={[styles.badgeText, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const bg =
    variant === "primary" ? Colors.green : variant === "danger" ? Colors.red : "transparent";
  const fg = variant === "primary" ? "#04140A" : variant === "danger" ? "#FFFFFF" : Colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === "ghost" && styles.buttonGhost,
        (pressed || disabled || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]} numberOfLines={3}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

interface ScorePadProps {
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  /** Compact pads stay at least 64dp and are meant to stack in a narrow column. */
  size?: "large" | "compact";
}

/** Giant tap target for referees — the whole point of this app. */
export function ScorePad({ label, sublabel, onPress, disabled, color, size = "large" }: ScorePadProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.pad,
        size === "compact" && styles.padCompact,
        { borderColor: color ?? Colors.green },
        pressed && { backgroundColor: color ? `${color}22` : Colors.greenDim },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[styles.padLabel, size === "compact" && styles.padLabelCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {label}
      </Text>
      {sublabel ? (
        <Text style={styles.padSub} numberOfLines={3}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: Font.bold, letterSpacing: 0.6, textTransform: "uppercase" },
  empty: { alignItems: "center", padding: Spacing.xxl },
  emptyTitle: { color: Colors.textDim, fontSize: 16, fontFamily: Font.semibold },
  emptyBody: { color: Colors.textFaint, fontSize: 14, marginTop: Spacing.sm, textAlign: "center", fontFamily: Font.regular },
  button: {
    minHeight: 52,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  buttonGhost: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2 },
  buttonText: { fontSize: 15, fontFamily: Font.bold, textAlign: "center" },
  pad: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 140,
    minWidth: 120,
    borderWidth: 2,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  padCompact: {
    minHeight: 64,
    minWidth: 0,
    width: "100%",
    flexBasis: "auto",
    flexGrow: 0,
    marginHorizontal: 0,
  },
  padLabel: { color: Colors.text, fontSize: 28, fontFamily: Font.extrabold, textAlign: "center" },
  padLabelCompact: { fontSize: 22 },
  padSub: { color: Colors.textDim, fontSize: 14, marginTop: Spacing.xs, fontFamily: Font.medium, textAlign: "center" },
});
