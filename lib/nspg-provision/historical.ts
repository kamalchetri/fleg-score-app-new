import type { ImportClass } from "./classify";

/** 11 October 2026 read-only snapshot. Not a hardcoded live total. */
export const OCTOBER_11_BASELINE = {
  label: "2026-10-11",
  confirmedSubmissions: 359,
  confirmedLinks: 606,
  withdrawnSubmissions: 6,
  classes: {
    auto_importable_singles: 144,
    pending_qualification: 23,
    ranked_result: 85,
    unlinked_pair: 30,
    district_roster: 307,
    artistic_ensemble: 1,
    multi_weight_conflict: 16,
    other_unresolved: 0,
  } satisfies Record<ImportClass, number>,
  bySport: {
    archery: { people: 42, links: 121 },
    athletics: { people: 26, links: 59 },
    badminton: { people: 12, links: 26 },
    basketball: { people: 74, links: 74 },
    boxing: { people: 35, links: 36 },
    football: { people: 21, links: 21 },
    lawn_tennis: { people: 10, links: 30 },
    pencak_silat: { people: 1, links: 2 },
    sepaktakraw: { people: 39, links: 113 },
    table_tennis: { people: 9, links: 26 },
    taekwondo: { people: 29, links: 29 },
    volleyball: { people: 1, links: 2 },
    wrestling: { people: 1, links: 1 },
    wushu: { people: 59, links: 66 },
  } as Record<string, { people: number; links: number }>,
};
