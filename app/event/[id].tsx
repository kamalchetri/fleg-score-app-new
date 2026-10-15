import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Font, Palette, Radius, Spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { fetchAppSettings } from "@/lib/app-settings";
import { useAuth } from "@/lib/auth-context";
import { feeFromBps, formatBps, formatInr } from "@/lib/money";
import { FIELD_TYPE_LABEL, type FormField } from "@/lib/reg-types";
import {
  capacityFull,
  createPaymentOrder,
  loadRegistration,
  openRazorpayCheckout,
  registrationClosed,
  submitRegistration,
  verifyPayment,
  type LoadedForm,
  type RazorpayOrder,
  type RegCategory,
  type RegSubmission,
} from "@/lib/registration";
import { uploadFormFile } from "@/lib/uploads";
import { IconButton, PrimaryButton, Screen, Txt } from "@/components/kit";

type PayState = "idle" | "pending" | "failed" | "pass";

export default function EventRegister() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const formId = Array.isArray(id) ? id[0] : id;
  const { session } = useAuth();
  const [loaded, setLoaded] = useState<LoadedForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bps, setBps] = useState(500);
  const [selected, setSelected] = useState<string[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [payState, setPayState] = useState<PayState>("idle");
  const [payError, setPayError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<RegSubmission | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, settings] = await Promise.all([
        loadRegistration(formId),
        fetchAppSettings().catch(() => ({ platform_fee_bps: 500, xp_multiplier: 1, payout_cycle_note: null })),
      ]);
      if (!data) {
        setError("This event is not available.");
        setLoaded(null);
      } else {
        setLoaded(data);
        setBps(settings.platform_fee_bps);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this event.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    void load();
  }, [load]);

  const form = loaded?.form;
  const categories = loaded?.categories ?? [];
  const fill = loaded?.fill ?? { registered: 0, capacity: null };
  const closed = form ? registrationClosed(form) : false;
  const full = capacityFull(fill);
  const multi = !!form?.multi_category;

  const chosen = useMemo(
    () => categories.filter((c) => selected.includes(c.id)),
    [categories, selected],
  );
  const custom = form?.allow_custom_amount ? Math.max(0, Math.round(Number(customAmount) || 0)) : 0;
  const categorySum = form?.has_categories ? chosen.reduce((sum, c) => sum + c.price, 0) : form?.fee ?? 0;
  const subtotal = (form?.is_paid ? categorySum : 0) + custom;
  const fee = form?.is_paid ? feeFromBps(subtotal, bps) : 0;
  const total = subtotal + fee;

  function toggleCategory(cat: RegCategory) {
    setSelected((cur) => {
      if (multi) return cur.includes(cat.id) ? cur.filter((id) => id !== cat.id) : [...cur, cat.id];
      return cur[0] === cat.id ? [] : [cat.id];
    });
  }

  function missingRequired(): string | null {
    if (!form) return "Event is still loading.";
    if (!session) return "Sign in to register.";
    if (closed) return "Registration is closed.";
    if (full) return "This event is full.";
    if (!name.trim()) return "Enter your name.";
    if (!phone.trim()) return "Enter your phone.";
    if (!email.trim()) return "Enter your email.";
    if (form.has_categories && selected.length === 0) return "Choose a category.";
    if (form.require_agreement && !agreed) return "Accept the agreement to continue.";
    for (const field of form.fields) {
      if (field.required && !answers[field.key]?.trim()) return `${field.label} is required.`;
    }
    return null;
  }

  async function payExisting(sub: RegSubmission, existingOrder: RazorpayOrder | null) {
    if (!form) return;
    setPayState("pending");
    setPayError(null);
    try {
      const created = existingOrder ?? (await createPaymentOrder(sub.id, sub.amount || total));
      if ("alreadyPaid" in created) {
        setPayState("pass");
        return;
      }
      const next = created;
      setOrder(next);
      const checkout = await openRazorpayCheckout({
        key: next.key,
        amountPaise: next.amountPaise,
        currency: next.currency,
        orderId: next.orderId,
        description: form.title,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      await verifyPayment(sub.id, checkout);
      setPayState("pass");
    } catch (e) {
      setPayState("failed");
      setPayError(e instanceof Error ? e.message : "Payment failed.");
    }
  }

  async function onSubmit() {
    const problem = missingRequired();
    if (problem || !form) {
      setPayError(problem);
      return;
    }
    setBusy(true);
    setPayError(null);
    try {
      const sub =
        submission ??
        (await submitRegistration({
          formId: form.id,
          fullName: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          answers,
          categoryIds: selected,
          agreed,
          customAmount: form.allow_custom_amount ? custom : null,
        }));
      setSubmission(sub);
      const charge = sub.amount > 0 ? sub.amount : total;
      if (!form.is_paid || charge <= 0) {
        setPayState("pass");
        return;
      }
      await payExisting(sub, null);
    } catch (e) {
      setPayState("failed");
      setPayError(e instanceof Error ? e.message : "Could not submit registration.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !form || !loaded) {
    return (
      <Screen>
        <View style={styles.center}>
          <Txt variant="headlineSm">Event unavailable</Txt>
          <Txt variant="bodySm" color={Colors.textDim} align="center">
            {error ?? "This registration is not open."}
          </Txt>
          <PrimaryButton label="Back to events" onPress={() => router.replace("/events")} />
        </View>
      </Screen>
    );
  }

  if (payState === "pass" && submission) {
    return (
      <Pass
        title={form.title}
        name={name.trim()}
        reference={submission.reference}
        amount={submission.amount}
        when={formatDateTime(form.starts_at)}
      />
    );
  }

  const when = formatDateTime(form.starts_at ?? form.registration_closes_at);
  const venue = [form.venue_name, form.city, form.state].filter(Boolean).join(", ");
  const closes = form.registration_closes_at ? formatDateTime(form.registration_closes_at) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          {form.banner_url ? (
            <Image source={{ uri: form.banner_url }} style={styles.banner} />
          ) : (
            <View style={[styles.banner, styles.bannerFallback]} />
          )}
          <View style={styles.back}>
            <IconButton icon="arrow-left" onPress={() => router.back()} />
          </View>
        </View>

        <Txt variant="labelCaps" color={closed ? Colors.amber : Colors.primary}>
          {closed ? "REGISTRATION CLOSED" : `REGISTRATION OPEN${closes ? ` · CLOSES ${closes.toUpperCase()}` : ""}`}
        </Txt>
        <Txt variant="headlineMd">{form.title}</Txt>
        {loaded.organizerName ? (
          <Txt variant="bodySm" color={Colors.textDim}>
            by {loaded.organizerName}
          </Txt>
        ) : null}
        <Txt variant="bodyMd" color={Colors.textDim}>
          {[when, venue].filter(Boolean).join(" · ")}
        </Txt>
        {form.description ? <Txt variant="bodyMd">{form.description}</Txt> : null}

        {full ? (
          <Banner tone="danger" text="Capacity is full. Registration is closed for new participants." />
        ) : null}
        {closed && !full ? <Banner tone="warn" text="Registration is closed for this event." /> : null}

        {(form.rules || form.important_notes) && (
          <View style={styles.block}>
            <Txt variant="labelCaps" color={Colors.textDim}>
              OVERVIEW & GUIDELINES
            </Txt>
            {form.rules ? <Txt variant="bodyMd">{form.rules}</Txt> : null}
            {form.important_notes ? (
              <Txt variant="bodySm" color={Colors.textDim}>
                {form.important_notes}
              </Txt>
            ) : null}
          </View>
        )}

        {form.has_categories && (
          <View style={styles.block}>
            <Txt variant="headlineSm">Choose category</Txt>
            {categories.length === 0 ? (
              <Txt variant="bodySm" color={Colors.textDim}>
                No categories have been published yet.
              </Txt>
            ) : (
              categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  selected={selected.includes(cat.id)}
                  onPress={() => toggleCategory(cat)}
                />
              ))
            )}
          </View>
        )}

        {form.allow_custom_amount ? (
          <Field label="Custom amount (₹)" value={customAmount} onChangeText={setCustomAmount} keyboard="number-pad" />
        ) : null}

        <View style={styles.block}>
          <Txt variant="headlineSm">Participant details</Txt>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboard="phone-pad" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" />
          {form.fields.map((field) => (
            <CustomField
              key={field.key}
              field={field}
              value={answers[field.key] ?? ""}
              onChange={(value) => setAnswers((cur) => ({ ...cur, [field.key]: value }))}
              userId={session?.user.id}
              formId={form.id}
            />
          ))}
        </View>

        {form.require_agreement ? (
          <Pressable onPress={() => setAgreed((v) => !v)} style={styles.agree}>
            <MaterialCommunityIcons
              name={agreed ? "checkbox-marked" : "checkbox-blank-outline"}
              size={22}
              color={agreed ? Colors.primary : Colors.textDim}
            />
            <Txt variant="bodyMd" style={{ flex: 1 }}>
              {form.agreement_label || "I agree to the event terms"}
            </Txt>
          </Pressable>
        ) : null}
        {form.terms ? (
          <Txt variant="bodySm" color={Colors.textDim}>
            {form.terms}
          </Txt>
        ) : null}

        {form.is_paid ? (
          <View style={styles.block}>
            <Txt variant="headlineSm">Payment summary</Txt>
            {chosen.map((cat) => (
              <Line key={cat.id} label={cat.name} value={formatInr(cat.price)} />
            ))}
            {!form.has_categories && (form.fee ?? 0) > 0 ? <Line label="Entry" value={formatInr(form.fee)} /> : null}
            {custom > 0 ? <Line label="Custom amount" value={formatInr(custom)} /> : null}
            <Line label={`Platform fee (${formatBps(bps)})`} value={fee === 0 ? "Waived" : formatInr(fee)} />
            <Line label="Total" value={formatInr(total)} strong />
            <Txt variant="bodySm" color={Colors.textDim}>
              Secure payment via Razorpay. The charged amount is confirmed by the server.
            </Txt>
          </View>
        ) : (
          <Txt variant="bodySm" color={Colors.primary}>
            Free event — no payment.
          </Txt>
        )}

        {payState === "pending" ? <Banner tone="warn" text="Payment pending. Complete checkout to finish." /> : null}
        {payState === "failed" ? (
          <Banner tone="danger" text={payError ?? "Payment failed. You can retry without registering again."} />
        ) : null}
        {payError && payState !== "failed" ? (
          <Txt variant="bodySm" color={Colors.red}>
            {payError}
          </Txt>
        ) : null}

        {!session ? (
          <PrimaryButton label="Sign in to register" onPress={() => router.push("/login")} />
        ) : payState === "failed" && submission ? (
          <PrimaryButton
            label="Retry payment"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void payExisting(submission, order).finally(() => setBusy(false));
            }}
          />
        ) : (
          <PrimaryButton
            label={busy ? "Submitting…" : form.is_paid && total > 0 ? `Pay ${formatInr(total)}` : "Register"}
            disabled={busy || closed || full}
            onPress={() => void onSubmit()}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function CategoryRow({ cat, selected, onPress }: { cat: RegCategory; selected: boolean; onPress: () => void }) {
  const spots = cat.capacity != null && cat.capacity > 0 ? `${cat.capacity} spots left` : null;
  return (
    <Pressable onPress={onPress} style={[styles.cat, selected && { borderColor: Colors.primary }]}>
      <MaterialCommunityIcons
        name={selected ? "radiobox-marked" : "radiobox-blank"}
        size={20}
        color={selected ? Colors.primary : Colors.textDim}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyLg">{cat.name}</Txt>
        {cat.description ? (
          <Txt variant="bodySm" color={Colors.textDim}>
            {cat.description}
          </Txt>
        ) : null}
        {spots ? (
          <Txt variant="bodySm" color={Colors.textDim}>
            {spots}
          </Txt>
        ) : null}
      </View>
      <Txt variant="labelPill" color={Colors.primary}>
        {cat.price > 0 ? formatInr(cat.price) : "FREE"}
      </Txt>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboard,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboard?: "default" | "number-pad" | "phone-pad" | "email-address";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="labelCaps" color={Colors.textDim}>
        {label.toUpperCase()}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard ?? "default"}
        multiline={multiline}
        placeholderTextColor={Colors.textFaint}
        style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" }]}
      />
    </View>
  );
}

function CustomField({
  field,
  value,
  onChange,
  userId,
  formId,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  userId?: string;
  formId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const label = `${field.label}${field.required ? " *" : ""} · ${FIELD_TYPE_LABEL[field.type]}`;

  if (field.type === "dropdown" && field.options?.length) {
    return (
      <View style={{ gap: 6 }}>
        <Txt variant="labelCaps" color={Colors.textDim}>
          {label.toUpperCase()}
        </Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {field.options.map((option) => {
            const on = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={[styles.option, { backgroundColor: on ? Colors.primary : Colors.surface2 }]}
              >
                <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.text}>
                  {option}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.type === "file") {
    return (
      <View style={{ gap: 6 }}>
        <Txt variant="labelCaps" color={Colors.textDim}>
          {label.toUpperCase()}
        </Txt>
        <Pressable
          onPress={() => {
            void (async () => {
              if (!userId) {
                setUploadError("Sign in before uploading.");
                return;
              }
              const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
              if (picked.canceled || !picked.assets[0]) return;
              const asset = picked.assets[0];
              setUploading(true);
              setUploadError(null);
              try {
                const path = await uploadFormFile(
                  asset.uri,
                  `${userId}/answers/${formId}/${field.key}-${Date.now()}`,
                  asset.mimeType ?? "application/octet-stream",
                );
                onChange(path);
              } catch (e) {
                setUploadError(e instanceof Error ? e.message : "Upload failed.");
              } finally {
                setUploading(false);
              }
            })();
          }}
          style={styles.upload}
        >
          <MaterialCommunityIcons name="paperclip" size={18} color={Colors.primary} />
          <Txt variant="bodySm" color={Colors.text} style={{ flex: 1 }} numberOfLines={1}>
            {uploading ? "Uploading…" : value || "Upload file"}
          </Txt>
        </Pressable>
        {uploadError ? (
          <Txt variant="bodySm" color={Colors.red}>
            {uploadError}
          </Txt>
        ) : null}
      </View>
    );
  }

  const keyboard =
    field.type === "number" ? "number-pad" : field.type === "phone" ? "phone-pad" : field.type === "email" ? "email-address" : "default";
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChange}
      keyboard={keyboard}
      multiline={field.type === "long_text"}
    />
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Txt variant={strong ? "bodyLg" : "bodyMd"} color={strong ? Colors.text : Colors.textDim}>
        {label}
      </Txt>
      <Txt variant={strong ? "bodyLg" : "bodyMd"} color={strong ? Colors.primary : Colors.text}>
        {value}
      </Txt>
    </View>
  );
}

function Banner({ text, tone }: { text: string; tone: "danger" | "warn" }) {
  const color = tone === "danger" ? Colors.danger : Colors.amber;
  return (
    <View style={[styles.bannerNote, { borderColor: color }]}>
      <Txt variant="bodySm" color={color}>
        {text}
      </Txt>
    </View>
  );
}

function Pass({
  title,
  name,
  reference,
  amount,
  when,
}: {
  title: string;
  name: string;
  reference: string;
  amount: number;
  when: string;
}) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.passWrap}>
        <Txt variant="labelCaps" color={Colors.primary}>
          REGISTRATION PASS
        </Txt>
        <View style={styles.pass}>
          <Txt variant="headlineSm" color={Colors.onPrimary}>
            {title}
          </Txt>
          <Txt variant="bodyMd" color={Colors.onPrimary}>
            {name}
          </Txt>
          <Txt variant="bodySm" color={Colors.onPrimary}>
            {when}
          </Txt>
          <View style={styles.dash} />
          <Txt variant="labelCaps" color={Colors.onPrimary}>
            REFERENCE
          </Txt>
          <Txt variant="headlineMd" color={Colors.onPrimary}>
            {reference.slice(0, 8).toUpperCase()}
          </Txt>
          <Txt variant="bodySm" color={Colors.onPrimary}>
            {reference}
          </Txt>
          <Txt variant="bodySm" color={Colors.onPrimary}>
            {amount > 0 ? formatInr(amount) : "FREE"} · show this reference at check-in
          </Txt>
        </View>
        <PrimaryButton label="Back to events" onPress={() => router.replace("/events")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40, paddingHorizontal: Spacing.margin, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: Spacing.margin },
  banner: { width: "100%", height: 180, marginHorizontal: -Spacing.margin },
  bannerFallback: { backgroundColor: Colors.surface2 },
  back: { position: "absolute", top: 12, left: 12 },
  block: {
    gap: 10,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  cat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Palette.surfaceLow,
  },
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
  option: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill },
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
  agree: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  bannerNote: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: Palette.surfaceLow,
  },
  passWrap: { padding: Spacing.margin, gap: 16, paddingBottom: 40 },
  pass: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: 6,
  },
  dash: { borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(11,12,16,0.25)", marginVertical: 8 },
});
