// Standard double-out checkout suggestions (remaining → dart notation).

const CHECKOUTS: Record<number, string> = {
  170: "T20 T20 Bull",
  167: "T20 T19 Bull",
  164: "T20 T18 Bull",
  161: "T20 T17 Bull",
  160: "T20 T20 D20",
  158: "T20 T20 D19",
  157: "T20 T19 D20",
  156: "T20 T20 D18",
  154: "T20 T18 D20",
  152: "T20 T20 D16",
  151: "T20 T17 D20",
  150: "T20 T18 D18",
  149: "T20 T19 D16",
  148: "T20 T20 D14",
  147: "T20 T17 D18",
  146: "T20 T18 D16",
  145: "T20 T15 D20",
  144: "T20 T20 D12",
  143: "T20 T17 D16",
  142: "T20 T14 D20",
  141: "T20 T19 D12",
  140: "T20 T20 D10",
  139: "T19 T14 D20",
  138: "T20 T18 D12",
  137: "T20 T19 D10",
  136: "T20 T20 D8",
  135: "T20 T17 D12",
  134: "T20 T14 D16",
  133: "T20 T19 D8",
  132: "T20 T16 D12",
  131: "T20 T13 D16",
  130: "T20 T20 D5",
  129: "T19 T14 D15",
  128: "T18 T14 D16",
  127: "T20 T17 D8",
  126: "T19 T19 D6",
  125: "T20 T19 D4",
  124: "T20 T16 D8",
  123: "T19 T16 D9",
  122: "T18 T18 D7",
  121: "T20 T11 D14",
  120: "T20 20 D20",
  110: "T20 Bull",
  100: "T20 D20",
  80: "T20 D10",
  60: "20 D20",
  50: "Bull",
  40: "D20",
  32: "D16",
  24: "D12",
  16: "D8",
  8: "D4",
  4: "D2",
  2: "D1",
};

/** Returns a finish suggestion when `remaining` is checkable (≤170, even or bull). */
export function dartsCheckoutSuggestion(remaining: number): string | null {
  if (remaining <= 0 || remaining > 170) return null;
  if (remaining === 1) return null;
  if (CHECKOUTS[remaining]) return CHECKOUTS[remaining];
  if (remaining % 2 === 0 && remaining <= 40) return `D${remaining / 2}`;
  return null;
}

export function isDartsFinishable(remaining: number): boolean {
  return dartsCheckoutSuggestion(remaining) !== null;
}
