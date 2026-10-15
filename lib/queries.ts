// Data-access helpers. All through RLS (anon key) — the DB is the gate.
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getSportPreset, type SportId } from "@/lib/sports/presets";
import {
  guardedAppendArgs,
  interpretGuardedAppend,
  type AppendScoreEventInput,
  type AppendScoreEventResult,
} from "@/lib/guarded-scoring";
import type { ScoringEvent } from "@/lib/scoring";

export interface OrganizerProfile {
  user_id: string;
  account_type: string;
  org_name: string | null;
  city: string | null;
  state: string | null;
  sports: string[];
  status: string;
}

export async function fetchOrganizerProfile(userId: string): Promise<OrganizerProfile | null> {
  const { data, error } = await supabase
    .from("organizer_profiles")
    .select("user_id, account_type, org_name, city, state, sports, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OrganizerProfile | null;
}

export async function createOrganizerProfile(input: {
  userId: string;
  accountType: "individual" | "organization";
  orgName: string | null;
  city: string | null;
  state: string | null;
  sports: string[];
}): Promise<void> {
  const { error } = await supabase.from("organizer_profiles").insert({
    user_id: input.userId,
    account_type: input.accountType,
    org_name: input.orgName,
    city: input.city,
    state: input.state,
    sports: input.sports,
  });
  if (error && !/duplicate key/i.test(error.message)) {
    throw new Error(error.message);
  }
}

/**
 * Creates a minimal pending organizer profile on first authenticated load
 * (Google OAuth or email-confirmed first sign-in). Idempotent.
 */
export async function ensurePendingOrganizerProfile(user: User): Promise<OrganizerProfile | null> {
  const existing = await fetchOrganizerProfile(user.id);
  if (existing) return existing;

  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    user.email?.split("@")[0]?.trim() ||
    "Organizer";

  await createOrganizerProfile({
    userId: user.id,
    accountType: "individual",
    orgName: fullName,
    city: null,
    state: null,
    sports: [],
  });

  return fetchOrganizerProfile(user.id);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "tournament"}-${suffix}`;
}

export interface CreateTournamentInput {
  name: string;
  sport: SportId;
  description?: string;
  venueName?: string;
  city: string;
  state: string;
  startDate: string;
  endDate?: string;
  categories: Array<{
    name: string;
    entrantType: "team" | "singles" | "doubles";
    format: "knockout" | "league" | "groups_knockout";
    maxEntrants: number | null;
  }>;
}

/** Mirror of web createTournament — inserts draft + categories under RLS. */
export async function createTournament(
  userId: string,
  input: CreateTournamentInput,
): Promise<{ id: string }> {
  const preset = getSportPreset(input.sport);
  if (!preset) throw new Error("Unknown sport.");

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: userId,
      name: input.name.trim(),
      slug: slugify(input.name),
      sport: input.sport,
      sport_config: JSON.parse(JSON.stringify(preset.config)),
      description: input.description?.trim() || null,
      venue_name: input.venueName?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      starts_at: input.startDate,
      ends_at: input.endDate || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (tErr || !tournament) {
    if (tErr?.code === "42501") {
      throw new Error("Only approved organizers can create tournaments.");
    }
    throw new Error(tErr?.message ?? "Could not create tournament.");
  }

  const { error: cErr } = await supabase.from("tournament_categories").insert(
    input.categories.map((cat, i) => ({
      tournament_id: tournament.id,
      name: cat.name.trim(),
      entrant_type: cat.entrantType,
      format: cat.format,
      max_entrants: cat.maxEntrants,
      entry_fee: 0,
      sort_order: i,
    })),
  );

  if (cErr) {
    await supabase.from("tournaments").delete().eq("id", tournament.id);
    throw new Error(`Could not create categories: ${cErr.message}`);
  }

  return { id: tournament.id };
}

export interface MyMatch {
  id: string;
  status: string;
  court: string | null;
  scheduled_at: string | null;
  tournament: { id: string; name: string; sport: string } | null;
  category: { name: string } | null;
  a: { display_name: string } | null;
  b: { display_name: string } | null;
}

export async function fetchMyMatches(userId: string): Promise<MyMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, status, court, scheduled_at,
       tournament:tournaments!matches_tournament_id_fkey(id, name, sport),
       category:tournament_categories!matches_category_id_fkey(name),
       a:entrants!matches_entrant_a_fkey(display_name),
       b:entrants!matches_entrant_b_fkey(display_name)`,
    )
    .eq("referee_id", userId)
    .in("status", ["scheduled", "live"])
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MyMatch[];
}

