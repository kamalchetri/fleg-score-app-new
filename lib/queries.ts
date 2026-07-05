// Data-access helpers. All through RLS (anon key) — the DB is the gate.
import { supabase } from "@/lib/supabase";
import type { ScoringEvent } from "@/lib/scoring";

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
  tournament_id: string;
  tournament: { id: string; name: string; sport: string; sport_config: unknown } | null;
  category: { name: string } | null;
  a: { id: string; display_name: string } | null;
  b: { id: string; display_name: string } | null;
}

export async function fetchMatch(matchId: string): Promise<MatchDetail | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, status, round, position, stage_id, court, scheduled_at, started_at,
       winner_id, entrant_a, entrant_b, tournament_id,
       tournament:tournaments!matches_tournament_id_fkey(id, name, sport, sport_config),
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
  await supabase.from("matches").update({ score }).eq("id", matchId).eq("status", "live");
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
      score,
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
