import { table, type QueryResult } from "@/lib/supabase-extra";
import type { FormField } from "@/lib/reg-types";

export interface DraftCategory {
  id?: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
}

export interface FormDraft {
  id: string | null;
  organizerId: string;
  title: string;
  sport: string;
  description: string;
  bannerUrl: string | null;
  venueName: string;
  city: string;
  state: string;
  startsAt: string;
  registrationClosesAt: string;
  visibility: "public" | "unlisted";
  isPaid: boolean;
  fee: string;
  hasCategories: boolean;
  multiCategory: boolean;
  allowCustomAmount: boolean;
  categories: DraftCategory[];
  fields: FormField[];
  rules: string;
  terms: string;
  requireAgreement: boolean;
  agreementLabel: string;
  importantNotes: string;
  status: "draft" | "open";
}

export function emptyDraft(organizerId: string): FormDraft {
  return {
    id: null,
    organizerId,
    title: "",
    sport: "futsal",
    description: "",
    bannerUrl: null,
    venueName: "",
    city: "",
    state: "",
    startsAt: "",
    registrationClosesAt: "",
    visibility: "public",
    isPaid: false,
    fee: "",
    hasCategories: true,
    multiCategory: false,
    allowCustomAmount: false,
    categories: [{ name: "", description: "", price: "", capacity: "" }],
    fields: [],
    rules: "",
    terms: "",
    requireAgreement: true,
    agreementLabel: "I agree to the event terms",
    importantNotes: "",
    status: "draft",
  };
}

function toIso(date: string): string | null {
  const trimmed = date.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function intOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function formRow(draft: FormDraft, status: "draft" | "open") {
  return {
    organizer_id: draft.organizerId,
    title: draft.title.trim(),
    sport: draft.sport,
    description: draft.description.trim() || null,
    banner_url: draft.bannerUrl,
    venue_name: draft.venueName.trim() || null,
    city: draft.city.trim() || null,
    state: draft.state.trim() || null,
    starts_at: toIso(draft.startsAt),
    registration_closes_at: toIso(draft.registrationClosesAt),
    visibility: draft.visibility,
    is_paid: draft.isPaid,
    fee: draft.isPaid && !draft.hasCategories ? intOrNull(draft.fee) : null,
    has_categories: draft.hasCategories,
    multi_category: draft.multiCategory,
    allow_custom_amount: draft.allowCustomAmount,
    fields: draft.fields,
    rules: draft.rules.trim() || null,
    terms: draft.terms.trim() || null,
    require_agreement: draft.requireAgreement,
    agreement_label: draft.agreementLabel.trim() || null,
    important_notes: draft.importantNotes.trim() || null,
    status,
  };
}

async function syncCategories(formId: string, categories: DraftCategory[]): Promise<void> {
  const kept = categories.filter((c) => c.name.trim());
  const { data: existing, error: readErr } = (await table("reg_form_categories")
    .select("id")
    .eq("form_id", formId)) as QueryResult<{ id: string }[] | null>;
  if (readErr) throw new Error(readErr.message);

  const keepIds = new Set(kept.map((c) => c.id).filter((id): id is string => !!id));
  const stale = (existing ?? []).map((row) => row.id).filter((id) => !keepIds.has(id));
  if (stale.length) {
    const { error } = (await table("reg_form_categories").delete().in("id", stale)) as QueryResult<unknown>;
    if (error) throw new Error(error.message);
  }

  for (let i = 0; i < kept.length; i++) {
    const cat = kept[i]!;
    const row = {
      form_id: formId,
      name: cat.name.trim(),
      description: cat.description.trim() || null,
      price: intOrNull(cat.price) ?? 0,
      capacity: intOrNull(cat.capacity),
      sort_order: i,
    };
    if (cat.id) {
      const { error } = (await table("reg_form_categories").update(row).eq("id", cat.id)) as QueryResult<unknown>;
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = (await table("reg_form_categories")
        .insert(row)
        .select("id")
        .single()) as QueryResult<{ id: string }>;
      if (error) throw new Error(error.message);
      cat.id = data.id;
    }
  }
}

/** Insert or update the organiser's form and its categories. Returns the form id. */
export async function saveFormDraft(draft: FormDraft, publish = false): Promise<string> {
  const status = publish ? "open" : "draft";
  const row = formRow(draft, status);
  let id = draft.id;
  if (id) {
    const { error } = (await table("reg_forms").update(row).eq("id", id)) as QueryResult<unknown>;
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = (await table("reg_forms").insert(row).select("id").single()) as QueryResult<{
      id: string;
    }>;
    if (error) throw new Error(error.message);
    id = data.id;
    draft.id = id;
  }
  if (draft.hasCategories) await syncCategories(id, draft.categories);
  draft.status = status;
  return id;
}