export interface MyTournament {
  staff_role: string;
  tournament: {
    id: string;
    name: string;
    sport: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
}

export async function fetchMyTournaments(userId: string): Promise<MyTournament[]> {
  const { data, error } = await supabase
    .from("tournament_staff")
    .select(
      `staff_role,
       tournament:tournaments!tournament_staff_tournament_id_fkey(
         id, name, sport, status, starts_at, ends_at)`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MyTournament[];
}

export interface MatchDetail {
  id: string;
  status: string;
  round: number;
  position: number;
  stage_id: string | null;
  court: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  winner_id: string | null;
  entrant_a: string | null;
  entrant_b: string | null;
  format_override: Partial<{
    best_of: number;
    points_to: number;
    win_by: number;
    legs_to_win: number;
  }> | null;
  /** Saved `matches.score` snapshot. The event log remains authoritative for live engines. */
  score: unknown;
  tournament_id: string;
  tournament: { id: string; name: string; sport: string; sport_config: unknown } | null;
  stage: { stage_type: string; config: { rounds?: number } | null } | null;
  category: { name: string } | null;
  a: { id: string; display_name: string } | null;
  b: { id: string; display_name: string } | null;
}

export async function fetchMatch(matchId: string): Promise<MatchDetail | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, status, round, position, stage_id, court, scheduled_at, started_at,
       winner_id, entrant_a, entrant_b, format_override, score, tournament_id,
       tournament:tournaments!matches_tournament_id_fkey(id, name, sport, sport_config),
       stage:stages!matches_stage_id_fkey(stage_type, config),
       category:tournament_categories!matches_category_id_fkey(name),
       a:entrants!matches_entrant_a_fkey(id, display_name),
       b:entrants!matches_entrant_b_fkey(id, display_name)`,
    )
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as MatchDetail | null;
}

export async function fetchEvents(matchId: string): Promise<ScoringEvent[]> {
  const { data, error } = await supabase
    .from("score_events")
    .select("id, event_type, payload, created_at")
    .eq("match_id", matchId)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    event_type: e.event_type,
    payload: (e.payload ?? {}) as Record<string, unknown>,
    created_at: e.created_at,
  }));
}

export async function isStaff(tournamentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_tournament_staff", {
    t_id: tournamentId,
    roles: ["owner", "co_organizer", "referee", "scorekeeper"],
  });
  if (error) return false;
  return data === true;
}

/**
 * Insert a score event. tournament_id and created_by are set by a DB trigger —
 * the generated Insert type requires tournament_id, so cast past it (same
 * pattern as the web app).
 */
export async function insertEvent(
  matchId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const row = { match_id: matchId, event_type: eventType, payload } as never;
  const { error } = await supabase.from("score_events").insert(row);
  if (error) throw new Error(error.message);
}

/** Calls append_score_event_guarded. A missing RPC is an error, not a direct insert. */
export async function appendScoreEventGuarded(
  input: AppendScoreEventInput,
): Promise<AppendScoreEventResult> {
  const { data, error } = await supabase.rpc("append_score_event_guarded", guardedAppendArgs(input));
  return interpretGuardedAppend(error, data);
}

export async function startMatch(matchId: string): Promise<void> {
  const { data, error } = await supabase
    .from("matches")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("status", "scheduled")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Match can't be started (already live or finished?).");
  }
}

export async function updateSnapshot(
  matchId: string,
  score: Record<string, unknown>,
): Promise<void> {
  // Best-effort: the event log is the source of truth, snapshot is a cache.
  await supabase.from("matches").update({ score: score as never }).eq("id", matchId).eq("status", "live");
}

export async function confirmResult(
  matchId: string,
  winnerId: string,
  score: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({
      status: "completed",
      winner_id: winnerId,
      score: score as never,
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("status", "live");
  if (error) throw new Error(error.message);
  await advanceWinner(matchId);
}

/** Mirror of the web repo's advanceWinner — keep the algorithms identical. */
export async function advanceWinner(matchId: string): Promise<void> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, stage_id, round, position, winner_id, stages(stage_type)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match?.winner_id || !match.stage_id) return;

  // Auto-advance is knockout-only (SYNC with web match-actions.ts): advancing
  // a group/league match would corrupt round-robin fixtures — standings are
  // recomputed on read instead.
  const stage = match.stages as unknown as { stage_type: string } | null;
  if (stage && stage.stage_type !== "knockout") return;

  const nextPosition = Math.floor(match.position / 2);
  const slot = match.position % 2 === 0 ? "entrant_a" : "entrant_b";

  const { data: next } = await supabase
    .from("matches")
    .select("id")
    .eq("stage_id", match.stage_id)
    .eq("round", match.round + 1)
    .eq("position", nextPosition)
    .maybeSingle();
  if (!next) return; // final — nothing to feed

  const patch =
    slot === "entrant_a" ? { entrant_a: match.winner_id } : { entrant_b: match.winner_id };
  const { error } = await supabase.from("matches").update(patch).eq("id", next.id);
  if (error) throw new Error(`Could not advance winner: ${error.message}`);
}

// ─── App-WP2 hub helpers ─────────────────────────────────────────────────────
// PORT of the three named web files (actions.ts / match-actions.ts /
// bracket/page.tsx) — Next-isms stripped (no "use server", no
// revalidatePath). Algorithm + .eq("status", from) guards verbatim.

// Status transitions allowed for the Settings tab (web actions.ts map).
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["published"],
  published: ["registration_open"],
  registration_open: ["registration_closed"],
  registration_closed: ["registration_open"],
};

const ENTRANT_STATUSES = ["approved", "rejected", "waitlisted", "pending"];

// ── Hub loader (one round trip, fan-out by table) ───────────────────────────

export interface HubTournament {
  id: string;
  name: string;
  sport: string;
  sport_config: unknown;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  venue_name: string | null;
}

export interface HubCategory {
  id: string;
  name: string;
  format: string;
  max_entrants: number | null;
  sort_order: number;
}

export interface HubEntrant {
  id: string;
  display_name: string;
  seed: number | null;
  status: string;
  category_id: string;
  created_at: string;
}

export interface HubContact {
  entrant_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export interface HubStage {
  id: string;
  category_id: string;
  name: string;
  stage_type: string;
  config: unknown;
  sort_order: number;
}

export interface HubMatch {
  id: string;
  category_id: string;
  stage_id: string | null;
  round: number;
  position: number;
  entrant_a: string | null;
  entrant_b: string | null;
  winner_id: string | null;
  status: string;
  score: unknown;
  court: string | null;
  scheduled_at: string | null;
  referee_id: string | null;
}

export interface HubStaff {
  user_id: string;
  staff_role: string;
  full_name: string | null;
}

export interface HubData {
  tournament: HubTournament;
  categories: HubCategory[];
  entrants: HubEntrant[];
  contacts: HubContact[];
  stages: HubStage[];
  matches: HubMatch[];
  staff: HubStaff[];
}

/** Fan-out loader for the tournament hub — single round trip with Promise.all. */
export async function fetchHub(tournamentId: string): Promise<HubData | null> {
  const [tRes, cRes, eRes, kRes, sRes, mRes, stRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select(
        "id, name, sport, sport_config, status, starts_at, ends_at, city, venue_name",
      )
      .eq("id", tournamentId)
      .maybeSingle(),
    supabase
      .from("tournament_categories")
      .select("id, name, format, max_entrants, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order"),
    supabase
      .from("entrants")
      .select("id, display_name, seed, status, category_id, created_at")
      .eq("tournament_id", tournamentId)
      .order("created_at"),
    supabase
      .from("entrant_contacts")
      .select("entrant_id, contact_name, contact_email, contact_phone")
      .eq("tournament_id", tournamentId),
    supabase
      .from("stages")
      .select("id, category_id, name, stage_type, config, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order"),
    supabase
      .from("matches")
      .select(
        "id, category_id, stage_id, round, position, entrant_a, entrant_b, winner_id, status, score, court, scheduled_at, referee_id",
      )
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("position"),
    supabase
      .from("tournament_staff")
      .select("user_id, staff_role, profiles:profiles!tournament_staff_user_id_fkey(full_name)")
      .eq("tournament_id", tournamentId),
  ]);
  if (tRes.error) throw new Error(tRes.error.message);
  if (!tRes.data) return null;
  if (cRes.error) throw new Error(cRes.error.message);
  if (eRes.error) throw new Error(eRes.error.message);
  if (kRes.error) throw new Error(kRes.error.message);
  if (sRes.error) throw new Error(sRes.error.message);
  if (mRes.error) throw new Error(mRes.error.message);
  if (stRes.error) throw new Error(stRes.error.message);

  // Supabase returns profiles either as object or array depending on the
  // relationship cardinality hint; flatten to {full_name}.
  const staff = ((stRes.data ?? []) as unknown as Array<{
    user_id: string;
    staff_role: string;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  }>).map((s) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return { user_id: s.user_id, staff_role: s.staff_role, full_name: p?.full_name ?? null };
  });

  return {
    tournament: tRes.data as HubTournament,
    categories: (cRes.data ?? []) as HubCategory[],
    entrants: (eRes.data ?? []) as HubEntrant[],
    contacts: (kRes.data ?? []) as HubContact[],
    stages: (sRes.data ?? []) as HubStage[],
    matches: (mRes.data ?? []) as HubMatch[],
    staff,
  };
}

// ── Entrants (web actions.ts → setEntrantStatus) ────────────────────────────

/** Mirror of web setEntrantStatus — same .eq("tournament_id") guard. */
export async function setEntrantStatus(
  tournamentId: string,
  entrantId: string,
  status: string,
): Promise<void> {
  if (!ENTRANT_STATUSES.includes(status)) {
    throw new Error("Invalid entrant status.");
  }
  const { data, error } = await supabase
    .from("entrants")
    .update({ status })
    .eq("id", entrantId)
    .eq("tournament_id", tournamentId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Not permitted.");
}

// ── Tournament lifecycle (web actions.ts → updateTournamentStatus) ──────────

/** Mirror of web updateTournamentStatus — double-click guard preserved. */
export async function updateTournamentStatus(
  tournamentId: string,
  from: string,
  to: string,
): Promise<void> {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Can't move from "${from}" to "${to}".`);
  }
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: to })
    .eq("id", tournamentId)
    .eq("status", from)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Status changed elsewhere — refresh and try again.");
  }
}

