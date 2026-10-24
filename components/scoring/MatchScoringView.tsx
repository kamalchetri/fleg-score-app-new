import { type ReactNode, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ARCHERY_NOTE_MAX,
  BOUT_NOTE_MAX,
  BOUT_RESULT_METHODS,
  archeryEndAward,
  archeryShootOffCap,
  boutMethodLabel,
  formatCombatDisplay,
  formatLawnTennisSet,
  lawnTennisPointLine,
  parseArcheryConfig,
  parseArcheryScoreInput,
  parseArtisticConfig,
  artisticTotal,
  formatArtisticDisplay,
  sepaktakrawHasSquads,
  type ArcheryConfig,
  type ArcheryDetail,
  type ArtisticDetail,
  type ArtisticConfig,
  type BoutMethod,
  type ScoringEvent,
} from "@/lib/scoring";
import type {
  FutsalDetail,
  PickleballDetail,
  BasketballDetail,
  BadmintonDetail,
  DartsDetail,
  TableTennisDetail,
  LawnTennisDetail,
  RallySetScoreboard,
} from "@/lib/scoring";
import { elapsedSince } from "@/lib/format";
import { formatSnapshotScore } from "@/lib/sports/nspg";
import { matchEngine, projectMatchState, type ScoringMatch } from "@/lib/scoring/project-match";
import { effectiveSportConfig, standardRulesNote } from "@/lib/sports/rules-presets";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, ScorePad } from "@/components/ui";

