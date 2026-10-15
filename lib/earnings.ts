import { supabase } from "@/lib/supabase";
import { asRows, rpc, table, type QueryResult } from "@/lib/supabase-extra";

export interface EarningRow {
  source: string;
  event_id: string;
  title: string;
  registrations: number;
  gross: number;
  fee: number;
  net: number;
  status: string;
}

export interface PayoutRow {
  reference: string;
  amount: number;
  status: string;
  cycle: string | null;
  scheduled_at: string | null;
  paid_at: string | null;
  utr_reference: string | null;
}

export interface PayoutAccount {
  label: string;
  masked: string;
}

export interface EarningsBundle {
  earnings: EarningRow[];
  payouts: PayoutRow[];
  account: PayoutAccount;
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asEarning(row: Record<string, unknown>): EarningRow {
  return {
    source: String(row.source ?? ""),
    event_id: String(row.event_id ?? ""),
    title: String(row.title ?? "Event"),
    registrations: num(row.registrations),
    gross: num(row.gross),
    fee: num(row.fee),
    net: num(row.net),
    status: String(row.status ?? ""),
  };
}

function asPayout(row: Record<string, unknown>): PayoutRow {
  return {
    reference: String(row.reference ?? ""),
    amount: num(row.amount),
    status: String(row.status ?? ""),
    cycle: row.cycle == null ? null : String(row.cycle),
    scheduled_at: row.scheduled_at == null ? null : String(row.scheduled_at),
    paid_at: row.paid_at == null ? null : String(row.paid_at),
    utr_reference: row.utr_reference == null ? null : String(row.utr_reference),
  };
}

export function maskPayoutDetails(details: unknown): PayoutAccount {
  if (!details || typeof details !== "object") {
    return { label: "No payout account", masked: "Add details to receive disbursements" };
  }
  const d = details as Record<string, unknown>;
  const upi =
    typeof d.upi === "string" ? d.upi : typeof d.upi_id === "string" ? d.upi_id : null;
  const account = typeof d.account_number === "string" ? d.account_number : null;
  const bank =
    typeof d.bank_name === "string"
      ? d.bank_name
      : typeof d.account_name === "string"
        ? d.account_name
        : "Bank account";
  if (upi) {
    const at = upi.indexOf("@");
    const masked = at > 1 ? `${upi.slice(0, 2)}•••${upi.slice(at)}` : "•••@upi";
    return { label: "UPI", masked };
  }
  if (account && account.length >= 4) {
    return { label: bank, masked: `•••• ${account.slice(-4)}` };
  }
  const keys = Object.keys(d);
  if (keys.length === 0) {
    return { label: "No payout account", masked: "Add details to receive disbursements" };
  }
  return { label: bank, masked: "Details on file" };
}

export function sumEarnings(rows: EarningRow[]): { gross: number; fee: number; net: number } {
  return rows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.gross,
      fee: acc.fee + row.fee,
      net: acc.net + row.net,
    }),
    { gross: 0, fee: 0, net: 0 },
  );
}

export function payoutInMonth(row: PayoutRow, year: number, month: number): boolean {
  const iso = row.paid_at ?? row.scheduled_at;
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

export async function fetchEarnings(userId: string): Promise<EarningsBundle> {
  const [earningRows, payoutRes, profile] = await Promise.all([
    rpc<Record<string, unknown>[]>("organizer_earnings"),
    table("payouts")
      .select("reference, amount, status, cycle, scheduled_at, paid_at, utr_reference")
      .eq("organizer_id", userId)
      .order("scheduled_at", { ascending: false }) as Promise<QueryResult<Record<string, unknown>[] | null>>,
    supabase.from("organizer_profiles").select("payout_details").eq("user_id", userId).maybeSingle(),
  ]);
  if (payoutRes.error) throw new Error(payoutRes.error.message);
  if (profile.error) throw new Error(profile.error.message);

  return {
    earnings: asRows(earningRows).map(asEarning),
    payouts: (payoutRes.data ?? []).map(asPayout),
    account: maskPayoutDetails(profile.data?.payout_details),
  };
}