// ── Fixtures: generate / regenerate / advance from standings ───────────────

export interface FixtureConfig {
  doubleRoundRobin?: boolean;
  groupCount?: number | null;
  groupSize?: number | null;
  advancePerGroup?: number;
}

const LOCKED_STATUSES = ["live", "completed"];

async function clearCategoryStages(
  tournamentId: string,
  categoryId: string,
  stageIds?: string[],
): Promise<void> {
  let ids = stageIds;
  if (!ids) {
    const { data: stages } = await supabase
      .from("stages")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId);
    ids = (stages ?? []).map((s) => s.id);
  }
  if (ids.length === 0) return;

  const { data: progressed } = await supabase
    .from("matches")
    .select("id")
    .in("stage_id", ids)
    .in("status", LOCKED_STATUSES)
    .limit(1);
  if (progressed && progressed.length > 0) {
    throw new Error(
      "Matches are already in progress — fixtures can no longer be regenerated.",
    );
  }
  const { error: delMatches } = await supabase
    .from("matches")
    .delete()
    .in("stage_id", ids);
  if (delMatches) throw new Error(`Could not clear old fixtures: ${delMatches.message}`);
  const { error: delStages } = await supabase.from("stages").delete().in("id", ids);
  if (delStages) throw new Error(`Could not clear old stages: ${delStages.message}`);
}

