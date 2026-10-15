import { supabase } from "@/lib/supabase";
import { asRows, rpc, rpcIdList, table, type QueryResult } from "@/lib/supabase-extra";
import { parseFields, type FormField } from "@/lib/reg-types";
import type { RazorpaySuccess } from "react-native-razorpay";

const CREATE_ORDER = "https://www.fleg.in/api/payments/forms/create-order";
const VERIFY = "https://www.fleg.in/api/payments/forms/verify";

export interface RegCategory {
  id: string;
  form_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sort_order: number;
}

export interface RegForm {
  id: string;
  organizer_id: string;
  title: string;
  sport: string;
  description: string | null;
  banner_url: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_closes_at: string | null;
  visibility: string;
  status: string;
  is_paid: boolean;
  fee: number | null;
  has_categories: boolean;
  multi_category: boolean;
  allow_custom_amount: boolean;
  require_agreement: boolean;
  agreement_label: string | null;
  rules: string | null;
  terms: string | null;
  important_notes: string | null;
  fields: FormField[];
}

export interface FormFill {
  registered: number;
  capacity: number | null;
}

export interface RegSubmission {
  id: string;
  amount: number;
  status: string;
  reference: string;
}

export interface RazorpayOrder {
  key: string;
  orderId: string;
  /** Paise, as Razorpay expects. */
  amountPaise: number;
  currency: string;
}

export interface LoadedForm {
  form: RegForm;
  categories: RegCategory[];
  fill: FormFill;
  organizerName: string | null;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asForm(row: Record<string, unknown>): RegForm {
  return {
    id: String(row.id),
    organizer_id: String(row.organizer_id ?? ""),
    title: String(row.title ?? ""),
    sport: String(row.sport ?? ""),
    description: row.description == null ? null : String(row.description),
    banner_url: row.banner_url == null ? null : String(row.banner_url),
    venue_name: row.venue_name == null ? null : String(row.venue_name),
    city: row.city == null ? null : String(row.city),
    state: row.state == null ? null : String(row.state),
    starts_at: row.starts_at == null ? null : String(row.starts_at),
    ends_at: row.ends_at == null ? null : String(row.ends_at),
    registration_closes_at: row.registration_closes_at == null ? null : String(row.registration_closes_at),
    visibility: String(row.visibility ?? "public"),
    status: String(row.status ?? "draft"),
    is_paid: Boolean(row.is_paid),
    fee: num(row.fee),
    has_categories: Boolean(row.has_categories),
    multi_category: Boolean(row.multi_category),
    allow_custom_amount: Boolean(row.allow_custom_amount),
    require_agreement: Boolean(row.require_agreement),
    agreement_label: row.agreement_label == null ? null : String(row.agreement_label),
    rules: row.rules == null ? null : String(row.rules),
    terms: row.terms == null ? null : String(row.terms),
    important_notes: row.important_notes == null ? null : String(row.important_notes),
    fields: parseFields(row.fields),
  };
}

function asCategory(row: Record<string, unknown>): RegCategory {
  return {
    id: String(row.id),
    form_id: String(row.form_id),
    name: String(row.name ?? ""),
    description: row.description == null ? null : String(row.description),
    price: Number(row.price ?? 0),
    capacity: num(row.capacity),
    sort_order: Number(row.sort_order ?? 0),
  };
}

function asSubmission(raw: unknown): RegSubmission {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = String(row.id ?? row.submission_id ?? "");
  const reference = String(row.reference ?? row.reference_id ?? id);
  return {
    id,
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? row.payment_status ?? "pending"),
    reference,
  };
}

export function registrationClosed(form: RegForm, now = Date.now()): boolean {
  const status = form.status.toLowerCase();
  if (status === "closed" || status === "registration_closed" || status === "draft") return true;
  if (form.registration_closes_at && new Date(form.registration_closes_at).getTime() < now) return true;
  return false;
}

export function capacityFull(fill: FormFill): boolean {
  return fill.capacity != null && fill.capacity > 0 && fill.registered >= fill.capacity;
}

