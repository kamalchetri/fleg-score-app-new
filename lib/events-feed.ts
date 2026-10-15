import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLiveMatches, type FeedMatch } from "@/lib/queries";
import { sportIcon, sportLabel, type SportOption } from "@/lib/home-feed";
import { asRows, rpcIdList, table, type QueryResult } from "@/lib/supabase-extra";

export type EventSource = "tournament" | "form" | "workshop";
export type EventSegment = "all" | "tournaments" | "register" | "live";

export interface PublicEvent {
  source: EventSource;
  id: string;
  title: string;
  sport: string;
  description: string | null;
  banner_url: string | null;
  city: string | null;
  state: string | null;
  status: string;
  visibility: string;
  is_paid: boolean;
  fee: number | null;
  prize_pool: number | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_closes_at: string | null;
  organizer_id: string | null;
  slug: string | null;
  created_at: string;
}

export interface FillInfo {
  registered: number;
  capacity: number | null;
}

export interface EventsBundle {
  events: PublicEvent[];
  fills: Record<string, FillInfo>;
  organizers: Record<string, string>;
  liveByTournament: Record<string, FeedMatch>;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asSource(value: unknown): EventSource {
  if (value === "form" || value === "workshop") return value;
  return "tournament";
}

/** Workshop posters are storage paths in the event-posters bucket, not URLs. */
export function eventPosterUrl(source: EventSource, bannerUrl: string | null): string | null {
  if (!bannerUrl) return null;
  if (source !== "workshop" || /^https?:\/\//i.test(bannerUrl)) return bannerUrl;
  const { data } = supabase.storage.from("event-posters").getPublicUrl(bannerUrl);
  return data.publicUrl || null;
}

function asEvent(row: Record<string, unknown>): PublicEvent {
  const source = asSource(row.source);
  const bannerPath = row.banner_url == null ? null : String(row.banner_url);
  return {
    source,
    id: String(row.id),
    title: String(row.title ?? ""),
    sport: String(row.sport ?? ""),
    description: row.description == null ? null : String(row.description),
    banner_url: eventPosterUrl(source, bannerPath),
    city: row.city == null ? null : String(row.city),
    state: row.state == null ? null : String(row.state),
    status: String(row.status ?? ""),
    visibility: String(row.visibility ?? "public"),
    is_paid: Boolean(row.is_paid),
    fee: num(row.fee),
    prize_pool: num(row.prize_pool),
    starts_at: row.starts_at == null ? null : String(row.starts_at),
    ends_at: row.ends_at == null ? null : String(row.ends_at),
    registration_closes_at: row.registration_closes_at == null ? null : String(row.registration_closes_at),
    organizer_id: row.organizer_id == null ? null : String(row.organizer_id),
    slug: row.slug == null ? null : String(row.slug),
    created_at: String(row.created_at ?? ""),
  };
}

function asFill(row: Record<string, unknown>, idKey: string): { id: string; fill: FillInfo } | null {
  const id = row[idKey];
  if (id == null) return null;
  return {
    id: String(id),
    fill: { registered: Number(row.registered ?? 0), capacity: num(row.capacity) },
  };
}

export async function fetchEvents(): Promise<EventsBundle> {
  const { data, error } = (await table("public_events")
    .select(
      "source, id, title, sport, description, banner_url, city, state, status, visibility, is_paid, fee, prize_pool, starts_at, ends_at, registration_closes_at, organizer_id, slug, created_at",
    )
    .order("starts_at", { ascending: true, nullsFirst: false })) as QueryResult<Record<string, unknown>[] | null>;
  if (error) throw new Error(error.message);

  const events = (data ?? []).map(asEvent);
  const formIds = events.filter((e) => e.source === "form").map((e) => e.id);
  const tournamentIds = events.filter((e) => e.source === "tournament").map((e) => e.id);
  const organizerIds = [...new Set(events.map((e) => e.organizer_id).filter((id): id is string => !!id))];

  const [formFill, tournamentFill, nameRows, live] = await Promise.all([
    formIds.length
      ? rpcIdList<Record<string, unknown>[]>("form_fill", formIds, ["form_ids", "ids", "p_ids"])
      : Promise.resolve([]),
    tournamentIds.length
      ? rpcIdList<Record<string, unknown>[]>("tournament_fill", tournamentIds, [
          "tournament_ids",
          "ids",
          "p_ids",
        ])
      : Promise.resolve([]),
    organizerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", organizerIds)
      : Promise.resolve({ data: [], error: null }),
    fetchLiveMatches().catch(() => [] as FeedMatch[]),
  ]);

  const fills: Record<string, FillInfo> = {};
  for (const row of asRows(formFill)) {
    const parsed = asFill(row, "form_id");
    if (parsed) fills[parsed.id] = parsed.fill;
  }
  for (const row of asRows(tournamentFill)) {
    const parsed = asFill(row, "tournament_id");
    if (parsed) fills[parsed.id] = parsed.fill;
  }

  const organizers: Record<string, string> = {};
  if (!nameRows.error) {
    for (const row of nameRows.data ?? []) {
      organizers[row.id] = row.full_name;
    }
  }

  const liveByTournament: Record<string, FeedMatch> = {};
  for (const match of live) {
    const tid = match.tournament?.id;
    if (tid && !liveByTournament[tid]) liveByTournament[tid] = match;
  }

  return { events, fills, organizers, liveByTournament };
}

export function sameLocalDay(iso: string | null, day: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function eventOnDay(event: PublicEvent, day: Date): boolean {
  return (
    sameLocalDay(event.starts_at, day) ||
    sameLocalDay(event.registration_closes_at, day) ||
    sameLocalDay(event.ends_at, day)
  );
}

export function startOfWeek(anchor: Date): Date {
  const x = new Date(anchor);
  x.setHours(0, 0, 0, 0);
  const weekday = x.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  x.setDate(x.getDate() + diff);
  return x;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function shiftWeek(anchor: Date, delta: number): Date {
  const next = new Date(anchor);
  next.setDate(next.getDate() + delta * 7);
  return next;
}

const DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function dayLabel(d: Date): string {
  return DAY[d.getDay()] ?? "";
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export interface EventsFeed {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  events: PublicEvent[];
  fills: Record<string, FillInfo>;
  organizers: Record<string, string>;
  liveByTournament: Record<string, FeedMatch>;
  sports: SportOption[];
  refresh: () => void;
}

export function useEventsFeed(): EventsFeed {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<EventsBundle>({
    events: [],
    fills: {},
    organizers: {},
    liveByTournament: {},
  });

  const load = useCallback(async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setBundle(await fetchEvents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const sports = useMemo<SportOption[]>(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    let hasWorkshops = false;
    for (const event of bundle.events) {
      if (event.source === "workshop") {
        hasWorkshops = true;
        continue;
      }
      if (event.sport && !seen.has(event.sport)) {
        seen.add(event.sport);
        order.push(event.sport);
      }
    }
    const chips = order.map((s) => ({ key: s, label: sportLabel(s), icon: sportIcon(s) }));
    if (hasWorkshops) chips.unshift({ key: "workshops", label: "Workshops", icon: "account-group" });
    return chips;
  }, [bundle.events]);

  return {
    loading,
    refreshing,
    error,
    events: bundle.events,
    fills: bundle.fills,
    organizers: bundle.organizers,
    liveByTournament: bundle.liveByTournament,
    sports,
    refresh: () => void load(true),
  };
}
