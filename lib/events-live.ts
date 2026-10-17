/**
 * Events data layer — the app's Discover/Home read ONLY these functions (never tables).
 * Surfaces everything that lives on fleg.in today (reg-form events, tournaments, runs,
 * clinics, fundraisers) as one unified Event shape, from the shared Supabase DB.
 *
 * Seed-backed today so Discover can be built now; Claude swaps each body to the live
 * read-view `events_v_public` (union of reg_forms + event configs + tournaments) at cutover.
 * Signatures/types below are the stable contract and will not change.
 */
import { SEED_EVENTS, SEED_EVENT_DETAIL } from "./events-seed";

export type EventKind = "tournament" | "run" | "clinic" | "fundraiser" | "league" | "other";
export type EventStatus = "upcoming" | "registration_open" | "live" | "registration_closed" | "past";

export interface EventSummary {
  slug: string;
  title: string;
  kind: EventKind;
  sport: string | null;
  status: EventStatus;
  startDate: string | null;      // ISO; null if not set
  city: string | null;
  venue: string | null;
  bannerUrl: string | null;
  paid: boolean;
  priceFrom: number | null;      // INR, null when free
  isNspg: boolean;               // routes into the NSPG section instead of generic detail
  organiser: string | null;      // attribution (e.g. "NPA", "RMLCF")
}

export interface EventCategoryOption {
  id: string;
  name: string;
  price: number;                 // 0 = free
}

export interface EventDetail extends EventSummary {
  description: string | null;
  rules: string | null;
  importantNotes: string | null;
  categories: EventCategoryOption[];
  requiresLogin: boolean;
  registrationCloseAt: string | null;
}

// ─── Discover / Home API ───────────────────────────────────────────────────

/** All public events for Discover, newest/soonest first. Optionally filter by kind. */
export async function listEvents(kind?: EventKind): Promise<EventSummary[]> {
  const all = SEED_EVENTS; // → select * from events_v_public order by start_date
  return kind ? all.filter((e) => e.kind === kind) : all;
}

/** Featured / happening-now events for the Home hero + strips. */
export async function listFeaturedEvents(): Promise<EventSummary[]> {
  return SEED_EVENTS.filter((e) => e.status === "live" || e.status === "registration_open").slice(0, 6);
}

/** One event's full detail for the event screen / register-checkout. */
export async function getEvent(slug: string): Promise<EventDetail | null> {
  return SEED_EVENT_DETAIL[slug] ?? null; // → select * from events_v_public where slug = $1
}

/**
 * Registration/checkout entry point. Free → direct submit; paid → Razorpay order.
 * Claude wires this to the existing fleg.in submit + Razorpay create-order flow at cutover.
 * Returns where the UI should go next.
 */
export async function startRegistration(_slug: string, _categoryIds: string[]): Promise<
  { mode: "free"; submissionRef: string } | { mode: "razorpay"; orderId: string; amount: number }
> {
  throw new Error("startRegistration is wired at cutover (fleg.in submit + Razorpay). UI: build the form + checkout screens against EventDetail now.");
}
