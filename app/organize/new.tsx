import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Font, Palette, Radius, Spacing } from "@/lib/theme";
import { fetchAppSettings } from "@/lib/app-settings";
import { useAuth } from "@/lib/auth-context";
import { emptyDraft, saveFormDraft, type DraftCategory, type FormDraft } from "@/lib/form-builder";
import { formatBps } from "@/lib/money";
import { maskPayoutDetails, type PayoutAccount } from "@/lib/earnings";
import { FIELD_TYPES, FIELD_TYPE_LABEL, type FieldType, type FormField } from "@/lib/reg-types";
import { SPORT_PRESETS } from "@/lib/sports/presets";
import { supabase } from "@/lib/supabase";
import { signedFormUrl, uploadFormFile } from "@/lib/uploads";
import { IconButton, PrimaryButton, Screen, Txt } from "@/components/kit";

const STEPS = ["Details", "Categories", "Fields", "Payout", "Terms", "Review"] as const;

export default function FormBuilder() {
  const { session, loading: authLoading } = useAuth();
  const uid = session?.user.id;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [feeLabel, setFeeLabel] = useState("5%");
  const [account, setAccount] = useState<PayoutAccount>({ label: "Payout account", masked: "Loading…" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setDraft(emptyDraft(uid));
    void (async () => {
      try {
        const [settings, profile] = await Promise.all([
          fetchAppSettings(),
          supabase.from("organizer_profiles").select("payout_details").eq("user_id", uid).maybeSingle(),
        ]);
        setFeeLabel(formatBps(settings.platform_fee_bps));
        setAccount(maskPayoutDetails(profile.data?.payout_details));
      } catch {
        setAccount({ label: "Payout account", masked: "Could not load payout details." });
      }
    })();
  }, [uid]);

  function patch(partial: Partial<FormDraft>) {
    setDraft((cur) => (cur ? { ...cur, ...partial } : cur));
  }

  async function persist(publish: boolean) {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("Add a title before saving.");
      setStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const id = await saveFormDraft(draft, publish);
      patch({ id, status: publish ? "open" : "draft" });
      setNotice(publish ? "Published." : "Draft saved.");
      if (publish) router.replace("/events");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the form.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (uid && !draft)) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!uid || !draft) {
    return (
      <Screen>
        <View style={styles.center}>
          <Txt variant="headlineSm">Sign in to submit an event</Txt>
          <PrimaryButton label="Sign in" onPress={() => router.push("/login")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))} />
        <View style={{ flex: 1 }}>
          <Txt variant="labelCaps" color={Colors.primary}>
            STEP {step + 1} OF {STEPS.length}
          </Txt>
          <Txt variant="headlineSm">{STEPS[step]}</Txt>
        </View>
        <Pressable onPress={() => void persist(false)} disabled={busy}>
          <Txt variant="labelPill" color={Colors.primary}>
            {busy ? "Saving…" : "Save Draft"}
          </Txt>
        </Pressable>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? (
          <Txt variant="bodySm" color={Colors.red}>
            {error}
          </Txt>
        ) : null}
        {notice ? (
          <Txt variant="bodySm" color={Colors.primary}>
            {notice}
          </Txt>
        ) : null}

        {step === 0 && <DetailsStep draft={draft} onChange={patch} userId={uid} />}
        {step === 1 && <CategoriesStep draft={draft} onChange={patch} />}
        {step === 2 && <FieldsStep draft={draft} onChange={patch} />}
        {step === 3 && <PayoutStep feeLabel={feeLabel} account={account} />}
        {step === 4 && <TermsStep draft={draft} onChange={patch} />}
        {step === 5 && <ReviewStep draft={draft} feeLabel={feeLabel} />}

        {step < STEPS.length - 1 ? (
          <PrimaryButton label="Continue" onPress={() => setStep((s) => s + 1)} />
        ) : (
          <View style={{ gap: 10 }}>
            <PrimaryButton label={busy ? "Publishing…" : "Publish"} disabled={busy} onPress={() => void persist(true)} />
            <Pressable onPress={() => void persist(false)} style={styles.ghost}>
              <Txt variant="labelPill" color={Colors.text}>
                Keep as draft
              </Txt>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function DetailsStep({
  draft,
  onChange,
  userId,
}: {
  draft: FormDraft;
  onChange: (p: Partial<FormDraft>) => void;
  userId: string;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      <Input label="Title" value={draft.title} onChangeText={(title) => onChange({ title })} />
      <Txt variant="labelCaps" color={Colors.textDim}>
        SPORT
      </Txt>
      <View style={styles.wrap}>
        {Object.values(SPORT_PRESETS).map((sport) => {
          const on = draft.sport === sport.id;
          return (
            <Pressable key={sport.id} onPress={() => onChange({ sport: sport.id })} style={[styles.chip, on && styles.chipOn]}>
              <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.text}>
                {sport.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Input label="Description" value={draft.description} onChangeText={(description) => onChange({ description })} multiline />
      <Pressable
        style={styles.upload}
        onPress={() => {
          void (async () => {
            const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
            if (picked.canceled || !picked.assets[0]) return;
            const asset = picked.assets[0];
            try {
              const path = await uploadFormFile(
                asset.uri,
                `${userId}/banners/${Date.now()}.jpg`,
                asset.mimeType ?? "image/jpeg",
              );
              onChange({ bannerUrl: await signedFormUrl(path) });
              setUploadError(null);
            } catch (e) {
              setUploadError(e instanceof Error ? e.message : "Banner upload failed.");
            }
          })();
        }}
      >
        <MaterialCommunityIcons name="image-plus" size={18} color={Colors.primary} />
        <Txt variant="bodySm">{draft.bannerUrl ? "Banner uploaded" : "Upload banner"}</Txt>
      </Pressable>
      {uploadError ? (
        <Txt variant="bodySm" color={Colors.red}>
          {uploadError}
        </Txt>
      ) : null}
      <Input label="Venue" value={draft.venueName} onChangeText={(venueName) => onChange({ venueName })} />
      <Input label="City" value={draft.city} onChangeText={(city) => onChange({ city })} />
      <Input label="State" value={draft.state} onChangeText={(state) => onChange({ state })} />
      <Input
        label="Event starts (YYYY-MM-DDTHH:mm)"
        value={draft.startsAt}
        onChangeText={(startsAt) => onChange({ startsAt })}
      />
      <Input
        label="Registration closes (YYYY-MM-DDTHH:mm)"
        value={draft.registrationClosesAt}
        onChangeText={(registrationClosesAt) => onChange({ registrationClosesAt })}
      />
      <Txt variant="labelCaps" color={Colors.textDim}>
        VISIBILITY
      </Txt>
      <View style={styles.wrap}>
        {(["public", "unlisted"] as const).map((visibility) => {
          const on = draft.visibility === visibility;
          return (
            <Pressable key={visibility} onPress={() => onChange({ visibility })} style={[styles.chip, on && styles.chipOn]}>
              <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.text}>
                {visibility}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CategoriesStep({ draft, onChange }: { draft: FormDraft; onChange: (p: Partial<FormDraft>) => void }) {
  function updateCat(index: number, partial: Partial<DraftCategory>) {
    const categories = draft.categories.map((cat, i) => (i === index ? { ...cat, ...partial } : cat));
    onChange({ categories });
  }
  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= draft.categories.length) return;
    const categories = [...draft.categories];
    const [row] = categories.splice(index, 1);
    categories.splice(next, 0, row!);
    onChange({ categories });
  }
  return (
    <View style={{ gap: 12 }}>
      <Toggle label="Paid event" on={draft.isPaid} onPress={() => onChange({ isPaid: !draft.isPaid })} />
      <Toggle label="Has categories" on={draft.hasCategories} onPress={() => onChange({ hasCategories: !draft.hasCategories })} />
      <Toggle label="Allow multiple categories" on={draft.multiCategory} onPress={() => onChange({ multiCategory: !draft.multiCategory })} />
      <Toggle
        label="Allow custom amount"
        on={draft.allowCustomAmount}
        onPress={() => onChange({ allowCustomAmount: !draft.allowCustomAmount })}
      />
      {draft.isPaid && !draft.hasCategories ? (
        <Input label="Entry fee (₹)" value={draft.fee} onChangeText={(fee) => onChange({ fee })} keyboard="number-pad" />
      ) : null}
      {draft.hasCategories ? (
        draft.categories.length === 0 ? (
          <Txt variant="bodySm" color={Colors.textDim}>
            No categories yet.
          </Txt>
        ) : (
          draft.categories.map((cat, index) => (
            <View key={cat.id ?? index} style={styles.card}>
              <Input label="Name" value={cat.name} onChangeText={(name) => updateCat(index, { name })} />
              <Input label="Description" value={cat.description} onChangeText={(description) => updateCat(index, { description })} />
              <Input label="Price (₹)" value={cat.price} onChangeText={(price) => updateCat(index, { price })} keyboard="number-pad" />
              <Input label="Capacity" value={cat.capacity} onChangeText={(capacity) => updateCat(index, { capacity })} keyboard="number-pad" />
              <View style={styles.wrap}>
                <Mini label="Up" onPress={() => move(index, -1)} />
                <Mini label="Down" onPress={() => move(index, 1)} />
                <Mini
                  label="Remove"
                  onPress={() => onChange({ categories: draft.categories.filter((_, i) => i !== index) })}
                />
              </View>
            </View>
          ))
        )
      ) : null}
      {draft.hasCategories ? (
        <Pressable
          style={styles.ghost}
          onPress={() =>
            onChange({ categories: [...draft.categories, { name: "", description: "", price: "", capacity: "" }] })
          }
        >
          <Txt variant="labelPill">Add category</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function FieldsStep({ draft, onChange }: { draft: FormDraft; onChange: (p: Partial<FormDraft>) => void }) {
  function update(index: number, partial: Partial<FormField>) {
    onChange({ fields: draft.fields.map((field, i) => (i === index ? { ...field, ...partial } : field)) });
  }
  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= draft.fields.length) return;
    const fields = [...draft.fields];
    const [row] = fields.splice(index, 1);
    fields.splice(next, 0, row!);
    onChange({ fields });
  }
  return (
    <View style={{ gap: 12 }}>
      {draft.fields.length === 0 ? (
        <Txt variant="bodySm" color={Colors.textDim}>
          No custom fields yet. Participants still give name, phone, and email.
        </Txt>
      ) : (
        draft.fields.map((field, index) => (
          <View key={field.key} style={styles.card}>
            <Input label="Label" value={field.label} onChangeText={(label) => update(index, { label })} />
            <Txt variant="labelCaps" color={Colors.textDim}>
              FIELD INPUT FORMAT
            </Txt>
            <View style={styles.wrap}>
              {FIELD_TYPES.map((type) => {
                const on = field.type === type;
                return (
                  <Pressable key={type} onPress={() => update(index, { type })} style={[styles.chip, on && styles.chipOn]}>
                    <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.text}>
                      {FIELD_TYPE_LABEL[type]}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            {field.type === "dropdown" ? (
              <Input
                label="Options (comma separated)"
                value={(field.options ?? []).join(", ")}
                onChangeText={(text) =>
                  update(index, {
                    options: text
                      .split(",")
                      .map((part) => part.trim())
                      .filter(Boolean),
                  })
                }
              />
            ) : null}
            <Toggle label="Required" on={field.required} onPress={() => update(index, { required: !field.required })} />
            <View style={styles.wrap}>
              <Mini label="Up" onPress={() => move(index, -1)} />
              <Mini label="Down" onPress={() => move(index, 1)} />
              <Mini label="Remove" onPress={() => onChange({ fields: draft.fields.filter((_, i) => i !== index) })} />
            </View>
          </View>
        ))
      )}
      <Pressable
        style={styles.ghost}
        onPress={() => {
          const n = draft.fields.length + 1;
          const field: FormField = { key: `field_${n}`, label: `Field ${n}`, type: "short_text" as FieldType, required: false };
          onChange({ fields: [...draft.fields, field] });
        }}
      >
        <Txt variant="labelPill">Add custom field</Txt>
      </Pressable>
    </View>
  );
}

function PayoutStep({ feeLabel, account }: { feeLabel: string; account: PayoutAccount }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <Txt variant="labelCaps" color={Colors.textDim}>
          CURRENCY
        </Txt>
        <Txt variant="headlineSm">INR</Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          Platform fee {feeLabel}, taken from each paid registration.
        </Txt>
      </View>
      <View style={styles.card}>
        <Txt variant="labelCaps" color={Colors.textDim}>
          PAYOUT SUMMARY
        </Txt>
        <Txt variant="bodyLg">{account.label}</Txt>
        <Txt variant="bodyMd" color={Colors.textDim}>
          {account.masked}
        </Txt>
        <Pressable onPress={() => router.push("/onboarding")}>
          <Txt variant="labelPill" color={Colors.primary}>
            Edit payout details
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function TermsStep({ draft, onChange }: { draft: FormDraft; onChange: (p: Partial<FormDraft>) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Input label="Rules" value={draft.rules} onChangeText={(rules) => onChange({ rules })} multiline />
      <Input label="Terms" value={draft.terms} onChangeText={(terms) => onChange({ terms })} multiline />
      <Toggle
        label="Require agreement"
        on={draft.requireAgreement}
        onPress={() => onChange({ requireAgreement: !draft.requireAgreement })}
      />
      {draft.requireAgreement ? (
        <Input
          label="Agreement label"
          value={draft.agreementLabel}
          onChangeText={(agreementLabel) => onChange({ agreementLabel })}
        />
      ) : null}
      <Input
        label="Important notes"
        value={draft.importantNotes}
        onChangeText={(importantNotes) => onChange({ importantNotes })}
        multiline
      />
    </View>
  );
}

function ReviewStep({ draft, feeLabel }: { draft: FormDraft; feeLabel: string }) {
  return (
    <View style={styles.card}>
      <Txt variant="labelCaps" color={Colors.primary}>
        PARTICIPANT PREVIEW
      </Txt>
      <Txt variant="headlineSm">{draft.title || "Untitled event"}</Txt>
      <Txt variant="bodySm" color={Colors.textDim}>
        {[draft.sport, draft.city, draft.venueName].filter(Boolean).join(" · ")}
      </Txt>
      {draft.description ? <Txt variant="bodyMd">{draft.description}</Txt> : null}
      <Txt variant="bodySm" color={Colors.textDim}>
        {draft.isPaid ? `Paid · fee ${feeLabel}` : "Free"}
        {draft.hasCategories ? ` · ${draft.categories.filter((c) => c.name.trim()).length} categories` : ""}
        {` · ${draft.fields.length} custom fields`}
      </Txt>
      {draft.rules ? (
        <Txt variant="bodySm" color={Colors.textDim}>
          {draft.rules}
        </Txt>
      ) : null}
      <Txt variant="bodySm" color={Colors.textFaint}>
        Visibility {draft.visibility}. Publishing makes this form readable on Events when it is public.
      </Txt>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  multiline,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboard?: "default" | "number-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="labelCaps" color={Colors.textDim}>
        {label.toUpperCase()}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboard ?? "default"}
        placeholderTextColor={Colors.textFaint}
        style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" }]}
      />
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggle}>
      <Txt variant="bodyMd" style={{ flex: 1 }}>
        {label}
      </Txt>
      <View style={[styles.switch, on && { backgroundColor: Colors.primary }]}>
        <View style={[styles.knob, on && { alignSelf: "flex-end" }]} />
      </View>
    </Pressable>
  );
}

function Mini({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Txt variant="labelPill">{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.margin,
    paddingVertical: 8,
  },
  progress: { height: 3, backgroundColor: Colors.surface3, marginHorizontal: Spacing.margin },
  progressFill: { height: 3, backgroundColor: Colors.primary },
  body: { padding: Spacing.margin, paddingBottom: 48, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: Spacing.margin },
  input: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    color: Colors.text,
    fontFamily: Font.medium,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
  },
  chipOn: { backgroundColor: Colors.primary },
  card: {
    gap: 10,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Palette.surfaceLow,
  },
  ghost: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface3,
    padding: 3,
    justifyContent: "center",
  },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.text },
});