export async function loadRegistration(formId: string): Promise<LoadedForm | null> {
  const { data, error } = (await table("reg_forms").select("*").eq("id", formId).maybeSingle()) as QueryResult<
    Record<string, unknown> | null
  >;
  if (error) throw new Error(error.message);
  if (!data) return null;
  const form = asForm(data);

  const [catsRes, fillRows, org] = await Promise.all([
    table("reg_form_categories")
      .select("id, form_id, name, description, price, capacity, sort_order")
      .eq("form_id", formId)
      .order("sort_order", { ascending: true }) as Promise<QueryResult<Record<string, unknown>[] | null>>,
    rpcIdList<Record<string, unknown>[]>("form_fill", [formId], ["form_ids", "ids", "p_ids"]),
    form.organizer_id
      ? supabase.from("profiles").select("full_name").eq("id", form.organizer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (catsRes.error) throw new Error(catsRes.error.message);

  const fillRow = asRows(fillRows)[0];
  const fill: FormFill = {
    registered: Number(fillRow?.registered ?? 0),
    capacity: num(fillRow?.capacity),
  };

  return {
    form,
    categories: (catsRes.data ?? []).map(asCategory),
    fill,
    organizerName: org.data?.full_name ?? null,
  };
}

export interface SubmitInput {
  formId: string;
  fullName: string;
  phone: string;
  email: string;
  answers: Record<string, string>;
  categoryIds: string[];
  agreed: boolean;
  customAmount: number | null;
}

export async function submitRegistration(input: SubmitInput): Promise<RegSubmission> {
  const data = await rpc<unknown>("reg_form_submit", {
    p_form_id: input.formId,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email,
    p_answers: input.answers,
    p_category_ids: input.categoryIds,
    p_agreed: input.agreed,
    p_custom_amount: input.customAmount,
  });
  const submission = asSubmission(data);
  if (!submission.id) throw new Error("Registration did not return a submission.");
  return submission;
}

function apiError(text: string, fallback: string): string {
  try {
    const json = JSON.parse(text) as { error?: unknown };
    if (typeof json.error === "string" && json.error.trim()) return json.error;
  } catch {
    // Response was not JSON.
  }
  return text.trim() || fallback;
}

function asOrder(raw: unknown, fallbackRupees: number): RazorpayOrder {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const nested = (row.order && typeof row.order === "object" ? row.order : row) as Record<string, unknown>;
  const orderId = String(row.orderId ?? nested.orderId ?? nested.order_id ?? nested.id ?? row.order_id ?? row.id ?? "");
  const key = String(
    row.keyId ?? row.key ?? row.key_id ?? row.razorpay_key ?? nested.keyId ?? nested.key ?? nested.key_id ?? "",
  );
  const currency = String(nested.currency ?? row.currency ?? "INR");
  const amountRaw = num(nested.amount ?? row.amount);
  // Razorpay amounts are paise. If the API already returns paise (>= 100× rupees), keep it.
  const amountPaise =
    amountRaw == null
      ? Math.round(fallbackRupees * 100)
      : amountRaw >= fallbackRupees * 50
        ? Math.round(amountRaw)
        : Math.round(amountRaw * 100);
  if (!orderId || !key) throw new Error("Payment order was missing a key or order id.");
  return { key, orderId, amountPaise, currency };
}

export type CreatedPaymentOrder = RazorpayOrder | { alreadyPaid: true };

export async function createPaymentOrder(
  submissionId: string,
  amountRupees: number,
): Promise<CreatedPaymentOrder> {
  const res = await fetch(CREATE_ORDER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(apiError(text, "Could not start payment."));
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Payment service returned an unexpected response.");
  }
  if (json && typeof json === "object" && (json as { alreadyPaid?: unknown }).alreadyPaid === true) {
    return { alreadyPaid: true };
  }
  return asOrder(json, amountRupees);
}

/** Sends the checkout payload to fleg.in. Signature checks stay on the server. */
export async function verifyPayment(submissionId: string, checkout: RazorpaySuccess): Promise<void> {
  const res = await fetch(VERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      submissionId,
      razorpay_order_id: checkout.razorpay_order_id,
      razorpay_payment_id: checkout.razorpay_payment_id,
      razorpay_signature: checkout.razorpay_signature,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(apiError(text, "Payment verification failed."));
  }
}

export async function openRazorpayCheckout(options: {
  key: string;
  amountPaise: number;
  currency: string;
  orderId: string;
  description: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<RazorpaySuccess> {
  let openCheckout: (typeof import("react-native-razorpay"))["default"]["open"];
  try {
    const mod = await import("react-native-razorpay");
    openCheckout = mod.default.open.bind(mod.default);
  } catch {
    throw new Error("Razorpay checkout is not available in this build.");
  }
  if (!openCheckout) throw new Error("Razorpay checkout is not available in this build.");
  return openCheckout({
    key: options.key,
    amount: options.amountPaise,
    currency: options.currency,
    name: "FLEG",
    description: options.description,
    order_id: options.orderId,
    prefill: {
      name: options.name,
      email: options.email,
      contact: options.phone,
    },
    theme: { color: "#CEF202" },
  });
}
