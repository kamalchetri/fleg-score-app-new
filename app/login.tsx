import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";
import { routeAfterAuth } from "@/lib/google-auth";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Button, Screen } from "@/components/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Wrong email or password."
          : err.message,
      );
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/home");
      return;
    }
    await routeAfterAuth();
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <Text style={styles.logo}>
          FLEG <Text style={{ color: Colors.green }}>SCORE</Text>
        </Text>
        <Text style={styles.tagline}>Tournament management & live scoring</Text>

        <GoogleSignInButton />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textFaint}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={signIn}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Sign in" onPress={signIn} loading={busy} disabled={!email || !password} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            No account yet?{" "}
            <Text
              style={{ color: Colors.green }}
              onPress={() => router.push("/signup" as unknown as Href)}
            >
              Create one
            </Text>
          </Text>
          <Text
            style={[styles.footerText, { color: Colors.textDim, marginTop: Spacing.sm }]}
            onPress={() => Linking.openURL("https://www.fleg.in/forgot-password")}
          >
            Forgot password?
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: Spacing.xl },
  logo: { color: Colors.text, fontSize: 34, fontFamily: Font.extrabold, textAlign: "center" },
  tagline: {
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  error: { color: Colors.red, marginBottom: Spacing.md, textAlign: "center" },
  footer: { marginTop: Spacing.xl, alignItems: "center" },
  footerText: { color: Colors.textFaint, fontSize: 14, textAlign: "center" },
});
