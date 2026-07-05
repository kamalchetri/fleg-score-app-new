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
import { Colors, Radius, Spacing, statusColors, statusLabel } from "@/lib/theme";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ status }: { status: string }) {
  const color = statusColors[status] ?? Colors.textDim;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
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
        <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
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
}

/** Giant tap target for referees — the whole point of this app. */
export function ScorePad({ label, sublabel, onPress, disabled, color }: ScorePadProps) {
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
        { borderColor: color ?? Colors.green },
        pressed && { backgroundColor: color ? `${color}22` : Colors.greenDim },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={styles.padLabel}>{label}</Text>
      {sublabel ? <Text style={styles.padSub}>{sublabel}</Text> : null}
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
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  empty: { alignItems: "center", padding: Spacing.xxl },
  emptyTitle: { color: Colors.textDim, fontSize: 16, fontWeight: "600" },
  emptyBody: { color: Colors.textFaint, fontSize: 14, marginTop: Spacing.sm, textAlign: "center" },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    marginVertical: Spacing.xs,
  },
  buttonGhost: { borderWidth: 1, borderColor: Colors.border },
  buttonText: { fontSize: 16, fontWeight: "700" },
  pad: {
    flex: 1,
    minHeight: 140,
    borderWidth: 2,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xs,
  },
  padLabel: { color: Colors.text, fontSize: 28, fontWeight: "800" },
  padSub: { color: Colors.textDim, fontSize: 14, marginTop: Spacing.xs },
});
