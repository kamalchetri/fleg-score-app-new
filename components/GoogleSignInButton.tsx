import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { routeAfterAuth, signInWithGoogleOAuth } from "@/lib/google-auth";

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogleOAuth();
      await routeAfterAuth();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Google sign-in failed.";
      if (!/cancel/i.test(message)) {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          void onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && { opacity: 0.65 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <>
            <Text style={styles.googleGlyph}>G</Text>
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textFaint, fontSize: 12, fontFamily: Font.semibold },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  googleGlyph: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Font.extrabold,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Font.bold,
  },
  error: {
    color: Colors.red,
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: 13,
  },
});