interface MatchInsert {
  round: number;
  position: number;
  entrantA: string | null;
  entrantB: string | null;
  status: string;
  winnerId: string | null;
}

async function insertStageWithMatches(
  tournamentId: string,
  categoryId: string,
  stage: { name: string; stage_type: string; config: unknown; sort_order: number },
  matchRows: MatchInsert[],
): Promise<void> {
  const { data: stageRow, error: stageErr } = await supabase
    .from("stages")
    .insert({
      tournament_id: tournamentId,
      category_id: categoryId,
      name: stage.name,
      stage_type: stage.stage_type,
      config: stage.config as never,
      sort_order: stage.sort_order,
    })
    .select("id")
    .single();
  if (stageErr || !stageRow) {
    throw new Error(`Could not create stage: ${stageErr?.message ?? "not permitted"}`);
  }
  const { error: matchErr } = await supabase.from("matches").insert(
    matchRows.map((m) => ({
      tournament_id: tournamentId,
      category_id: categoryId,
      stage_id: stageRow.id,
      round: m.round,
      position: m.position,
      entrant_a: m.entrantA,
      entrant_b: m.entrantB,
      status: m.status,
      winner_id: m.winnerId,
      completed_at: m.status === "walkover" ? new Date().toISOString() : null,
    })),
  );
  if (matchErr) {
    await supabase.from("stages").delete().eq("id", stageRow.id);
    throw new Error(`Could not create matches: ${matchErr.message}`);
  }
}

