// Synthetic ranked-results lab data. Caps and slot counts are lab settings, not NSPG rules.

import type { RankedAction, RankedEntrant } from "./engine";

export interface RankedLabFixture {
  id: string;
  label: string;
  note: string;
  rules: unknown;
  entrants: RankedEntrant[];
  actions: RankedAction[];
  finalized: boolean;
}

const SPRINT_RULES = {
  mode: "time",
  unit: "ms",
  maxAttempts: 1,
  aggregation: "final",
  qualifierCount: 3,
  tiePolicy: "shared_rank",
  allowedStatuses: ["DNS", "DNF", "DSQ"],
  maxValue: 120000,
} as const;

const DISTANCE_RULES = {
  mode: "distance",
  unit: "mm",
  maxAttempts: 3,
  aggregation: "best",
  qualifierCount: null,
  tiePolicy: "shared_rank",
  allowedStatuses: [],
  maxValue: 20000,
} as const;

const POINTS_RULES = {
  mode: "points",
  unit: "points",
  maxAttempts: 1,
  aggregation: "final",
  qualifierCount: 2,
  tiePolicy: "shared_rank",
  allowedStatuses: [],
  maxValue: 100,
} as const;

function people(names: Array<[string, string, string]>): RankedEntrant[] {
  return names.map(([id, name, district]) => ({ id, name, district }));
}

