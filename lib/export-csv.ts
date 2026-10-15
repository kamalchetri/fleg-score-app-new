// Tournament CSV built from data the organizer hub already loaded.
// Entrant contact columns exist only on the entrants export.

import { toStandingsMatches } from "@/lib/formats/db-mapping";
import { computeStandings, standingsConfigForSport, type StandingsRow } from "@/lib/formats/standings";
import { readMatchScoreSnapshot } from "@/lib/sports/nspg";
import { isOrganizerRole, type AuditExportEntity } from "@/lib/audit";

export interface ExportSource {
  tournament: { id: string; name: string; sport_config: unknown };
  categories: Array<{ id: string; name: string }>;
  entrants: Array<{
    id: string;
    display_name: string;
    seed: number | null;
    status: string;
    category_id: string;
  }>;
  contacts: Array<{
    entrant_id: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }>;
  stages: Array<{
    id: string;
    category_id: string;
    name: string;
    stage_type: string;
    config: unknown;
  }>;
  matches: Array<{
    id: string;
    category_id: string;
    stage_id: string | null;
    round: number;
    position: number;
    entrant_a: string | null;
    entrant_b: string | null;
    winner_id: string | null;
    status: string;
    score: unknown;
  }>;
}

export function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((line) => line.map(csvCell).join(",")).join("\n");
}

function categoryName(source: ExportSource, categoryId: string): string {
  return source.categories.find((category) => category.id === categoryId)?.name ?? "";
}

function entrantName(source: ExportSource, id: string | null): string {
  if (!id) return "";
  return source.entrants.find((entrant) => entrant.id === id)?.display_name ?? "";
}

function stageName(source: ExportSource, stageId: string | null): string {
  if (!stageId) return "";
  return source.stages.find((stage) => stage.id === stageId)?.name ?? "";
}

export function buildResultsCsv(source: ExportSource): { csv: string; rows: number } {
  const headers = [
    "category",
    "stage",
    "round",
    "position",
    "entrant_a",
    "entrant_b",
    "status",
    "score_a",
    "score_b",
    "display",
    "winner",
  ];
  const rows = source.matches.map((match) => {
    const score = readMatchScoreSnapshot(match.score);
    return [
      categoryName(source, match.category_id),
      stageName(source, match.stage_id),
      String(match.round),
      String(match.position),
      entrantName(source, match.entrant_a),
      entrantName(source, match.entrant_b),
      match.status,
      score.a === null ? "" : String(score.a),
      score.b === null ? "" : String(score.b),
      score.display ?? "",
      entrantName(source, match.winner_id),
    ];
  });
  return { csv: toCsv(headers, rows), rows: rows.length };
}

export function standingsBlocks(source: ExportSource): Array<{ category: string; stage: string; rows: StandingsRow[] }> {
  const config = standingsConfigForSport(
    (source.tournament.sport_config ?? {}) as { table_points?: { win: number; draw: number; loss: number } },
  );
  const blocks: Array<{ category: string; stage: string; rows: StandingsRow[] }> = [];
  for (const stage of source.stages) {
    if (stage.stage_type !== "league" && stage.stage_type !== "group") continue;
    const matches = source.matches.filter((match) => match.stage_id === stage.id);
    const entrants =
      stage.stage_type === "league"
        ? source.entrants
            .filter((entrant) => entrant.category_id === stage.category_id && entrant.status === "approved")
            .map((entrant) => ({ id: entrant.id, name: entrant.display_name }))
        : (((stage.config ?? {}) as { entrant_ids?: string[] }).entrant_ids ?? []).map((id) => ({
            id,
            name: source.entrants.find((entrant) => entrant.id === id)?.display_name ?? id,
          }));
    blocks.push({
      category: categoryName(source, stage.category_id),
      stage: stage.stage_type === "league" ? "League" : stage.name,
      rows: computeStandings(toStandingsMatches(matches), entrants, config),
    });
  }
  return blocks;
}

export function buildStandingsCsv(source: ExportSource): { csv: string; rows: number } {
  const headers = [
    "category",
    "stage",
    "rank",
    "entrant",
    "played",
    "won",
    "drawn",
    "lost",
    "score_for",
    "score_against",
    "diff",
    "points",
  ];
  const rows = standingsBlocks(source).flatMap((block) =>
    block.rows.map((row) => [
      block.category,
      block.stage,
      String(row.rank),
      row.name,
      String(row.played),
      String(row.won),
      String(row.drawn),
      String(row.lost),
      String(row.scoreFor),
      String(row.scoreAgainst),
      String(row.diff),
      String(row.points),
    ]),
  );
  return { csv: toCsv(headers, rows), rows: rows.length };
}

export function buildEntrantsCsv(source: ExportSource): { csv: string; rows: number } {
  const headers = ["category", "display_name", "seed", "status", "contact_name", "contact_email", "contact_phone"];
  const contacts = new Map(source.contacts.map((contact) => [contact.entrant_id, contact]));
  const rows = source.entrants.map((entrant) => {
    const contact = contacts.get(entrant.id);
    return [
      categoryName(source, entrant.category_id),
      entrant.display_name,
      entrant.seed === null ? "" : String(entrant.seed),
      entrant.status,
      contact?.contact_name ?? "",
      contact?.contact_email ?? "",
      contact?.contact_phone ?? "",
    ];
  });
  return { csv: toCsv(headers, rows), rows: rows.length };
}

export function prepareTournamentExport(
  kind: AuditExportEntity,
  role: string | null | undefined,
  source: ExportSource,
): { ok: true; csv: string; rows: number; filename: string } | { ok: false; reason: "not_organizer" } {
  if (!isOrganizerRole(role)) return { ok: false, reason: "not_organizer" };
  const built =
    kind === "results" ? buildResultsCsv(source) : kind === "standings" ? buildStandingsCsv(source) : buildEntrantsCsv(source);
  const slug = source.tournament.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { ok: true, csv: built.csv, rows: built.rows, filename: `${slug || "tournament"}-${kind}.csv` };
}