function knockoutToInserts(matches: { round: number; position: number; entrantA: string | null; entrantB: string | null; status: string; winnerId: string | null; }[]): MatchInsert[] {
  return matches.map((m) => ({
    round: m.round,
    position: m.position,
    entrantA: m.entrantA,
    entrantB: m.entrantB,
    status: m.status,
    winnerId: m.winnerId,
  }));
}

/**
 * Port of web match-actions.ts → generateBracket.
 * Entrant ordering: seeded first by seed asc, then registration order.
 * Format comes from the category (knockout | league | groups_knockout).
 */
export async function generateBracket(
  tournamentId: string,
  categoryId: string,
  config: FixtureConfig = {},
): Promise<void> {
  const { data: category, error: cErr } = await supabase
    .from("tournament_categories")
    .select("id, format")
    .eq("id", categoryId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!category) throw new Error("Category not found.");

  await clearCategoryStages(tournamentId, categoryId);

  const { data: entrants, error: entErr } = await supabase
    .from("entrants")
    .select("id, seed")
    .eq("tournament_id", tournamentId)
    .eq("category_id", categoryId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (entErr) throw new Error(entErr.message);
  if (!entrants || entrants.length < 2) {
    throw new Error("Need at least 2 approved entrants to generate fixtures.");
  }
  const ordered = [...entrants].sort((x, y) => {
    if (x.seed != null && y.seed != null) return x.seed - y.seed;
    if (x.seed != null) return -1;
    if (y.seed != null) return 1;
    return 0;
  });

  try {
    if (category.format === "league") {
      const { generateRoundRobin } = await import("@/lib/formats/roundrobin");
      const rr = generateRoundRobin(
        ordered.map((e) => e.id),
        { doubleRoundRobin: Boolean(config.doubleRoundRobin) },
      );
      await insertStageWithMatches(
        tournamentId,
        categoryId,
        {
          name: "League",
          stage_type: "league",
          config: {
            double_round_robin: Boolean(config.doubleRoundRobin),
            entrant_count: ordered.length,
            rounds: rr.rounds,
          },
          sort_order: 0,
        },
        rr.pairings.map((p) => ({
          round: p.round,
          position: p.position,
          entrantA: p.entrantA,
          entrantB: p.entrantB,
          status: "scheduled",
          winnerId: null,
        })),
      );
    } else if (category.format === "groups_knockout") {
      const advancePerGroup = config.advancePerGroup ?? 2;
      const { generateGroupStage } = await import("@/lib/formats/groups");
      const groups = generateGroupStage(
        ordered.map((e) => e.id),
        {
          groupCount: config.groupCount ?? undefined,
          groupSize: config.groupSize ?? undefined,
          advancePerGroup,
          doubleRoundRobin: Boolean(config.doubleRoundRobin),
        },
      );
      for (const [i, g] of groups.entries()) {
        try {
          await insertStageWithMatches(
            tournamentId,
            categoryId,
            {
              name: `Group ${g.name}`,
              stage_type: "group",
              config: {
                group: g.name,
                advance_per_group: advancePerGroup,
                double_round_robin: Boolean(config.doubleRoundRobin),
                entrant_ids: g.entrantIds,
                rounds: g.rounds,
              },
              sort_order: i,
            },
            g.pairings.map((p) => ({
              round: p.round,
              position: p.position,
              entrantA: p.entrantA,
              entrantB: p.entrantB,
              status: "scheduled",
              winnerId: null,
            })),
          );
        } catch (err) {
          await clearCategoryStages(tournamentId, categoryId);
          throw err;
        }
      }
    } else {
      const { generateKnockoutBracket } = await import("@/lib/bracket/knockout");
      const bracket = generateKnockoutBracket(
        ordered.map((e) => ({ id: e.id, seed: e.seed })),
      );
      await insertStageWithMatches(
        tournamentId,
        categoryId,
        {
          name: "Knockout",
          stage_type: "knockout",
          config: bracket.stageConfig,
          sort_order: 0,
        },
        knockoutToInserts(bracket.matches),
      );
    }
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : "Could not generate.");
  }
}

