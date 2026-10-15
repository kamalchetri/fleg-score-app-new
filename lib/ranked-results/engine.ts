// Pure multi-entrant ranked results. No database, no brackets, and no entrant creation.
// Qualification output is informational. A tie on the cut is left unresolved.

export const RANKED_STATUSES = ["DNS", "DNF", "DSQ"] as const;
export type RankedStatus = (typeof RANKED_STATUSES)[number];
export type RankedMode = "time" | "distance" | "points";
export type RankedUnit = "ms" | "mm" | "points";
export type RankedAggregation = "best" | "final";

export interface RankedRules {
  mode: RankedMode;
  unit: RankedUnit;
  maxAttempts: number;
  aggregation: RankedAggregation;
  qualifierCount: number | null;
  tiePolicy: "shared_rank";
  allowedStatuses: RankedStatus[];
  maxValue: number;
}

export interface RankedEntrant {
  id: string;
  name: string;
  district: string;
}

export type RankedAction =
  | { kind: "attempt"; entrantId: string; value: number }
  | { kind: "status"; entrantId: string; status: RankedStatus };

export interface RankedBoard {
  entrants: RankedEntrant[];
  actions: RankedAction[];
}

export type QualificationState = "qualified" | "not_qualified" | "unresolved_tie" | "none";

export interface RankedStanding {
  entrantId: string;
  name: string;
  district: string;
  attempts: number[];
  rankedValue: number | null;
  status: RankedStatus | null;
  rank: number | null;
  tied: boolean;
  qualification: QualificationState;
}

export interface RankedProjection {
  rows: RankedStanding[];
  qualifierIds: string[];
  qualificationNote: "none" | "clear" | "unresolved_tie";
  createsEntrants: false;
  createsBracket: false;
}

const UNIT_FOR_MODE: Record<RankedMode, RankedUnit> = {
  time: "ms",
  distance: "mm",
  points: "points",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) return null;
  return value;
}

export function parseRankedRules(input: unknown): { ok: true; rules: RankedRules } | { ok: false; reason: string } {
  if (!isRecord(input)) return { ok: false, reason: "incomplete" };
  if (!("mode" in input) || !("unit" in input) || !("maxAttempts" in input) || !("aggregation" in input)) {
    return { ok: false, reason: "incomplete" };
  }
  if (!("qualifierCount" in input) || !("tiePolicy" in input) || !("allowedStatuses" in input) || !("maxValue" in input)) {
    return { ok: false, reason: "incomplete" };
  }
  const mode = input.mode;
  if (mode !== "time" && mode !== "distance" && mode !== "points") return { ok: false, reason: "invalid_mode" };
  const unit = UNIT_FOR_MODE[mode];
  if (input.unit !== unit) return { ok: false, reason: "invalid_unit" };
  const maxAttempts = safeInt(input.maxAttempts);
  if (maxAttempts === null || maxAttempts < 1) return { ok: false, reason: "invalid_attempts" };
  if (input.aggregation !== "best" && input.aggregation !== "final") return { ok: false, reason: "invalid_aggregation" };
  if (input.aggregation === "final" && maxAttempts !== 1) return { ok: false, reason: "invalid_attempts" };
  let qualifierCount: number | null;
  if (input.qualifierCount === null) {
    qualifierCount = null;
  } else {
    const parsed = safeInt(input.qualifierCount);
    if (parsed === null || parsed < 1) return { ok: false, reason: "invalid_qualifier" };
    qualifierCount = parsed;
  }
  if (input.tiePolicy !== "shared_rank") return { ok: false, reason: "invalid_tie_policy" };
  if (!Array.isArray(input.allowedStatuses)) return { ok: false, reason: "invalid_statuses" };
  const allowedStatuses: RankedStatus[] = [];
  for (const status of input.allowedStatuses) {
    if (status !== "DNS" && status !== "DNF" && status !== "DSQ") return { ok: false, reason: "invalid_statuses" };
    if (allowedStatuses.includes(status)) return { ok: false, reason: "invalid_statuses" };
    allowedStatuses.push(status);
  }
  const maxValue = safeInt(input.maxValue);
  if (maxValue === null || maxValue < 0) return { ok: false, reason: "invalid_max_value" };
  return {
    ok: true,
    rules: {
      mode,
      unit,
      maxAttempts,
      aggregation: input.aggregation,
      qualifierCount,
      tiePolicy: "shared_rank",
      allowedStatuses,
      maxValue,
    },
  };
}

