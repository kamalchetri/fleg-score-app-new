import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Button, Screen } from "@/components/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type AccountType = "individual" | "organization";

const SPORTS: { id: string; label: string }[] = [
  { id: "football", label: "Football" },
  { id: "pickleball", label: "Pickleball" },
  { id: "basketball", label: "Basketball" },
  { id: "badminton", label: "Badminton" },
  { id: "darts", label: "Darts" },
];

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleSport(id: string) {
    setSports((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const canSubmit =
    fullName.trim().length > 1 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    (accountType === "individual" || orgName.trim().length > 1);

  async function signUp() {
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (err) {
      setBusy(false);
      setError(
        /already registered/i.test(err.message)
          ? "That email already has an account — sign in instead."
          : err.message,
      );
      return;
    }

    const user = data.user;
    // Email confirmation ON → no session yet. Defer profile creation to first sign-in.
    if (!data.session) {
      setBusy(false);
      setNotice(
        "Account created. Check your email to confirm your address, then sign in to finish setup.",
      );
      return;
    }

    if (user) {
      const { error: pErr } = await supabase.from("organizer_profiles").insert({
        user_id: user.id,
        account_type: accountType,
        org_name: orgName.trim() || (accountType === "individual" ? fullName.trim() : null),
        city: city.trim() || null,
        state: stateName.trim() || null,
        sports,
      });
      // A duplicate profile (retry) is fine; surface anything else.
      if (pErr && !/duplicate key/i.test(pErr.message)) {
        setBusy(false);
        setError(`Account made, but profile setup failed: ${pErr.message}`);
        return;
      }
    }

    setBusy(false);
    router.replace("/home");
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>
            Create your <Text style={{ color: Colors.green }}>FLEG</Text> account
          </Text>
          <Text style={styles.tagline}>
            Set up tournaments right away. Publishing needs a quick approval.
          </Text>

          <GoogleSignInButton />

          <Field label="Full name">
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.textFaint}
              value={fullName}
              onChangeText={setFullName}
            />
          </Field>

          <Field label="Account type">
            <View style={styles.toggleRow}>
              {(["individual", "organization"] as AccountType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setAccountType(t)}
                  style={[styles.toggle, accountType === t && styles.toggleOn]}
                >
                  <Text style={[styles.toggleText, accountType === t && styles.toggleTextOn]}>
                    {t === "individual" ? "Individual" : "Organisation"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          {accountType === "organization" && (
            <Field label="Organisation name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Chümoukedima District Football Assn."
                placeholderTextColor={Colors.textFaint}
                value={orgName}
                onChangeText={setOrgName}
              />
            </Field>
          )}

          <Field label="Email">
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </Field>

          <Field label="Password">
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </Field>

          <View style={styles.row}>
            <Field label="City" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={Colors.textFaint}
                value={city}
                onChangeText={setCity}
              />
            </Field>
            <Field label="State" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={Colors.textFaint}
                value={stateName}
                onChangeText={setStateName}
              />
            </Field>
          </View>

          <Field label="Sports you run (optional)">
            <View style={styles.chips}>
              {SPORTS.map((s) => {
                const on = sports.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleSport(s.id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            label="Create account"
            onPress={signUp}
            loading={busy}
            disabled={!canSubmit}
          />

          <Text style={styles.footerText} onPress={() => router.replace("/login")}>
            Already have an account? <Text style={{ color: Colors.green }}>Sign in</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[{ marginBottom: Spacing.md }, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  logo: {
    color: Colors.text,
    fontSize: 26,
    fontFamily: Font.extrabold,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  tagline: {
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  label: {
    color: Colors.textDim,
    fontSize: 13,
    fontFamily: Font.semibold,
    marginBottom: Spacing.xs,
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
  },
  row: { flexDirection: "row", gap: Spacing.md },
  toggleRow: { flexDirection: "row", gap: Spacing.sm },
  toggle: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  toggleOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  toggleText: { color: Colors.textDim, fontFamily: Font.bold },
  toggleTextOn: { color: Colors.green },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  chipText: { color: Colors.textDim, fontFamily: Font.semibold },
  chipTextOn: { color: Colors.green },
  error: { color: Colors.red, marginBottom: Spacing.md, textAlign: "center" },
  notice: { color: Colors.green, marginBottom: Spacing.md, textAlign: "center" },
  footerText: {
    color: Colors.textFaint,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