/**
 * Port of web match-actions.ts → generateKnockoutFromStandings.
 * Only enabled when ALL group matches are completed/walkover.
 */
export async function generateKnockoutFromStandings(
  tournamentId: string,
  categoryId: string,
): Promise<void> {
  const { data: category, error: cErr } = await supabase
    .from("tournament_categories")
    .select("id, format")
    .eq("id", categoryId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!category) throw new Error("Category not found.");
  if (category.format !== "groups_knockout") {
    throw new Error("This category doesn't use groups + knockout.");
  }

  const { data: stages } = await supabase
    .from("stages")
    .select("id, name, stage_type, config, sort_order")
    .eq("tournament_id", tournamentId)
    .eq("category_id", categoryId)
    .order("sort_order");
  const groupStages = (stages ?? []).filter((s) => s.stage_type === "group");
  if (groupStages.length === 0) {
    throw new Error("Generate the group fixtures first.");
  }
  const existingKnockout = (stages ?? []).find((s) => s.stage_type === "knockout");
  if (existingKnockout) {
    await clearCategoryStages(tournamentId, categoryId, [existingKnockout.id]);
  }

  const groupIds = groupStages.map((s) => s.id);
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("stage_id, entrant_a, entrant_b, status, winner_id, score")
    .in("stage_id", groupIds);
  if (mErr) throw new Error(mErr.message);

  const unfinished = (matches ?? []).filter(
    (m) => !["completed", "walkover"].includes(m.status),
  ).length;
  if (unfinished > 0) {
    throw new Error(
      `${unfinished} group match${unfinished === 1 ? " is" : "es are"} not finished yet — complete (or walk over) every group match first.`,
    );
  }

  const [{ data: tournament }, { data: entrants }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("sport_config")
      .eq("id", tournamentId)
      .maybeSingle(),
    supabase
      .from("entrants")
      .select("id, display_name")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId),
  ]);
  const { computeStandings, standingsConfigForSport } = await import(
    "@/lib/formats/standings"
  );
  const cfg = standingsConfigForSport(
    (tournament?.sport_config ?? {}) as {
      table_points?: { win: number; draw: number; loss: number };
    },
  );
  const nameById = new Map((entrants ?? []).map((e) => [e.id, e.display_name]));

  const qualifiers: Array<{ group: number; rank: number; entrantId: string }> = [];
  for (const [gIdx, stage] of groupStages.entries()) {
    const sCfg = (stage.config ?? {}) as {
      advance_per_group?: number;
      entrant_ids?: string[];
    };
    const advance = sCfg.advance_per_group ?? 2;
    const ids = sCfg.entrant_ids ?? [];
    const stageMatches = (matches ?? [])
      .filter((m) => m.stage_id === stage.id && m.entrant_a && m.entrant_b)
      .map((m) => {
        const score = (m.score ?? {}) as { a?: number; b?: number };
        return {
          entrantA: m.entrant_a as string,
          entrantB: m.entrant_b as string,
          status: m.status,
          winnerId: m.winner_id,
          scoreA: typeof score.a === "number" ? score.a : 0,
          scoreB: typeof score.b === "number" ? score.b : 0,
        };
      });
    const table = computeStandings(
      stageMatches,
      ids.map((id) => ({ id, name: nameById.get(id) ?? id })),
      cfg,
    );
    if (table.length < advance) {
      throw new Error(`${stage.name} has fewer entrants than qualifiers.`);
    }
    for (let rank = 1; rank <= advance; rank++) {
      qualifiers.push({
        group: gIdx,
        rank,
        entrantId: table[rank - 1].entrantId,
      });
    }
  }
  if (qualifiers.length < 2) {
    throw new Error("Not enough qualifiers for a knockout stage.");
  }

  const { advanceFromGroups } = await import("@/lib/formats/groups");
  const bracket = advanceFromGroups(qualifiers);

  const maxSort = Math.max(...groupStages.map((s) => s.sort_order ?? 0));
  await insertStageWithMatches(
    tournamentId,
    categoryId,
    {
      name: "Knockout",
      stage_type: "knockout",
      config: {
        ...bracket.stageConfig,
        from_groups: true,
        qualifiers: qualifiers.map((q) => q.entrantId),
      },
      sort_order: maxSort + 1,
    },
    knockoutToInserts(bracket.matches),
  );
}