export function formatStoredValue(rules: RankedRules, value: number): string {
  if (rules.unit === "ms") {
    const minutes = Math.floor(value / 60000);
    const remainder = value % 60000;
    const seconds = Math.floor(remainder / 1000);
    const millis = remainder % 1000;
    const fraction = String(millis).padStart(3, "0");
    if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, "0")}.${fraction}`;
    return `${seconds}.${fraction}`;
  }
  if (rules.unit === "mm") {
    const whole = Math.floor(value / 1000);
    const fraction = value % 1000;
    return `${whole}.${String(fraction).padStart(3, "0")}`;
  }
  return String(value);
}

export function resultUnitLabel(rules: RankedRules): string {
  if (rules.unit === "ms") return "s";
  if (rules.unit === "mm") return "m";
  return "pts";
}

export function parseResultInput(
  rules: RankedRules,
  raw: string,
): { ok: true; value: number } | { ok: false; reason: "empty" | "malformed" | "negative" | "non_finite" | "out_of_range" } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (/nan|infinity/i.test(trimmed)) return { ok: false, reason: "non_finite" };
  if (trimmed.startsWith("-")) return { ok: false, reason: "negative" };
  let value: number | null = null;
  if (rules.unit === "ms") {
    value = parseTime(trimmed);
  } else if (rules.unit === "mm") {
    value = parseDistance(trimmed);
  } else if (/^\d+$/.test(trimmed)) {
    value = Number(trimmed);
  }
  if (value === null || !Number.isFinite(value)) return { ok: false, reason: "malformed" };
  if (!Number.isSafeInteger(value)) return { ok: false, reason: "malformed" };
  if (value > rules.maxValue) return { ok: false, reason: "out_of_range" };
  return { ok: true, value };
}

function parseTime(raw: string): number | null {
  const clock = /^(\d{1,2}):(\d{2})\.(\d{3})$/.exec(raw);
  if (clock) {
    const minutes = Number(clock[1]);
    const seconds = Number(clock[2]);
    const millis = Number(clock[3]);
    if (seconds >= 60) return null;
    return minutes * 60000 + seconds * 1000 + millis;
  }
  const plain = /^(\d{1,4})\.(\d{3})$/.exec(raw);
  if (!plain) return null;
  return Number(plain[1]) * 1000 + Number(plain[2]);
}

function parseDistance(raw: string): number | null {
  const match = /^(\d{1,6})\.(\d{3})$/.exec(raw);
  if (!match) return null;
  return Number(match[1]) * 1000 + Number(match[2]);
}

interface ReducedRecord {
  attempts: number[];
  status: RankedStatus | null;
}

function reduceActions(board: RankedBoard): Map<string, ReducedRecord> {
  const records = new Map<string, ReducedRecord>();
  for (const entrant of board.entrants) records.set(entrant.id, { attempts: [], status: null });
  for (const action of board.actions) {
    const current = records.get(action.entrantId);
    if (!current) continue;
    if (action.kind === "status") {
      current.status = action.status;
      current.attempts = [];
    } else {
      current.status = null;
      current.attempts = [...current.attempts, action.value];
    }
  }
  return records;
}

function rankedValue(rules: RankedRules, attempts: number[]): number | null {
  if (attempts.length === 0) return null;
  if (rules.aggregation === "final") return attempts[attempts.length - 1] ?? null;
  if (rules.mode === "time") return Math.min(...attempts);
  return Math.max(...attempts);
}

function better(rules: RankedRules, left: number, right: number): number {
  if (rules.mode === "time") return left - right;
  return right - left;
}

export function projectRankedBoard(rules: RankedRules, board: RankedBoard): RankedProjection {
  const records = reduceActions(board);
  const ranked: Array<RankedStanding & { order: number }> = [];
  const statuses: Array<RankedStanding & { order: number }> = [];
  const pending: Array<RankedStanding & { order: number }> = [];

  board.entrants.forEach((entrant, order) => {
    const record = records.get(entrant.id) ?? { attempts: [], status: null };
    const value = record.status ? null : rankedValue(rules, record.attempts);
    const base: RankedStanding & { order: number } = {
      entrantId: entrant.id,
      name: entrant.name,
      district: entrant.district,
      attempts: record.status ? [] : [...record.attempts],
      rankedValue: value,
      status: record.status,
      rank: null,
      tied: false,
      qualification: "none",
      order,
    };
    if (value !== null) ranked.push(base);
    else if (record.status) statuses.push(base);
    else pending.push(base);
  });

  ranked.sort((left, right) => {
    const direction = better(rules, left.rankedValue ?? 0, right.rankedValue ?? 0);
    if (direction !== 0) return direction;
    return left.order - right.order;
  });

  const groups: Array<Array<RankedStanding & { order: number }>> = [];
  for (const row of ranked) {
    const last = groups[groups.length - 1];
    if (!last || last[0]?.rankedValue !== row.rankedValue) groups.push([row]);
    else last.push(row);
  }

  let nextRank = 1;
  for (const group of groups) {
    const tied = group.length > 1;
    for (const row of group) {
      row.rank = nextRank;
      row.tied = tied;
    }
    nextRank += group.length;
  }

  let qualificationNote: RankedProjection["qualificationNote"] = "none";
  if (rules.qualifierCount !== null) {
    let remaining = rules.qualifierCount;
    qualificationNote = "clear";
    for (const group of groups) {
      if (remaining <= 0) {
        for (const row of group) row.qualification = "not_qualified";
        continue;
      }
      if (group.length <= remaining) {
        for (const row of group) row.qualification = "qualified";
        remaining -= group.length;
      } else {
        for (const row of group) row.qualification = "unresolved_tie";
        qualificationNote = "unresolved_tie";
        remaining = 0;
      }
    }
    for (const row of [...statuses, ...pending]) row.qualification = "not_qualified";
  }

  const statusOrder = new Map(rules.allowedStatuses.map((status, index) => [status, index]));
  statuses.sort((left, right) => {
    const statusDelta = (statusOrder.get(left.status ?? "DNS") ?? 0) - (statusOrder.get(right.status ?? "DNS") ?? 0);
    if (statusDelta !== 0) return statusDelta;
    return left.order - right.order;
  });
  pending.sort((left, right) => left.order - right.order);

  const rows = [...ranked, ...statuses, ...pending].map(({ order: _order, ...row }) => row);
  return {
    rows,
    qualifierIds: rows.filter((row) => row.qualification === "qualified").map((row) => row.entrantId),
    qualificationNote,
    createsEntrants: false,
    createsBracket: false,
  };
}

export function reviewRankedDraft(
  rules: RankedRules,
  board: RankedBoard,
  draft: { entrantId: string; kind: "attempt"; raw: string } | { entrantId: string; kind: "status"; status: string },
): { ok: true; action: RankedAction; summary: string } | { ok: false; reason: string } {
  const entrant = board.entrants.find((item) => item.id === draft.entrantId);
  if (!entrant) return { ok: false, reason: "unknown_entrant" };
  const current = reduceActions(board).get(draft.entrantId) ?? { attempts: [], status: null };
  if (draft.kind === "status") {
    if (draft.status !== "DNS" && draft.status !== "DNF" && draft.status !== "DSQ") {
      return { ok: false, reason: "status_not_allowed" };
    }
    if (!rules.allowedStatuses.includes(draft.status)) return { ok: false, reason: "status_not_allowed" };
    if (current.attempts.length > 0) return { ok: false, reason: "status_after_result" };
    if (current.status) return { ok: false, reason: "already_has_status" };
    return {
      ok: true,
      action: { kind: "status", entrantId: draft.entrantId, status: draft.status },
      summary: `Record ${draft.status} for ${entrant.name}. This is a status, not a score.`,
    };
  }
  if (current.status) return { ok: false, reason: "result_after_status" };
  if (current.attempts.length >= rules.maxAttempts) return { ok: false, reason: "attempts_full" };
  const parsed = parseResultInput(rules, draft.raw);
  if (!parsed.ok) return parsed;
  const shown = `${formatStoredValue(rules, parsed.value)} ${resultUnitLabel(rules)}`;
  return {
    ok: true,
    action: { kind: "attempt", entrantId: draft.entrantId, value: parsed.value },
    summary: `Record ${shown} for ${entrant.name}.`,
  };
}

export function confirmRankedAction(
  rules: RankedRules,
  board: RankedBoard,
  action: RankedAction,
): { ok: true; board: RankedBoard } | { ok: false; reason: string } {
  if (action.kind === "attempt") {
    if (!Number.isInteger(action.value) || !Number.isSafeInteger(action.value)) return { ok: false, reason: "malformed" };
    if (action.value < 0) return { ok: false, reason: "negative" };
  }
  const reviewed = reviewRankedDraft(
    rules,
    board,
    action.kind === "status"
      ? { entrantId: action.entrantId, kind: "status", status: action.status }
      : { entrantId: action.entrantId, kind: "attempt", raw: formatStoredValue(rules, action.value) },
  );
  if (!reviewed.ok) return reviewed;
  if (action.kind === "attempt" && (reviewed.action.kind !== "attempt" || reviewed.action.value !== action.value)) {
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, board: { ...board, actions: [...board.actions, action] } };
}

export function undoRankedAction(board: RankedBoard): RankedBoard | null {
  if (board.actions.length === 0) return null;
  return { ...board, actions: board.actions.slice(0, -1) };
}