export const RANKED_LAB_FIXTURES: RankedLabFixture[] = [
  {
    id: "lab-sprint",
    label: "Sprint time",
    note: "Lower time ranks higher. Lab slot count is 3. The 2:00 cap is a lab limit.",
    rules: SPRINT_RULES,
    entrants: people([
      ["lab-sprint-1", "Ava Kire", "Kohima"],
      ["lab-sprint-2", "Ben Lotha", "Dimapur"],
      ["lab-sprint-3", "Chubala Ao", "Mokokchung"],
      ["lab-sprint-4", "Doli Sema", "Zunheboto"],
      ["lab-sprint-5", "Esther Jami", "Phek"],
      ["lab-sprint-6", "Femi Yim", "Wokha"],
    ]),
    actions: [],
    finalized: false,
  },
  {
    id: "lab-distance",
    label: "Distance attempts",
    note: "Best of 3 lab attempts. Higher distance ranks higher. No qualifier list.",
    rules: DISTANCE_RULES,
    entrants: people([
      ["lab-distance-1", "Gail Sangtam", "Kiphire"],
      ["lab-distance-2", "Hekani Sumi", "Tuensang"],
      ["lab-distance-3", "Imsu Longkumer", "Mon"],
      ["lab-distance-4", "Juno Murry", "Peren"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-distance-1", value: 6120 },
      { kind: "attempt", entrantId: "lab-distance-1", value: 6450 },
      { kind: "attempt", entrantId: "lab-distance-1", value: 6330 },
      { kind: "attempt", entrantId: "lab-distance-2", value: 6700 },
      { kind: "attempt", entrantId: "lab-distance-2", value: 6550 },
      { kind: "attempt", entrantId: "lab-distance-3", value: 6010 },
      { kind: "attempt", entrantId: "lab-distance-4", value: 6280 },
      { kind: "attempt", entrantId: "lab-distance-4", value: 6400 },
    ],
    finalized: false,
  },
  {
    id: "lab-points",
    label: "Archery points",
    note: "Integer points prototype. The cap of 100 and the 2 lab slots are not an official round or cut.",
    rules: POINTS_RULES,
    entrants: people([
      ["lab-points-1", "Kato Archery", "Kohima"],
      ["lab-points-2", "Lima Archery", "Dimapur"],
      ["lab-points-3", "Meren Archery", "Mokokchung"],
      ["lab-points-4", "Naro Archery", "Phek"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-points-1", value: 86 },
      { kind: "attempt", entrantId: "lab-points-2", value: 79 },
      { kind: "attempt", entrantId: "lab-points-3", value: 74 },
      { kind: "attempt", entrantId: "lab-points-4", value: 71 },
    ],
    finalized: false,
  },
  {
    id: "lab-tie-clear",
    label: "Shared tie",
    note: "Two people share first. Both fit inside 3 lab slots, so the tie is not on the cut.",
    rules: { ...POINTS_RULES, qualifierCount: 3, maxValue: 100 },
    entrants: people([
      ["lab-clear-1", "Omar Tie", "Kohima"],
      ["lab-clear-2", "Pari Tie", "Dimapur"],
      ["lab-clear-3", "Queenie Next", "Wokha"],
      ["lab-clear-4", "Raju Outside", "Mon"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-clear-1", value: 90 },
      { kind: "attempt", entrantId: "lab-clear-2", value: 90 },
      { kind: "attempt", entrantId: "lab-clear-3", value: 80 },
      { kind: "attempt", entrantId: "lab-clear-4", value: 70 },
    ],
    finalized: false,
  },
  {
    id: "lab-tie-cut",
    label: "Cut tie",
    note: "The tie sits on the last lab slot. Neither tied person is selected.",
    rules: { ...POINTS_RULES, qualifierCount: 2, maxValue: 100 },
    entrants: people([
      ["lab-cut-1", "Sola Clear", "Kohima"],
      ["lab-cut-2", "Tia Boundary", "Dimapur"],
      ["lab-cut-3", "Udi Boundary", "Phek"],
      ["lab-cut-4", "Vero Behind", "Mon"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-cut-1", value: 95 },
      { kind: "attempt", entrantId: "lab-cut-2", value: 88 },
      { kind: "attempt", entrantId: "lab-cut-3", value: 88 },
      { kind: "attempt", entrantId: "lab-cut-4", value: 76 },
    ],
    finalized: false,
  },
  {
    id: "lab-status",
    label: "DNS DNF DSQ",
    note: "Statuses stay labels. They are not given a time.",
    rules: SPRINT_RULES,
    entrants: people([
      ["lab-status-1", "Wati Finished", "Kohima"],
      ["lab-status-2", "Xuvi Finished", "Dimapur"],
      ["lab-status-3", "Yani Absent", "Mon"],
      ["lab-status-4", "Zeno Stopped", "Phek"],
      ["lab-status-5", "Alem Excluded", "Wokha"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-status-1", value: 11240 },
      { kind: "attempt", entrantId: "lab-status-2", value: 11880 },
      { kind: "status", entrantId: "lab-status-3", status: "DNS" },
      { kind: "status", entrantId: "lab-status-4", status: "DNF" },
      { kind: "status", entrantId: "lab-status-5", status: "DSQ" },
    ],
    finalized: false,
  },
  {
    id: "lab-invalid",
    label: "Invalid rules",
    note: "Mode alone is not a ruleset. Entry stays closed.",
    rules: { mode: "time" },
    entrants: people([
      ["lab-invalid-1", "No Rules", "Kohima"],
      ["lab-invalid-2", "Still None", "Dimapur"],
      ["lab-invalid-3", "Also None", "Mon"],
    ]),
    actions: [],
    finalized: false,
  },
  {
    id: "lab-names",
    label: "Long names",
    note: "Long entrant and district names wrap instead of overflowing the row.",
    rules: { ...SPRINT_RULES, qualifierCount: null, allowedStatuses: [] },
    entrants: people([
      ["lab-names-1", "Akumnaro Longchari Jamir of the Northern Spur", "Upper Western District Collective"],
      ["lab-names-2", "Bendangnungsang Walling of the River Terrace", "Lower Eastern District Collective"],
      ["lab-names-3", "Chubasangla Ozukum of the High Ridge", "Central Hill District Collective"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-names-1", value: 12450 },
      { kind: "attempt", entrantId: "lab-names-2", value: 13110 },
    ],
    finalized: false,
  },
  {
    id: "lab-final",
    label: "Finalized",
    note: "Completed standings preview. Entry and undo stay hidden.",
    rules: { ...SPRINT_RULES, qualifierCount: null, allowedStatuses: ["DNS"] },
    entrants: people([
      ["lab-final-1", "First Lane", "Kohima"],
      ["lab-final-2", "Second Lane", "Dimapur"],
      ["lab-final-3", "Third Lane", "Phek"],
      ["lab-final-4", "Absent Lane", "Mon"],
    ]),
    actions: [
      { kind: "attempt", entrantId: "lab-final-1", value: 10880 },
      { kind: "attempt", entrantId: "lab-final-2", value: 11020 },
      { kind: "attempt", entrantId: "lab-final-3", value: 11340 },
      { kind: "status", entrantId: "lab-final-4", status: "DNS" },
    ],
    finalized: true,
  },
];