// ── Schedule (web match-actions.ts → updateMatchSchedule / setWalkover) ─────

/** Mirror of web updateMatchSchedule. */
export async function updateMatchSchedule(
  matchId: string,
  input: { court: string; scheduledAt: string; refereeId: string },
): Promise<void> {
  const { data, error } = await supabase
    .from("matches")
    .update({
      court: input.court.trim() || null,
      scheduled_at: input.scheduledAt || null,
      referee_id: input.refereeId || null,
    })
    .eq("id", matchId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Not permitted.");
}

/** Mirror of web setWalkover (uses the existing advanceWinner above). */
export async function setWalkover(
  matchId: string,
  winnerSide: "a" | "b",
): Promise<void> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, entrant_a, entrant_b, status")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) throw new Error("Match not found.");
  if (match.status === "completed") throw new Error("Match is already completed.");
  const winnerId = winnerSide === "a" ? match.entrant_a : match.entrant_b;
  if (!winnerId) throw new Error("That side has no entrant yet.");

  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "walkover",
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Not permitted.");

  await advanceWinner(matchId);
}

// ─── Discover / Home feed (public, anon-readable via *_public_read RLS) ───────
// Reads only tournaments with visibility public/unlisted and status != draft
// (is_tournament_public), their matches, approved entrants, and categories.

export interface MatchScore {
  a?: number;
  b?: number;
  display?: string;
  points_a?: number;
  points_b?: number;
}

export interface FeedMatch {
  id: string;
  status: string; // live | scheduled | completed | walkover
  scheduled_at: string | null;
  started_at: string | null;
  round: number;
  score: MatchScore | null;
  tournament: { id: string; name: string; sport: string; city: string | null } | null;
  category: { name: string } | null;
  a: { display_name: string } | null;
  b: { display_name: string } | null;
}

const FEED_SELECT = `id, status, scheduled_at, started_at, round, score,
  tournament:tournaments!matches_tournament_id_fkey(id, name, sport, city),
  category:tournament_categories!matches_category_id_fkey(name),
  a:entrants!matches_entrant_a_fkey(display_name),
  b:entrants!matches_entrant_b_fkey(display_name)`;

/** Currently-live matches across all public tournaments. */
export async function fetchLiveMatches(): Promise<FeedMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(FEED_SELECT)
    .eq("status", "live")
    .order("started_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FeedMatch[];
}

/** Upcoming (scheduled) matches, soonest first; undated ones sort last. */
export async function fetchUpcomingMatches(limit = 20): Promise<FeedMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(FEED_SELECT)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FeedMatch[];
}

/** Most recently finished matches (results feed fallback when nothing is live). */
export async function fetchRecentResults(limit = 10): Promise<FeedMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(FEED_SELECT)
    .in("status", ["completed", "walkover"])
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FeedMatch[];
}

export interface PublicTournament {
  id: string;
  name: string;
  sport: string;
  status: string;
  city: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_url: string | null;
}

/** Public tournaments for the Discover grid / sport filter. */
export async function fetchPublicTournaments(limit = 30): Promise<PublicTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, sport, status, city, starts_at, ends_at, banner_url")
    .eq("visibility", "public")
    .neq("status", "draft")
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicTournament[];
}

/** Read a match score json into two display strings (home, away). */
export function scoreParts(score: MatchScore | null): { home: string; away: string } {
  if (!score) return { home: "0", away: "0" };
  if (typeof score.display === "string" && score.display.includes("-")) {
    const [h, a] = score.display.split("-");
    return { home: (h ?? "0").trim(), away: (a ?? "0").trim() };
  }
  if (score.points_a != null || score.points_b != null) {
    return { home: String(score.points_a ?? 0), away: String(score.points_b ?? 0) };
  }
  return { home: String(score.a ?? 0), away: String(score.b ?? 0) };
}
