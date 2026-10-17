/**
 * Seed dataset for the NSPG hub, shaped exactly like the live contract in ./nspg-live.
 * Lets Task B build + run before the 24 Oct production cutover. Replaced transparently
 * by Supabase read-views; screens never import this file directly.
 */
import type {
  NspgSport, Fixture, MatchDetail, Standings, MedalRow,
} from "./nspg-live";

const side = (id: string, name: string, district: string, score: number | null = null) => ({
  id, name, district, logoUrl: null as string | null, score,
});

export const SEED_SPORTS: NspgSport[] = [
  { slug: "football", name: "Football", icon: "football", liveCount: 1, todayCount: 3 },
  { slug: "basketball", name: "Basketball", icon: "basketball", liveCount: 0, todayCount: 2 },
  { slug: "volleyball", name: "Volleyball", icon: "volleyball", liveCount: 1, todayCount: 4 },
  { slug: "boxing", name: "Boxing", icon: "boxing-glove", liveCount: 0, todayCount: 6 },
  { slug: "archery", name: "Archery", icon: "target", liveCount: 0, todayCount: 2 },
  { slug: "athletics", name: "Athletics", icon: "run", liveCount: 0, todayCount: 8 },
];

export const SEED_FIXTURES: Fixture[] = [
  {
    id: "m-fbl-1", sportSlug: "football", category: "Men", roundLabel: "Group A",
    status: "live", startAt: "2026-11-03T10:30:00+05:30", venue: "Chümoukedima Stadium",
    sideA: side("t1", "Kohima", "Kohima", 2), sideB: side("t2", "Dimapur", "Dimapur", 1),
    clock: "2nd Half 72'",
  },
  {
    id: "m-fbl-2", sportSlug: "football", category: "Men", roundLabel: "Group A",
    status: "scheduled", startAt: "2026-11-03T15:00:00+05:30", venue: "Chümoukedima Stadium",
    sideA: side("t3", "Mokokchung", "Mokokchung"), sideB: side("t4", "Tuensang", "Tuensang"),
    clock: null,
  },
  {
    id: "m-fbl-3", sportSlug: "football", category: "Men", roundLabel: "Group B",
    status: "final", startAt: "2026-11-02T15:00:00+05:30", venue: "Dimapur DSA Ground",
    sideA: side("t5", "Peren", "Peren", 0), sideB: side("t6", "Wokha", "Wokha", 3),
    clock: null,
  },
  {
    id: "m-vbl-1", sportSlug: "volleyball", category: "Women", roundLabel: "Semi-final",
    status: "live", startAt: "2026-11-03T11:00:00+05:30", venue: "Indoor Stadium, Kohima",
    sideA: side("v1", "Phek", "Phek", 1), sideB: side("v2", "Zunheboto", "Zunheboto", 1),
    clock: "Set 3",
  },
];

export const SEED_LIVE: Fixture[] = SEED_FIXTURES.filter((f) => f.status === "live");

export const SEED_MATCH: Record<string, MatchDetail> = {
  "m-fbl-1": {
    ...SEED_FIXTURES[0],
    periodLabel: "2nd Half",
    events: [
      { minute: "12'", type: "Goal", side: "a", detail: "Goal - Kohima (K. Rio)" },
      { minute: "34'", type: "Goal", side: "b", detail: "Goal - Dimapur (A. Sumi)" },
      { minute: "58'", type: "Yellow Card", side: "b", detail: "Yellow - Dimapur (T. Lotha)" },
      { minute: "67'", type: "Goal", side: "a", detail: "Goal - Kohima (M. Angami)" },
    ],
  },
};

export const SEED_STANDINGS: Record<string, Standings> = {
  football: {
    sportSlug: "football", category: "Men", format: "groups",
    groups: [
      {
        groupLabel: "Group A", qualifyCount: 2,
        rows: [
          { rank: 1, team: "Kohima", district: "Kohima", played: 2, won: 2, drawn: 0, lost: 0, points: 6 },
          { rank: 2, team: "Mokokchung", district: "Mokokchung", played: 2, won: 1, drawn: 0, lost: 1, points: 3 },
          { rank: 3, team: "Dimapur", district: "Dimapur", played: 2, won: 1, drawn: 0, lost: 1, points: 3 },
          { rank: 4, team: "Tuensang", district: "Tuensang", played: 2, won: 0, drawn: 0, lost: 2, points: 0 },
        ],
      },
    ],
  },
};

export const SEED_MEDALS: MedalRow[] = [
  { district: "Kohima", gold: 8, silver: 5, bronze: 6, total: 19 },
  { district: "Dimapur", gold: 6, silver: 7, bronze: 4, total: 17 },
  { district: "Mokokchung", gold: 5, silver: 3, bronze: 5, total: 13 },
  { district: "Phek", gold: 3, silver: 4, bronze: 2, total: 9 },
  { district: "Wokha", gold: 2, silver: 2, bronze: 3, total: 7 },
];
