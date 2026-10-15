import { useEffect, useState } from "react";
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
import {
  createTournament,
  fetchOrganizerProfile,
  type OrganizerProfile,
} from "@/lib/queries";
import {
  getSportPreset,
  SPORT_IDS,
  type SportId,
  type SportPreset,
} from "@/lib/sports/presets";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Button, Card, Screen } from "@/components/ui";

export default function NewTournament() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportId>("futsal");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preset = getSportPreset(sport) as SportPreset | null;

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    fetchOrganizerProfile(session.user.id)
      .then((p) => {
        if (!p) {
          router.replace("/onboarding" as Href);
          return;
        }
        setProfile(p);
        if (p.city) setCity(p.city);
        if (p.state) setStateName(p.state);
      })
      .catch(() => router.replace("/onboarding" as Href));
  }, [session]);

  useEffect(() => {
    const p = getSportPreset(sport);
    if (p?.suggestedCategories[0]) {
      setCategoryName(p.suggestedCategories[0].name);
    }
  }, [sport]);

  const canSubmit =
    name.trim().length >= 3 &&
    city.trim().length >= 2 &&
    stateName.trim().length >= 2 &&
    startDate.trim().length >= 8 &&
    categoryName.trim().length >= 2;

  async function submit() {
    if (!session || !preset || busy || !canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      const cat = preset.suggestedCategories[0] ?? {
        name: categoryName.trim(),
        entrantType: preset.defaultEntrantType,
      };
      const { id } = await createTournament(session.user.id, {
        name: name.trim(),
        sport,
        venueName: venueName.trim() || undefined,
        city: city.trim(),
        state: stateName.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
        categories: [
          {
            name: categoryName.trim() || cat.name,
            entrantType: cat.entrantType,
            format: "knockout",
            maxEntrants: null,
          },
        ],
      });
      router.replace(`/tournament/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create tournament.");
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
          {profile?.status === "pending" ? (
            <Card>
              <Text style={styles.notice}>
                Your organizer account is under review. You can set up this tournament as a draft
                now — publishing goes live once you're approved.
              </Text>
            </Card>
          ) : null}

          <Field label="Tournament name">
            <TextInput
              style={styles.input}
              placeholder="e.g. Chümou Summer Open"
              placeholderTextColor={Colors.textFaint}
              value={name}
              onChangeText={setName}
            />
          </Field>

          <Field label="Sport">
            <View style={styles.sportGrid}>
              {SPORT_IDS.map((id) => {
                const p = getSportPreset(id)!;
                const selected = sport === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSport(id)}
                    style={[styles.sportChip, selected && styles.sportChipOn]}
                  >
                    <Text style={[styles.sportChipText, selected && styles.sportChipTextOn]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Category">
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor={Colors.textFaint}
              value={categoryName}
              onChangeText={setCategoryName}
            />
          </Field>

          <Field label="Venue (optional)">
            <TextInput
              style={styles.input}
              placeholder="Venue name"
              placeholderTextColor={Colors.textFaint}
              value={venueName}
              onChangeText={setVenueName}
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

          <Field label="Start date (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              placeholder="2026-08-01"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="none"
              value={startDate}
              onChangeText={setStartDate}
            />
          </Field>

          <Field label="End date (optional)">
            <TextInput
              style={styles.input}
              placeholder="2026-08-03"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="none"
              value={endDate}
              onChangeText={setEndDate}
            />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Create draft tournament"
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
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
  wrap: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  notice: { color: Colors.textDim, fontSize: 14, lineHeight: 20 },
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
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sportChipOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  sportChipText: { color: Colors.textDim, fontFamily: Font.bold, fontSize: 13 },
  sportChipTextOn: { color: Colors.green },
  error: { color: Colors.red, marginBottom: Spacing.md, textAlign: "center" },
});
