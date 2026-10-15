import { useEffect, useState } from "react";
import { asRows, rpc, rpcIdList, table, type QueryResult } from "@/lib/supabase-extra";

export type PickSide = "a" | "b";

export interface PickTally {
  match_id: string;
  a_count: number;
  b_count: number;
  total: number;
}

export interface MyPick {
  match_id: string;
  side: PickSide;
  is_correct: boolean | null;
  xp_awarded: number | null;
}

export function canChangePick(match: {
  status: string;
  started_at?: string | null;
}): boolean {
  if (match.started_at) return false;
  const status = match.status.toLowerCase();
  return status === "scheduled" || status === "live";
}

function asTally(row: Record<string, unknown>): PickTally | null {
  if (row.match_id == null) return null;
  const a = Number(row.a_count ?? 0);
  const b = Number(row.b_count ?? 0);
  const total = Number(row.total ?? a + b);
  return { match_id: String(row.match_id), a_count: a, b_count: b, total };
}

export async function fetchTallies(matchIds: string[]): Promise<Record<string, PickTally>> {
  if (matchIds.length === 0) return {};
  const rows = await rpcIdList<Record<string, unknown>[]>("match_pick_tally", matchIds, [
    "match_ids",
    "ids",
    "p_ids",
  ]);
  const map: Record<string, PickTally> = {};
  for (const row of asRows(rows)) {
    const tally = asTally(row);
    if (tally) map[tally.match_id] = tally;
  }
  return map;
}

export function usePickTallies(matchIds: string[]): Record<string, PickTally> {
  const key = [...matchIds].sort().join(",");
  const [map, setMap] = useState<Record<string, PickTally>>({});
  useEffect(() => {
    if (!key) {
      setMap({});
      return;
    }
    let cancel = false;
    fetchTallies(key.split(","))
      .then((next) => {
        if (!cancel) setMap(next);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [key]);
  return map;
}

export async function fetchMyPick(matchId: string, userId: string): Promise<MyPick | null> {
  const { data, error } = (await table("match_picks")
    .select("match_id, side, is_correct, xp_awarded")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .maybeSingle()) as QueryResult<Record<string, unknown> | null>;
  if (error) throw new Error(error.message);
  if (!data) return null;
  const side = data.side === "b" ? "b" : "a";
  return {
    match_id: String(data.match_id),
    side,
    is_correct: data.is_correct == null ? null : Boolean(data.is_correct),
    xp_awarded: data.xp_awarded == null ? null : Number(data.xp_awarded),
  };
}

export async function upsertPick(matchId: string, userId: string, side: PickSide): Promise<void> {
  const { error } = (await table("match_picks").upsert(
    { match_id: matchId, user_id: userId, side },
    { onConflict: "match_id,user_id" },
  )) as QueryResult<unknown>;
  if (error) throw new Error(error.message);
}

export async function fetchMyXp(): Promise<number> {
  const value = await rpc<number | string | null>("my_xp");
  return Number(value ?? 0);
}
