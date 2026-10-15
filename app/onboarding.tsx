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
import { router, type Href } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { createOrganizerProfile } from "@/lib/queries";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Button, Screen } from "@/components/ui";

type AccountType = "individual" | "organization";

const SPORTS = [
  { id: "football", label: "Football" },
  { id: "pickleball", label: "Pickleball" },
  { id: "basketball", label: "Basketball" },
  { id: "badminton", label: "Badminton" },
  { id: "darts", label: "Darts" },
];

export default function Onboarding() {
  const { session } = useAuth();
  const fullNameFromAuth = session?.user.user_metadata?.full_name as string | undefined;
  const [fullName, setFullName] = useState(fullNameFromAuth ?? "");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleSport(id: string) {
    setSports((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const canSubmit =
    fullName.trim().length > 1 &&
    city.trim().length > 1 &&
    stateName.trim().length > 1 &&
    (accountType === "individual" || orgName.trim().length > 1);

  async function finish() {
    if (!session || busy || !canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await createOrganizerProfile({
        userId: session.user.id,
        accountType,
        orgName: orgName.trim() || (accountType === "individual" ? fullName.trim() : null),
        city: city.trim(),
        state: stateName.trim(),
        sports,
      });
      router.replace("/home" as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Finish your organizer profile</Text>
          <Text style={styles.tagline}>
            Set up tournaments right away. Publishing needs a quick approval.
          </Text>

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
                placeholder="Organisation name"
                placeholderTextColor={Colors.textFaint}
                value={orgName}
                onChangeText={setOrgName}
              />
            </Field>
          )}

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

          <Button label="Continue to dashboard" onPress={finish} loading={busy} disabled={!canSubmit} />
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
  title: {
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
});
