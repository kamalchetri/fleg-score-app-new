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
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { Button, Screen } from "@/components/ui";

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
    router.replace("/home");
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
            No account yet? Sign up on the website —{" "}
            <Text
              style={{ color: Colors.green }}
              onPress={() => Linking.openURL("https://www.fleg.in/signup")}
            >
              fleg.in/signup
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
  logo: { color: Colors.text, fontSize: 34, fontWeight: "900", textAlign: "center" },
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
