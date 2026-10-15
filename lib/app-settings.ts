import { table, type QueryResult } from "@/lib/supabase-extra";

export interface AppSettings {
  platform_fee_bps: number;
  xp_multiplier: number;
  payout_cycle_note: string | null;
}

const FALLBACK: AppSettings = {
  platform_fee_bps: 500,
  xp_multiplier: 1,
  payout_cycle_note: null,
};

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = (await table("app_settings")
    .select("platform_fee_bps, xp_multiplier, payout_cycle_note")
    .limit(1)
    .maybeSingle()) as QueryResult<Record<string, unknown> | null>;
  if (error) throw new Error(error.message);
  if (!data) return FALLBACK;
  return {
    platform_fee_bps: Number(data.platform_fee_bps ?? FALLBACK.platform_fee_bps),
    xp_multiplier: Number(data.xp_multiplier ?? FALLBACK.xp_multiplier),
    payout_cycle_note: data.payout_cycle_note == null ? null : String(data.payout_cycle_note),
  };
}