export function MatchScoringView({
  match,
  events,
  busy,
  now,
  notice,
  header,
  archeryDraft,
  onEvent,
  onStart,
  onConfirm,
}: {
  match: ScoringMatch;
  events: ScoringEvent[];
  busy: boolean;
  now: number;
  notice?: string | null;
  header?: ReactNode;
  archeryDraft?: { a: string; b: string; reviewing: boolean } | null;
  onEvent: (eventType: string, payload: Record<string, unknown>) => void;
  onStart: () => void;
  onConfirm: () => void;
}) {
  const engine = matchEngine(match);
  const state = engine ? projectMatchState(match, events) : null;
  const rulesNote = match.tournament
    ? standardRulesNote(match.tournament.sport, match.category?.name, match.tournament.sport_config)
    : null;
  const aName = match.a?.display_name ?? "TBD";
  const bName = match.b?.display_name ?? "TBD";

  if (engine === "sepaktakraw" && !sepaktakrawHasSquads(match.a, match.b)) {
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll}>
        {header}
        <MatchHeading match={match} />
        <Card>
          <Text style={styles.team}>{aName}</Text>
          <Text style={[styles.team, { textAlign: "right" }]}>{bName}</Text>
        </Card>
        <EmptyState title="Squads not entered" />
      </ScrollView>
    );
  }

  if (
    (engine === "table_tennis" ||
      engine === "lawn_tennis" ||
      engine === "volleyball" ||
      engine === "sepaktakraw" ||
      engine === "archery" ||
      engine === "artistic") &&
    state?.detail.sport !== engine
  ) {
    return (
      <ScrollView
        style={styles.fill}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {header}
        <MatchHeading match={match} />
        <Card>
          <Text style={styles.team}>{aName}</Text>
          <Text style={[styles.team, { textAlign: "right" }]}>{bName}</Text>
        </Card>
        <EmptyState title="Rules not configured" />
      </ScrollView>
    );
  }

  if (!engine) {
    const snap = formatSnapshotScore(match.score);
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll}>
        {header}
        <Card>
          <MatchHeading match={match} />
          <View style={styles.scoreRow}>
            <Text style={styles.team} numberOfLines={4}>
              {aName}
            </Text>
            <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {snap.line}
            </Text>
            <Text style={[styles.team, styles.teamRight]} numberOfLines={4}>
              {bName}
            </Text>
          </View>
          {snap.display ? <Text style={styles.display}>{snap.display}</Text> : null}
        </Card>
        <EmptyState
          title="Structured result entry not available yet"
          body="This sport has no live scoring controls. The score above is the saved match snapshot."
        />
      </ScrollView>
    );
  }

  if (!state) {
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll}>
        {header}
        <EmptyState title="Scoring unavailable" body="This match's scoring configuration could not be loaded." />
      </ScrollView>
    );
  }

  const dartD = state.detail.sport === "darts" ? (state.detail as DartsDetail) : null;
  const combatD = state.detail.sport === "combat" ? state.detail : null;
  const tableTennisD = state.detail.sport === "table_tennis" ? state.detail : null;
  const lawnD = state.detail.sport === "lawn_tennis" ? state.detail : null;
  const rallyD =
    state.detail.sport === "volleyball" || state.detail.sport === "sepaktakraw" ? state.detail : null;
  const archeryD = state.detail.sport === "archery" ? state.detail : null;
  const archeryRules = archeryD
    ? parseArcheryConfig(
        effectiveSportConfig(
          match.tournament?.sport ?? "",
          match.category?.name,
          match.tournament?.sport_config,
        ),
      )
    : null;
  const artisticD = state.detail.sport === "artistic" ? (state.detail as ArtisticDetail) : null;
  const artisticRules = artisticD ? parseArtisticConfig(effectiveSportConfig(match.tournament?.sport ?? "", match.category?.name, match.tournament?.sport_config)) : null;
  const headlineA = dartD ? dartD.remaining.a : state.scoreSummary.a;
  const headlineB = dartD ? dartD.remaining.b : state.scoreSummary.b;
  const combatPoints = combatD?.result && combatD.result.pointsA !== null && combatD.result.pointsB !== null;
  const headline = rallyD
    ? state.isComplete
      ? `${rallyD.setsWon.a} – ${rallyD.setsWon.b}`
      : `${rallyD.currentSet.a} – ${rallyD.currentSet.b}`
    : lawnD
    ? state.isComplete
      ? `${lawnD.setsWon.a} – ${lawnD.setsWon.b}`
      : lawnTennisPointLine(lawnD)
    : combatD
      ? formatCombatDisplay(combatD.result)
      : artisticD
        ? formatArtisticDisplay(artisticD.result)
      : `${headlineA} – ${headlineB}`;

  return (
    <ScrollView
      style={styles.fill}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}
    >
      {header}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {rulesNote ? <Text style={styles.rulesNote}>{rulesNote}</Text> : null}
      <Card>
        <MatchHeading match={match} />
        <View style={styles.scoreRow}>
          <Text style={styles.team} numberOfLines={4}>
            {aName}
          </Text>
          <Text
            style={[styles.score, combatD && !combatPoints ? styles.methodScore : null]}
            numberOfLines={combatD && !combatPoints ? 3 : 1}
            adjustsFontSizeToFit
            minimumFontScale={0.45}
          >
            {headline}
          </Text>
          <Text style={[styles.team, styles.teamRight]} numberOfLines={4}>
            {bName}
          </Text>
        </View>
        {combatD?.result?.note ? <Text style={styles.display}>{combatD.result.note}</Text> : null}
        {tableTennisD ? <TableTennisSummary detail={tableTennisD} /> : null}
        {lawnD ? (
          <LawnTennisSummary detail={lawnD} aName={aName} bName={bName} winnerSide={state.winnerSide} />
        ) : null}
        {rallyD ? (
          <RallySetSummary detail={rallyD} aName={aName} bName={bName} winnerSide={state.winnerSide} />
        ) : null}
        {archeryD ? (
          <ArcherySummary detail={archeryD} aName={aName} bName={bName} winnerSide={state.winnerSide} />
        ) : null}
        {artisticD ? <ArtisticSummary detail={artisticD} aName={aName} bName={bName} /> : null}
        {!combatD && !artisticD && !tableTennisD && !lawnD && !rallyD && !archeryD ? (
          <Text style={styles.display}>{state.display}</Text>
        ) : null}
        {engine === "futsal" ? <FutsalSubline detail={state.detail as FutsalDetail} now={now} /> : null}
        {engine === "pickleball" ? <PickleballSubline detail={state.detail as PickleballDetail} /> : null}
        {engine === "basketball" ? (
          <BasketballSubline detail={state.detail as BasketballDetail} now={now} />
        ) : null}
        {engine === "badminton" ? <BadmintonSubline detail={state.detail as BadmintonDetail} /> : null}
        {engine === "darts" && dartD ? <DartsSubline detail={dartD} /> : null}
      </Card>

      {match.status === "scheduled" ? <Button label="Start match" onPress={onStart} loading={busy} /> : null}

      {match.status === "live" ? (
        <>
          {engine === "combat" && combatD ? (
            <CombatControls busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "artistic" && artisticD && artisticRules ? (
            <ArtisticControls config={artisticRules} busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "futsal" ? (
            <FutsalControls detail={state.detail as FutsalDetail} busy={busy} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "basketball" ? (
            <BasketballControls
              detail={state.detail as BasketballDetail}
              busy={busy}
              aName={aName}
              bName={bName}
              isComplete={state.isComplete}
              tap={onEvent}
            />
          ) : engine === "darts" && dartD ? (
            <DartsControls detail={dartD} busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "table_tennis" && tableTennisD ? (
            <TableTennisControls busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "lawn_tennis" && lawnD ? (
            <TableTennisControls busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "volleyball" && rallyD ? (
            <TableTennisControls busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "sepaktakraw" && rallyD ? (
            <TableTennisControls busy={busy} isComplete={state.isComplete} aName={aName} bName={bName} tap={onEvent} />
          ) : engine === "archery" && archeryD && archeryRules ? (
            <ArcheryControls
              config={archeryRules}
              detail={archeryD}
              busy={busy}
              isComplete={state.isComplete}
              aName={aName}
              bName={bName}
              draft={archeryDraft}
              tap={onEvent}
            />
          ) : engine === "pickleball" || engine === "badminton" ? (
            <View style={styles.padRow}>
              <ScorePad label="POINT" sublabel={aName} disabled={busy} onPress={() => onEvent("point", { side: "a" })} />
              <ScorePad label="POINT" sublabel={bName} disabled={busy} onPress={() => onEvent("point", { side: "b" })} />
            </View>
          ) : null}

          <Button label="UNDO last" variant="ghost" disabled={busy || events.length === 0} onPress={() => onEvent("undo", {})} />

          {state.isComplete && state.winnerSide ? (
            <Button label="Confirm result" onPress={onConfirm} loading={busy} />
          ) : null}
        </>
      ) : null}

      {match.status === "completed" ? <EmptyState title="Match completed" body={`Final: ${state.display}`} /> : null}
    </ScrollView>
  );
}

function MatchHeading({ match }: { match: ScoringMatch }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.meta} numberOfLines={2}>
        {match.tournament?.name} · {match.category?.name}
      </Text>
      <Badge status={match.status} />
    </View>
  );
}

function TableTennisSummary({ detail }: { detail: TableTennisDetail }) {
  const completed =
    detail.completedGames.length > 0 ? detail.completedGames.map((game) => `${game.a}-${game.b}`).join(", ") : "—";
  return (
    <>
      <Text style={styles.subline}>
        Games won {detail.gamesWon.a}–{detail.gamesWon.b}
      </Text>
      <Text style={styles.subline}>Completed games {completed}</Text>
      <Text style={styles.subline}>
        Current game {detail.currentGame.a}–{detail.currentGame.b}
      </Text>
    </>
  );
}

function LawnTennisSummary({
  detail,
  aName,
  bName,
  winnerSide,
}: {
  detail: LawnTennisDetail;
  aName: string;
  bName: string;
  winnerSide: "a" | "b" | null;
}) {
  const completed =
    detail.completedSets.length > 0 ? detail.completedSets.map(formatLawnTennisSet).join(", ") : "—";
  const winner = winnerSide === "a" ? aName : winnerSide === "b" ? bName : null;
  return (
    <>
      <Text style={styles.subline}>Sets {detail.setsWon.a}–{detail.setsWon.b}</Text>
      <Text style={styles.subline}>Completed sets {completed}</Text>
      {!detail.inTiebreak && !winner ? (
        <Text style={styles.subline}>Points {lawnTennisPointLine(detail)}</Text>
      ) : null}
      {detail.inTiebreak || winner ? null : (
        <Text style={styles.subline}>
          Games {detail.games.a}–{detail.games.b}
        </Text>
      )}
      {detail.inTiebreak ? (
        <Text style={styles.subline}>
          Tiebreak {detail.pointLabels.a}–{detail.pointLabels.b} · Games {detail.games.a}–{detail.games.b}
        </Text>
      ) : null}
      {detail.decidingSet ? <Text style={styles.subline}>Deciding set</Text> : null}
      {winner ? <Text style={styles.subline}>Winner {winner}</Text> : null}
    </>
  );
}

function RallySetSummary({
  detail,
  aName,
  bName,
  winnerSide,
}: {
  detail: RallySetScoreboard;
  aName: string;
  bName: string;
  winnerSide: "a" | "b" | null;
}) {
  const completed =
    detail.completedSets.length > 0 ? detail.completedSets.map((set) => `${set.a}-${set.b}`).join(", ") : "—";
  const winner = winnerSide === "a" ? aName : winnerSide === "b" ? bName : null;
  return (
    <>
      <Text style={styles.subline}>
        Sets {detail.setsWon.a}–{detail.setsWon.b}
      </Text>
      <Text style={styles.subline}>Completed sets {completed}</Text>
      {winner ? null : (
        <Text style={styles.subline}>
          Current set {detail.currentSet.a}–{detail.currentSet.b}
        </Text>
      )}
      {detail.decidingSet ? <Text style={styles.subline}>Deciding set</Text> : null}
      {winner ? <Text style={styles.subline}>Winner {winner}</Text> : null}
    </>
  );
}

function TableTennisControls({
  busy,
  isComplete,
  aName,
  bName,
  tap,
}: {
  busy: boolean;
  isComplete: boolean;
  aName: string;
  bName: string;
  tap: (t: string, p: Record<string, unknown>) => void;
}) {
  if (isComplete) return null;
  return (
    <View style={styles.padRow}>
      <ScorePad label="POINT" sublabel={aName} disabled={busy} onPress={() => tap("point", { side: "a" })} />
      <ScorePad label="POINT" sublabel={bName} disabled={busy} onPress={() => tap("point", { side: "b" })} />
    </View>
  );
}

function DartsSubline({ detail }: { detail: DartsDetail }) {
  const setsLegs =
    detail.playFormat === "sets"
      ? `Sets ${detail.setsWon.a}–${detail.setsWon.b} · Legs ${detail.legsWon.a}–${detail.legsWon.b}`
      : `Legs ${detail.legsWon.a}–${detail.legsWon.b}`;
  const thrower = detail.throwerSide === "a" ? "A" : "B";
  return (
    <Text style={styles.subline}>
      {setsLegs} · On throw: {thrower} · Avg {detail.stats.threeDartAvg.a}/{detail.stats.threeDartAvg.b} · 180s{" "}
      {detail.stats.oneEighties.a}/{detail.stats.oneEighties.b}
    </Text>
  );
}

function DartsControls({
  detail,
  busy,
  isComplete,
  aName,
  bName,
  tap,
}: {
  detail: DartsDetail;
  busy: boolean;
  isComplete: boolean;
  aName: string;
  bName: string;
  tap: (t: string, p: Record<string, unknown>) => void;
}) {
  if (isComplete) return null;
  const side = detail.throwerSide;
  const name = side === "a" ? aName : bName;
  const remaining = detail.remaining[side];
  const scores = [180, 140, 100, 60, 26, 0];
  return (
    <>
      <Text style={styles.subline}>
        {name} · {remaining} left
      </Text>
      <View style={styles.padRow}>
        {scores.map((s) => (
          <ScorePad
            key={s}
            label={String(s)}
            sublabel={s === remaining ? "CO" : ""}
            disabled={busy}
            onPress={() =>
              tap("visit", {
                side,
                score: s,
                darts: 3,
                checkout: s === remaining && s > 0,
              })
            }
          />
        ))}
      </View>
    </>
  );
}

function FutsalSubline({ detail, now }: { detail: FutsalDetail; now: number }) {
  let line: string;
  if (detail.inShootout) line = "Penalty shootout";
  else if (detail.currentPeriod && detail.periodStartedAt)
    line = `Period ${detail.currentPeriod} · ${elapsedSince(detail.periodStartedAt, now)}`;
  else if (detail.periodsCompleted === 0) line = "Not started";
  else line = `${detail.periodsCompleted}/${detail.regulationPeriods} periods played`;
  return <Text style={styles.subline}>{line}</Text>;
}

function PickleballSubline({ detail }: { detail: PickleballDetail }) {
  return (
    <Text style={styles.subline}>
      Game {detail.completedGames.length + 1} · {detail.currentGame.a}–{detail.currentGame.b} · to {detail.pointsTo}{" "}
      (win by {detail.winBy})
    </Text>
  );
}

function BadmintonSubline({ detail }: { detail: BadmintonDetail }) {
  const games =
    detail.completedGames.length > 0 ? detail.completedGames.map((g) => `${g.a}-${g.b}`).join(", ") : null;
  return (
    <>
      {games ? <Text style={styles.subline}>Games: {games}</Text> : null}
      <Text style={styles.subline}>
        Game {detail.completedGames.length + 1} · {detail.currentGame.a}–{detail.currentGame.b} · to {detail.pointsTo}{" "}
        (win by {detail.winBy}, cap {detail.cap})
      </Text>
    </>
  );
}

function BasketballSubline({ detail, now }: { detail: BasketballDetail; now: number }) {
  const periodLive = detail.currentPeriod !== null;
  const inOt = detail.periodsCompleted >= detail.regulationPeriods;
  const quarterLabel = inOt
    ? `OT ${detail.periodsCompleted - detail.regulationPeriods + (periodLive ? 1 : 0)}`
    : detail.currentPeriod
      ? `Q${detail.currentPeriod}`
      : `${detail.periodsCompleted}/${detail.regulationPeriods} quarters`;
  let line = quarterLabel;
  if (periodLive && detail.periodStartedAt) {
    line += ` · ${elapsedSince(detail.periodStartedAt, now)}`;
  }
  if (periodLive) {
    line += ` · This Q: ${detail.currentQuarter.a}–${detail.currentQuarter.b}`;
  }
  if (detail.lineScores.length > 0) {
    line += ` · ${detail.lineScores.map((q) => `${q.a}-${q.b}`).join(" · ")}`;
  }
  line += ` · Fouls ${detail.fouls.a}–${detail.fouls.b}`;
  return <Text style={styles.subline}>{line}</Text>;
}

function FutsalControls({
  detail,
  busy,
  aName,
  bName,
  tap,
}: {
  detail: FutsalDetail;
  busy: boolean;
  aName: string;
  bName: string;
  tap: (t: string, p: Record<string, unknown>) => void;
}) {
  const periodLive = detail.currentPeriod !== null;
  const scoringOpen = periodLive || detail.inShootout;
  return (
    <>
      <View style={styles.padRow}>
        <ScorePad label="GOAL" sublabel={aName} disabled={busy || !scoringOpen} onPress={() => tap("goal", { side: "a" })} />
        <ScorePad label="GOAL" sublabel={bName} disabled={busy || !scoringOpen} onPress={() => tap("goal", { side: "b" })} />
      </View>
      <View style={styles.cardRow}>
        {(["a", "b"] as const).map((side) => (
          <View key={side} style={styles.cardCol}>
            <Button
              label={`Yellow · ${side === "a" ? aName : bName}`}
              variant="ghost"
              disabled={busy || !periodLive}
              onPress={() => tap("card", { side, cardType: "yellow", player: null })}
            />
            <Button
              label={`Red · ${side === "a" ? aName : bName}`}
              variant="danger"
              disabled={busy || !periodLive}
              onPress={() => tap("card", { side, cardType: "red", player: null })}
            />
          </View>
        ))}
      </View>
      {periodLive ? (
        <Button
          label={`End period ${detail.currentPeriod}`}
          variant="ghost"
          disabled={busy}
          onPress={() => tap("period_end", {})}
        />
      ) : (
        <Button
          label={
            detail.periodsCompleted >= detail.regulationPeriods
              ? "Start shootout period"
              : `Start period ${detail.periodsCompleted + 1}`
          }
          disabled={busy}
          onPress={() => tap("period_start", {})}
        />
      )}
    </>
  );
}

function BasketballControls({
  detail,
  busy,
  aName,
  bName,
  isComplete,
  tap,
}: {
  detail: BasketballDetail;
  busy: boolean;
  aName: string;
  bName: string;
  isComplete: boolean;
  tap: (t: string, p: Record<string, unknown>) => void;
}) {
  const periodLive = detail.currentPeriod !== null;
  const inOt = detail.periodsCompleted >= detail.regulationPeriods;
  const scoringOpen = periodLive && !isComplete;

  return (
    <>
      {periodLive ? (
        <Button
          label={`End ${inOt ? "OT" : `Q${detail.currentPeriod}`}`}
          variant="ghost"
          disabled={busy}
          onPress={() => tap("period_end", {})}
        />
      ) : (
        <Button
          label={inOt ? "Start overtime" : `Start Q${detail.periodsCompleted + 1}`}
          disabled={busy || isComplete}
          onPress={() => tap("period_start", {})}
        />
      )}

      <View style={styles.padRow}>
        <BasketballTeamPad
          name={aName}
          fouls={detail.fouls.a}
          disabled={busy || !scoringOpen}
          onPoint={(pts) => tap("point", { side: "a", points: pts })}
          onFoul={() => tap("foul", { side: "a" })}
          onTimeout={() => tap("timeout", { side: "a" })}
        />
        <BasketballTeamPad
          name={bName}
          fouls={detail.fouls.b}
          disabled={busy || !scoringOpen}
          onPoint={(pts) => tap("point", { side: "b", points: pts })}
          onFoul={() => tap("foul", { side: "b" })}
          onTimeout={() => tap("timeout", { side: "b" })}
        />
      </View>
    </>
  );
}

function BasketballTeamPad({
  name,
  fouls,
  disabled,
  onPoint,
  onFoul,
  onTimeout,
}: {
  name: string;
  fouls: number;
  disabled: boolean;
  onPoint: (pts: 1 | 2 | 3) => void;
  onFoul: () => void;
  onTimeout: () => void;
}) {
  return (
    <View style={styles.bballCol}>
      <Text style={styles.bballName} numberOfLines={4}>
        {name}
      </Text>
      <Text style={styles.bballFouls}>Fouls: {fouls}</Text>
      <View style={styles.bballPtsCol}>
        {([1, 2, 3] as const).map((pts) => (
          <ScorePad key={pts} size="compact" label={`+${pts}`} disabled={disabled} onPress={() => onPoint(pts)} />
        ))}
      </View>
      <Button label="Foul" variant="ghost" disabled={disabled} onPress={onFoul} />
      <Button label="Timeout" variant="ghost" disabled={disabled} onPress={onTimeout} />
    </View>
  );
}

function parseOptionalPoint(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return "invalid";
  return value;
}

function ArcherySummary({
  detail,
  aName,
  bName,
  winnerSide,
}: {
  detail: ArcheryDetail;
  aName: string;
  bName: string;
  winnerSide: "a" | "b" | null;
}) {
  const latest = detail.latestEnd ? `${detail.latestEnd.a}–${detail.latestEnd.b}` : "—";
  const history =
    detail.completedEnds.length > 0 ? detail.completedEnds.map((end) => `${end.a}-${end.b}`).join(", ") : "—";
  const score =
    detail.format === "set_points" && detail.setPoints
      ? `${detail.setPoints.a}–${detail.setPoints.b}`
      : `${detail.totals.a}–${detail.totals.b}`;
  const shootOffScores =
    detail.shootOff && detail.shootOff.scoreA !== null && detail.shootOff.scoreB !== null
      ? `${detail.shootOff.scoreA}–${detail.shootOff.scoreB}`
      : null;
  return (
    <>
      <Text style={styles.subline}>
        End {detail.endNumber} of {detail.regulationEnds}
      </Text>
      <Text style={styles.subline}>Latest end {latest}</Text>
      <Text style={styles.subline}>Completed ends {history}</Text>
      <Text style={styles.subline}>{detail.format === "set_points" ? "Set points" : "Totals"} {score}</Text>
      {detail.shootOff ? (
        <Text style={styles.subline}>Shoot-off {shootOffScores ?? "scores not entered"}</Text>
      ) : detail.shootOffRequired ? (
        <Text style={styles.subline}>Shoot-off</Text>
      ) : null}
      {detail.shootOff?.note ? <Text style={styles.subline}>{detail.shootOff.note}</Text> : null}
      {winnerSide ? <Text style={styles.subline}>Winner {winnerSide === "a" ? aName : bName}</Text> : null}
    </>
  );
}

function ArcheryControls({
  config,
  detail,
  busy,
  isComplete,
  aName,
  bName,
  draft,
  tap,
}: {
  config: ArcheryConfig;
  detail: ArcheryDetail;
  busy: boolean;
  isComplete: boolean;
  aName: string;
  bName: string;
  draft?: { a: string; b: string; reviewing: boolean } | null;
  tap: (eventType: string, payload: Record<string, unknown>) => void;
}) {
  const [endA, setEndA] = useState(draft?.a ?? "");
  const [endB, setEndB] = useState(draft?.b ?? "");
  const [reviewingEnd, setReviewingEnd] = useState(Boolean(draft?.reviewing));
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [shootA, setShootA] = useState("");
  const [shootB, setShootB] = useState("");
  const [note, setNote] = useState("");
  const [reviewingShoot, setReviewingShoot] = useState(false);
  const shootCap = archeryShootOffCap(config);

  if (isComplete) return null;

  if (detail.shootOffRequired) {
    function startShootReview() {
      if (busy || !winner) return;
      if (parseArcheryScoreInput(shootA, shootCap) === "invalid" || parseArcheryScoreInput(shootB, shootCap) === "invalid") {
        Alert.alert("Check the shoot-off scores", `Each score must be a whole number from 0 to ${shootCap}, or left blank.`);
        return;
      }
      if (note.trim().length > ARCHERY_NOTE_MAX) return;
      setReviewingShoot(true);
    }
    function recordShoot() {
      if (busy || !winner) return;
      const parsedA = parseArcheryScoreInput(shootA, shootCap);
      const parsedB = parseArcheryScoreInput(shootB, shootCap);
      if (parsedA === "invalid" || parsedB === "invalid") return;
      const payload: Record<string, unknown> = { winnerSide: winner };
      if (typeof parsedA === "number") payload.scoreA = parsedA;
      if (typeof parsedB === "number") payload.scoreB = parsedB;
      const trimmed = note.trim();
      if (trimmed) payload.note = trimmed;
      setReviewingShoot(false);
      tap("shoot_off", payload);
    }
    if (reviewingShoot && winner) {
      const parsedA = parseArcheryScoreInput(shootA, shootCap);
      const parsedB = parseArcheryScoreInput(shootB, shootCap);
      const scores =
        typeof parsedA === "number" && typeof parsedB === "number"
          ? `${parsedA} – ${parsedB}`
          : "Scores not entered";
      return (
        <View>
          <Text style={styles.fieldLabel}>Review shoot-off</Text>
          <Text style={styles.reviewLine}>Winner: {winner === "a" ? aName : bName}</Text>
          <Text style={styles.reviewLine}>{scores}</Text>
          <Text style={styles.reviewLine}>{note.trim() ? note.trim() : "No note"}</Text>
          <Button label="Record shoot-off" disabled={busy} loading={busy} onPress={recordShoot} />
          <Button label="Edit shoot-off" variant="ghost" disabled={busy} onPress={() => setReviewingShoot(false)} />
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.fieldLabel}>Shoot-off winner</Text>
        <View style={styles.padRow}>
          <ScorePad
            label="WIN"
            sublabel={aName}
            disabled={busy}
            color={winner === "a" ? Colors.green : Colors.border}
            onPress={() => setWinner("a")}
          />
          <ScorePad
            label="WIN"
            sublabel={bName}
            disabled={busy}
            color={winner === "b" ? Colors.green : Colors.border}
            onPress={() => setWinner("b")}
          />
        </View>
        <Text style={styles.fieldLabel}>Scores (optional)</Text>
        <View style={styles.padRow}>
          <ArcheryScoreField label={aName} value={shootA} onChange={setShootA} busy={busy} />
          <ArcheryScoreField label={bName} value={shootB} onChange={setShootB} busy={busy} />
        </View>
        <Text style={styles.fieldLabel}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          editable={!busy}
          maxLength={ARCHERY_NOTE_MAX}
          placeholder="Short note"
          placeholderTextColor={Colors.textFaint}
          style={styles.noteInput}
          accessibilityLabel="Shoot-off note"
        />
        <Button label="Review shoot-off" disabled={busy || !winner} onPress={startShootReview} />
      </View>
    );
  }

  function startEndReview() {
    if (busy) return;
    const parsedA = parseArcheryScoreInput(endA, detail.maxEndScore);
    const parsedB = parseArcheryScoreInput(endB, detail.maxEndScore);
    if (typeof parsedA !== "number" || typeof parsedB !== "number") {
      Alert.alert("Check the end totals", `Each total must be a whole number from 0 to ${detail.maxEndScore}.`);
      return;
    }
    setReviewingEnd(true);
  }

  function recordEnd() {
    if (busy) return;
    const parsedA = parseArcheryScoreInput(endA, detail.maxEndScore);
    const parsedB = parseArcheryScoreInput(endB, detail.maxEndScore);
    if (typeof parsedA !== "number" || typeof parsedB !== "number") return;
    setReviewingEnd(false);
    setEndA("");
    setEndB("");
    tap("end_result", { a: parsedA, b: parsedB });
  }

  if (reviewingEnd) {
    const parsedA = parseArcheryScoreInput(endA, detail.maxEndScore);
    const parsedB = parseArcheryScoreInput(endB, detail.maxEndScore);
    if (typeof parsedA !== "number" || typeof parsedB !== "number") {
      return null;
    }
    const award = config.format === "set_points" ? archeryEndAward(config, parsedA, parsedB) : null;
    return (
      <View>
        <Text style={styles.fieldLabel}>Review end {detail.endNumber}</Text>
        <Text style={styles.reviewLine}>
          {aName} {parsedA}
        </Text>
        <Text style={styles.reviewLine}>
          {bName} {parsedB}
        </Text>
        {award ? (
          <Text style={styles.reviewLine}>
            Set points from this end {award.a}–{award.b}
          </Text>
        ) : null}
        <Button label="Record end" disabled={busy} loading={busy} onPress={recordEnd} />
        <Button label="Edit end" variant="ghost" disabled={busy} onPress={() => setReviewingEnd(false)} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.fieldLabel}>End {detail.endNumber} totals</Text>
      <View style={styles.padRow}>
        <ArcheryScoreField label={aName} value={endA} onChange={setEndA} busy={busy} />
        <ArcheryScoreField label={bName} value={endB} onChange={setEndB} busy={busy} />
      </View>
      <Button label="Review end" disabled={busy} onPress={startEndReview} />
    </View>
  );
}

function ArcheryScoreField({
  label,
  value,
  onChange,
  busy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
}) {
  return (
    <View style={styles.cardCol}>
      <Text style={styles.bballName} numberOfLines={4}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!busy}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={Colors.textFaint}
        style={styles.pointInput}
        accessibilityLabel={`${label} end total`}
      />
    </View>
  );
}

function ArtisticSummary({ detail, aName, bName }: { detail: ArtisticDetail; aName: string; bName: string }) {
  if (!detail.result) return <Text style={styles.subline}>Awaiting {detail.judges} judge scores</Text>;
  const totalA = artisticTotal(detail.result.scoresA, detail.result.deductionA);
  const totalB = artisticTotal(detail.result.scoresB, detail.result.deductionB);
  const winner = detail.result.winnerSide === "a" ? aName : bName;
  return (
    <>
      <Text style={styles.subline}>Judges {detail.judges} · {aName} {totalA} · {bName} {totalB}</Text>
      <Text style={styles.subline}>Winner {winner}</Text>
      {detail.result.note ? <Text style={styles.subline}>{detail.result.note}</Text> : null}
    </>
  );
}

function ArtisticControls({
  config,
  busy,
  isComplete,
  aName,
  bName,
  tap,
}: {
  config: ArtisticConfig;
  busy: boolean;
  isComplete: boolean;
  aName: string;
  bName: string;
  tap: (eventType: string, payload: Record<string, unknown>) => void;
}) {
  const [scoresA, setScoresA] = useState("");
  const [scoresB, setScoresB] = useState("");
  const [deductionA, setDeductionA] = useState("");
  const [deductionB, setDeductionB] = useState("");
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  if (isComplete) return null;

  function parseScoreText(value: string): number[] | null {
    const values = value.split(",").map((part) => Number(part.trim()));
    if (values.length !== config.judges || values.some((score) => !Number.isFinite(score) || score < config.score_min || score > config.score_max)) return null;
    return values;
  }
  function parseDeductionText(value: string): number {
    if (!value.trim()) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= config.penalty_max ? parsed : Number.NaN;
  }
  function review() {
    if (busy || !winner) return;
    const parsedA = parseScoreText(scoresA);
    const parsedB = parseScoreText(scoresB);
    const penaltyA = parseDeductionText(deductionA);
    const penaltyB = parseDeductionText(deductionB);
    if (!parsedA || !parsedB || !Number.isFinite(penaltyA) || !Number.isFinite(penaltyB)) {
      Alert.alert("Check judge scores", `Enter ${config.judges} scores per side between ${config.score_min} and ${config.score_max}.`);
      return;
    }
    setReviewing(true);
  }
  function record() {
    const parsedA = parseScoreText(scoresA);
    const parsedB = parseScoreText(scoresB);
    const penaltyA = parseDeductionText(deductionA);
    const penaltyB = parseDeductionText(deductionB);
    if (busy || !winner || !parsedA || !parsedB || !Number.isFinite(penaltyA) || !Number.isFinite(penaltyB)) return;
    setReviewing(false);
    tap("artistic_result", { scoresA: parsedA, scoresB: parsedB, deductionA: penaltyA, deductionB: penaltyB, winnerSide: winner, note: note.trim() || undefined });
  }
  if (reviewing) {
    const parsedA = parseScoreText(scoresA)!;
    const parsedB = parseScoreText(scoresB)!;
    const penaltyA = parseDeductionText(deductionA);
    const penaltyB = parseDeductionText(deductionB);
    return <View><Text style={styles.fieldLabel}>Review judged result</Text><Text style={styles.reviewLine}>{aName}: {artisticTotal(parsedA, penaltyA)} · {bName}: {artisticTotal(parsedB, penaltyB)}</Text><Text style={styles.reviewLine}>Winner: {winner === "a" ? aName : bName}</Text><Text style={styles.reviewLine}>{note.trim() || "No note"}</Text><Button label="Record judged result" disabled={busy} loading={busy} onPress={record} /><Button label="Edit scores" variant="ghost" disabled={busy} onPress={() => setReviewing(false)} /></View>;
  }
  return <View><Text style={styles.fieldLabel}>Judge scores · {config.judges} judges</Text><TextInput value={scoresA} onChangeText={setScoresA} editable={!busy} keyboardType="decimal-pad" placeholder={`${aName}: 8, 8, 8`} placeholderTextColor={Colors.textFaint} style={styles.noteInput} accessibilityLabel={`${aName} judge scores`} /><TextInput value={scoresB} onChangeText={setScoresB} editable={!busy} keyboardType="decimal-pad" placeholder={`${bName}: 8, 8, 8`} placeholderTextColor={Colors.textFaint} style={styles.noteInput} accessibilityLabel={`${bName} judge scores`} /><View style={styles.padRow}><ScorePad label="WIN" sublabel={aName} disabled={busy} color={winner === "a" ? Colors.green : Colors.border} onPress={() => setWinner("a")} /><ScorePad label="WIN" sublabel={bName} disabled={busy} color={winner === "b" ? Colors.green : Colors.border} onPress={() => setWinner("b")} /></View><Text style={styles.fieldLabel}>Deductions (optional)</Text><View style={styles.padRow}><TextInput value={deductionA} onChangeText={setDeductionA} editable={!busy} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textFaint} style={styles.pointInput} accessibilityLabel={`${aName} deduction`} /><TextInput value={deductionB} onChangeText={setDeductionB} editable={!busy} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textFaint} style={styles.pointInput} accessibilityLabel={`${bName} deduction`} /></View><TextInput value={note} onChangeText={setNote} editable={!busy} maxLength={160} placeholder="Judge note (optional)" placeholderTextColor={Colors.textFaint} style={styles.noteInput} accessibilityLabel="Judged result note" /><Button label="Review judged result" disabled={busy || !winner} onPress={review} /></View>;
}

