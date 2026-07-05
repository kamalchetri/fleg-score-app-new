export function formatDateTime(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateRange(a: string | null, b: string | null): string {
  if (!a) return "Dates TBD";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return b && b !== a ? `${fmt(a)} – ${fmt(b)}` : fmt(a);
}

/** mm:ss elapsed since an ISO timestamp (never negative). */
export function elapsedSince(iso: string, now: number): string {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
