/** Integer INR rupees → display. Null fee means a free event. */
export function formatInr(rupees: number | null | undefined): string {
  if (rupees == null) return "FREE";
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

/** Compact prize line, e.g. ₹1.2L Prize Pool. */
export function formatPrizePool(rupees: number): string {
  if (rupees >= 100000) {
    const lakhs = rupees / 100000;
    const label = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1).replace(/\.0$/, "");
    return `₹${label}L Prize Pool`;
  }
  return `${formatInr(rupees)} Prize Pool`;
}

/** Platform fee in rupees from basis points (500 = 5%). Rounded to the rupee. */
export function feeFromBps(amountRupees: number, bps: number): number {
  return Math.round((amountRupees * bps) / 10000);
}

export function formatBps(bps: number): string {
  const pct = bps / 100;
  const label = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
  return `${label}%`;
}