function CombatControls({
  busy,
  isComplete,
  aName,
  bName,
  tap,
}: {
  busy: boolean;
  isComplete: boolean;
  aName: string;
  bName: string;
  tap: (eventType: string, payload: Record<string, unknown>) => void;
}) {
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [pointsA, setPointsA] = useState("");
  const [pointsB, setPointsB] = useState("");
  const [method, setMethod] = useState<BoutMethod | null>(null);
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  if (isComplete) return null;

  function startReview() {
    if (busy || !winner || !method) return;
    if (parseOptionalPoint(pointsA) === "invalid" || parseOptionalPoint(pointsB) === "invalid") {
      Alert.alert("Check the points", "Points must be a finite number that is zero or greater, or left blank.");
      return;
    }
    setReviewing(true);
  }

  function record() {
    if (busy || !winner || !method) return;
    const parsedA = parseOptionalPoint(pointsA);
    const parsedB = parseOptionalPoint(pointsB);
    if (parsedA === "invalid" || parsedB === "invalid") return;
    const trimmed = note.trim();
    const payload: Record<string, unknown> = { winnerSide: winner, method };
    if (parsedA !== null) payload.pointsA = parsedA;
    if (parsedB !== null) payload.pointsB = parsedB;
    if (trimmed) payload.note = trimmed;
    setReviewing(false);
    tap("bout_result", payload);
  }

  if (reviewing && winner && method) {
    const parsedA = parseOptionalPoint(pointsA);
    const parsedB = parseOptionalPoint(pointsB);
    const pointsLine =
      typeof parsedA === "number" && typeof parsedB === "number" ? `${parsedA} – ${parsedB}` : "Points not entered";
    return (
      <View>
        <Text style={styles.fieldLabel}>Review bout result</Text>
        <Text style={styles.reviewLine}>Winner: {winner === "a" ? aName : bName}</Text>
        <Text style={styles.reviewLine}>{pointsLine}</Text>
        <Text style={styles.reviewLine}>{boutMethodLabel(method)}</Text>
        <Text style={styles.reviewLine}>{note.trim() ? note.trim() : "No note"}</Text>
        <Button label="Record bout result" disabled={busy} loading={busy} onPress={record} />
        <Button label="Edit result" variant="ghost" disabled={busy} onPress={() => setReviewing(false)} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.fieldLabel}>Winner</Text>
      <View style={styles.padRow}>
        <ScorePad
          label="WIN"
          sublabel={aName}
          disabled={busy}
          color={winner === "a" ? Colors.green : Colors.border}
          onPress={() => setWinner("a")}
        />
        <ScorePad
          label="WIN"
          sublabel={bName}
          disabled={busy}
          color={winner === "b" ? Colors.green : Colors.border}
          onPress={() => setWinner("b")}
        />
      </View>
      <Text style={styles.fieldLabel}>Points (optional)</Text>
      <View style={styles.padRow}>
        <View style={styles.cardCol}>
          <Text style={styles.bballName} numberOfLines={4}>
            {aName}
          </Text>
          <TextInput
            value={pointsA}
            onChangeText={setPointsA}
            editable={!busy}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={Colors.textFaint}
            style={styles.pointInput}
            accessibilityLabel={`${aName} points`}
          />
        </View>
        <View style={styles.cardCol}>
          <Text style={styles.bballName} numberOfLines={4}>
            {bName}
          </Text>
          <TextInput
            value={pointsB}
            onChangeText={setPointsB}
            editable={!busy}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={Colors.textFaint}
            style={styles.pointInput}
            accessibilityLabel={`${bName} points`}
          />
        </View>
      </View>
      <Text style={styles.fieldLabel}>Result method</Text>
      <View style={styles.methodWrap}>
        {BOUT_RESULT_METHODS.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setMethod(item)}
            style={[styles.methodBtn, method === item && styles.methodBtnOn, busy && { opacity: 0.4 }]}
          >
            <Text style={styles.methodText}>{boutMethodLabel(item)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fieldLabel}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        editable={!busy}
        maxLength={BOUT_NOTE_MAX}
        placeholder="Short note"
        placeholderTextColor={Colors.textFaint}
        style={styles.noteInput}
        accessibilityLabel="Bout note"
      />
      <Button label="Review bout result" disabled={busy || !winner || !method} onPress={startReview} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 96 },
  rulesNote: {
    color: Colors.textDim,
    fontFamily: Font.medium,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  notice: {
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderColor: Colors.red,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontFamily: Font.medium,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  meta: { color: Colors.textDim, fontSize: 13, flex: 1, fontFamily: Font.medium },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  team: { color: Colors.text, fontSize: 15, fontFamily: Font.bold, flex: 1, flexShrink: 1, flexBasis: 0 },
  teamRight: { textAlign: "right" },
  score: {
    color: Colors.green,
    fontSize: 40,
    fontFamily: Font.extrabold,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    minWidth: 72,
    maxWidth: "42%",
    textAlign: "center",
  },
  methodScore: { fontSize: 18, letterSpacing: 0, maxWidth: "46%" },
  fieldLabel: {
    color: Colors.textDim,
    fontSize: 13,
    fontFamily: Font.bold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  pointInput: {
    minHeight: 64,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 28,
    fontFamily: Font.extrabold,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  noteInput: {
    minHeight: 64,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 18,
    fontFamily: Font.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  methodWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  methodBtn: {
    minHeight: 64,
    minWidth: "46%",
    flexGrow: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  methodBtnOn: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  methodText: { color: Colors.text, fontSize: 16, fontFamily: Font.bold, textAlign: "center" },
  reviewLine: { color: Colors.text, fontSize: 18, fontFamily: Font.semibold, marginBottom: Spacing.xs },
  display: { color: Colors.textDim, textAlign: "center", marginTop: Spacing.sm, fontFamily: Font.medium },
  subline: { color: Colors.textDim, textAlign: "center", marginTop: Spacing.xs, fontSize: 13, fontFamily: Font.medium },
  padRow: { flexDirection: "row", flexWrap: "wrap", marginVertical: Spacing.sm },
  cardRow: { flexDirection: "row", gap: Spacing.md },
  cardCol: { flex: 1, minWidth: 0 },
  bballCol: { flex: 1, minWidth: 0, gap: Spacing.sm },
  bballName: { color: Colors.text, fontSize: 14, fontFamily: Font.bold, textAlign: "center" },
  bballFouls: { color: Colors.textDim, fontSize: 12, textAlign: "center", fontFamily: Font.medium },
  bballPtsCol: { gap: Spacing.xs },
});
