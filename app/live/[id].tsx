import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { PickEntry, PickSheet, type PickTarget } from "@/components/PickSheet";
import { usePickTallies } from "@/lib/picks";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  computeArcheryState,
  computeCombatState,
  computeLawnTennisState,
  computeMatchStateForStage,
  computeSepaktakrawState,
  computeTableTennisState,
  computeVolleyballState,
  formatCombatDisplay,
  formatLawnTennisSet,
  parseArcheryConfig,
  lawnTennisPointLine,
  parseLawnTennisConfig,
  parseSepaktakrawConfig,
  parseTableTennisConfig,
  parseVolleyballConfig,
  sepaktakrawHasSquads,
  resolveStageContext,
  type ArcheryDetail,
  type CombatDetail,
  type LawnTennisDetail,
  type ScoringEvent,
  type SepaktakrawDetail,
  type VolleyballDetail,
  type TableTennisDetail,
} from "@/lib/scoring";
import { fetchEvents, fetchMatch, type MatchDetail } from "@/lib/queries";
import { readMatchScoreSnapshot, resolveCategoryMatchEngine } from "@/lib/sports/nspg";
import { effectiveSportConfig } from "@/lib/sports/rules-presets";
import { Colors, Spacing } from "@/lib/theme";
import { Card, Crest, LiveDot, Screen, StatusPill, Txt } from "@/components/kit";

const POLL_MS = 3000;

export default function LiveScoreboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [missing, setMissing] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const tallies = usePickTallies(id ? [id] : []);
  const appActive = useRef(true);

  const load = useCallback(async () => {
    try {
      const m = await fetchMatch(id);
      if (!m) {
        setMissing(true);
        return;
      }
      setMatch(m);
      setEvents(await fetchEvents(id));
    } catch {
      // transient network errors: keep last known state
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (appActive.current) load();
    }, POLL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      appActive.current = s === "active";
      if (s === "active") load();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [load]);

  const engine = match?.tournament
    ? resolveCategoryMatchEngine(match.tournament.sport, match.category?.name)
    : null;
  const state = useMemo(
    () => {
      if (!match?.tournament || !engine) return null;
      const sportConfig = effectiveSportConfig(
        match.tournament.sport,
        match.category?.name,
        match.tournament.sport_config,
      );
      if (engine === "combat") return computeCombatState(events);
      if (engine === "archery") {
        const rules = parseArcheryConfig(sportConfig);
        if (!rules) return null;
        return computeArcheryState(rules, events);
      }
      if (engine === "table_tennis") {
        const rules = parseTableTennisConfig(sportConfig);
        if (!rules) return null;
        return computeTableTennisState(rules, events);
      }
      if (engine === "lawn_tennis") {
        const rules = parseLawnTennisConfig(sportConfig);
        if (!rules) return null;
        return computeLawnTennisState(rules, events);
      }
      if (engine === "sepaktakraw") {
        const rules = parseSepaktakrawConfig(sportConfig);
        if (!rules) return null;
        return computeSepaktakrawState(rules, events);
      }
      if (engine === "volleyball") {
        const rules = parseVolleyballConfig(sportConfig);
        if (!rules) return null;
        return computeVolleyballState(rules, events);
      }
      const stage = resolveStageContext({
        stageType: match.stage?.stage_type,
        stageConfig: match.stage?.config,
        matchRound: match.round,
      });
      return computeMatchStateForStage(
        match.tournament.sport,
        sportConfig,
        events,
        { ...stage, override: match.format_override },
      );
    },
    [match, events, engine],
  );

  if (missing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Live" }} />
        <Center>
          <Txt variant="headlineSm">Match not found</Txt>
          <Txt variant="bodySm" color={Colors.textDim}>
            It may not be public yet.
          </Txt>
        </Center>
      </Screen>
    );
  }
  if (!match) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Live" }} />
        <Center>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Loading…
          </Txt>
        </Center>
      </Screen>
    );
  }

  if (!engine) {
    const snap = readMatchScoreSnapshot(match.score);
    const isLive = match.status === "live";
    const scoreA = snap.a === null ? "–" : String(snap.a);
    const scoreB = snap.b === null ? "–" : String(snap.b);
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {scoreA}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {scoreB}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            {snap.display ? (
              <Txt variant="bodyMd" color={Colors.textDim}>
                {snap.display}
              </Txt>
            ) : null}
          </View>
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (engine === "archery") {
    const isLive = match.status === "live";
    const archery = state?.detail.sport === "archery" ? (state.detail as ArcheryDetail) : null;
    if (!archery) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Rules not configured</Txt>
          </Center>
        </Screen>
      );
    }
    const latest = archery.latestEnd ? `${archery.latestEnd.a}–${archery.latestEnd.b}` : "—";
    const history =
      archery.completedEnds.length > 0 ? archery.completedEnds.map((end) => `${end.a}-${end.b}`).join(", ") : "—";
    const score = archery.format === "set_points" && archery.setPoints ? archery.setPoints : archery.totals;
    const winnerName =
      state?.winnerSide === "a"
        ? (match.a?.display_name ?? "TBD")
        : state?.winnerSide === "b"
          ? (match.b?.display_name ?? "TBD")
          : null;
    const shootOffScores =
      archery.shootOff && archery.shootOff.scoreA !== null && archery.shootOff.scoreB !== null
        ? `${archery.shootOff.scoreA}–${archery.shootOff.scoreB}`
        : null;
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {score.a}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {score.b}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            <Txt variant="bodyMd" color={Colors.textDim}>
              End {archery.endNumber} of {archery.regulationEnds}
            </Txt>
          </View>
          <Txt variant="bodyMd" color={Colors.text}>
            Latest end {latest}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Completed ends {history}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            {archery.format === "set_points" ? "Set points" : "Totals"} {score.a}–{score.b}
          </Txt>
          {archery.shootOff ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              Shoot-off {shootOffScores ?? "scores not entered"}
            </Txt>
          ) : archery.shootOffRequired ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              Shoot-off
            </Txt>
          ) : null}
          {archery.shootOff?.note ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              {archery.shootOff.note}
            </Txt>
          ) : null}
          {winnerName ? (
            <Txt variant="bodyMd" color={Colors.text}>
              Winner {winnerName}
            </Txt>
          ) : null}
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (engine === "sepaktakraw") {
    const isLive = match.status === "live";
    if (!sepaktakrawHasSquads(match.a, match.b)) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Squads not entered</Txt>
          </Center>
        </Screen>
      );
    }
    const takraw = state?.detail.sport === "sepaktakraw" ? (state.detail as SepaktakrawDetail) : null;
    if (!takraw) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Rules not configured</Txt>
          </Center>
        </Screen>
      );
    }
    const completed =
      takraw.completedSets.length > 0 ? takraw.completedSets.map((set) => `${set.a}-${set.b}`).join(", ") : "—";
    const winnerName =
      state?.winnerSide === "a"
        ? (match.a?.display_name ?? "TBD")
        : state?.winnerSide === "b"
          ? (match.b?.display_name ?? "TBD")
          : null;
    const hugeA = state?.isComplete ? takraw.setsWon.a : takraw.currentSet.a;
    const hugeB = state?.isComplete ? takraw.setsWon.b : takraw.currentSet.b;
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {hugeA}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {hugeB}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            <Txt variant="bodyMd" color={Colors.textDim}>
              Sets {takraw.setsWon.a}–{takraw.setsWon.b}
            </Txt>
          </View>
          <Txt variant="bodyMd" color={Colors.text}>
            {state?.isComplete ? "Points —" : `Points ${takraw.currentSet.a}–${takraw.currentSet.b}`}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Completed sets {completed}
          </Txt>
          {takraw.decidingSet ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              Deciding set
            </Txt>
          ) : null}
          {winnerName ? (
            <Txt variant="bodyMd" color={Colors.text}>
              Winner {winnerName}
            </Txt>
          ) : null}
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (engine === "volleyball") {
    const isLive = match.status === "live";
    const volley = state?.detail.sport === "volleyball" ? (state.detail as VolleyballDetail) : null;
    if (!volley) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Rules not configured</Txt>
          </Center>
        </Screen>
      );
    }
    const completed =
      volley.completedSets.length > 0 ? volley.completedSets.map((set) => `${set.a}-${set.b}`).join(", ") : "—";
    const winnerName =
      state?.winnerSide === "a"
        ? (match.a?.display_name ?? "TBD")
        : state?.winnerSide === "b"
          ? (match.b?.display_name ?? "TBD")
          : null;
    const hugeA = state?.isComplete ? volley.setsWon.a : volley.currentSet.a;
    const hugeB = state?.isComplete ? volley.setsWon.b : volley.currentSet.b;
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {hugeA}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {hugeB}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            <Txt variant="bodyMd" color={Colors.textDim}>
              Sets {volley.setsWon.a}–{volley.setsWon.b}
            </Txt>
          </View>
          <Txt variant="bodyMd" color={Colors.text}>
            {state?.isComplete ? "Points —" : `Points ${volley.currentSet.a}–${volley.currentSet.b}`}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Completed sets {completed}
          </Txt>
          {volley.decidingSet ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              Deciding set
            </Txt>
          ) : null}
          {winnerName ? (
            <Txt variant="bodyMd" color={Colors.text}>
              Winner {winnerName}
            </Txt>
          ) : null}
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (engine === "lawn_tennis") {
    const isLive = match.status === "live";
    const lawn = state?.detail.sport === "lawn_tennis" ? (state.detail as LawnTennisDetail) : null;
    if (!lawn) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Rules not configured</Txt>
          </Center>
        </Screen>
      );
    }
    const completed = lawn.completedSets.length > 0 ? lawn.completedSets.map(formatLawnTennisSet).join(", ") : "—";
    const winnerName =
      state?.winnerSide === "a"
        ? (match.a?.display_name ?? "TBD")
        : state?.winnerSide === "b"
          ? (match.b?.display_name ?? "TBD")
          : null;
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {lawn.setsWon.a}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {lawn.setsWon.b}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={3}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            <Txt variant="bodyMd" color={Colors.textDim}>
              Sets {lawn.setsWon.a}–{lawn.setsWon.b}
            </Txt>
          </View>
          <Txt variant="bodyMd" color={Colors.text}>
            {state?.isComplete
              ? "Points —"
              : lawn.inTiebreak
                ? `Tiebreak ${lawn.pointLabels.a}–${lawn.pointLabels.b}`
                : `Points ${lawnTennisPointLine(lawn)}`}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            {state?.isComplete ? "Games —" : `Games ${lawn.games.a}–${lawn.games.b}`}
          </Txt>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Completed sets {completed}
          </Txt>
          {lawn.decidingSet ? (
            <Txt variant="bodyMd" color={Colors.textDim}>
              Deciding set
            </Txt>
          ) : null}
          {winnerName ? (
            <Txt variant="bodyMd" color={Colors.text}>
              Winner {winnerName}
            </Txt>
          ) : null}
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (engine === "table_tennis") {
    const isLive = match.status === "live";
    const tableTennis = state?.detail.sport === "table_tennis" ? (state.detail as TableTennisDetail) : null;
    if (!tableTennis) {
      return (
        <Screen>
          <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
          <Center>
            <Txt variant="headlineSm">Rules not configured</Txt>
          </Center>
        </Screen>
      );
    }
    const completed =
      tableTennis.completedGames.length > 0
        ? tableTennis.completedGames.map((game) => `${game.a}-${game.b}`).join(", ")
        : "—";
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {tableTennis.gamesWon.a}
              </Txt>
              <Txt variant="scoreHuge" color={Colors.textFaint}>
                :
              </Txt>
              <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                {tableTennis.gamesWon.b}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            <Txt variant="bodyMd" color={Colors.textDim}>
              Games won {tableTennis.gamesWon.a}–{tableTennis.gamesWon.b}
            </Txt>
          </View>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Completed games {completed}
          </Txt>
          <Txt variant="bodyMd" color={Colors.text}>
            Current game {tableTennis.currentGame.a}–{tableTennis.currentGame.b}
          </Txt>
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  if (!state) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Live" }} />
        <Center>
          <Txt variant="bodyMd" color={Colors.textDim}>
            Loading…
          </Txt>
        </Center>
      </Screen>
    );
  }

  const isLive = match.status === "live";
  const combat = state.detail.sport === "combat" ? (state.detail as CombatDetail) : null;
  if (combat) {
    const showsPoints = combat.result !== null && combat.result.pointsA !== null && combat.result.pointsB !== null;
    const line = formatCombatDisplay(combat.result);
    return (
      <Screen>
        <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
        <View style={styles.wrap}>
          <View style={styles.metaRow}>
            {isLive ? <LiveDot /> : null}
            <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
              {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
            </Txt>
          </View>
          <View style={styles.board}>
            <View style={styles.side}>
              <Crest name={match.a?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.a?.display_name ?? "TBD"}
              </Txt>
            </View>
            <View style={styles.scoreMid}>
              {showsPoints ? (
                <>
                  <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                    {combat.result?.pointsA}
                  </Txt>
                  <Txt variant="scoreHuge" color={Colors.textFaint}>
                    :
                  </Txt>
                  <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
                    {combat.result?.pointsB}
                  </Txt>
                </>
              ) : (
                <Txt variant="headlineSm" align="center">
                  {line}
                </Txt>
              )}
            </View>
            <View style={styles.side}>
              <Crest name={match.b?.display_name ?? "TBD"} size={64} />
              <Txt variant="headlineSm" align="center" numberOfLines={2}>
                {match.b?.display_name ?? "TBD"}
              </Txt>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusPill status={match.status} />
            {combat.result?.note ? (
              <Txt variant="bodyMd" color={Colors.textDim}>
                {combat.result.note}
              </Txt>
            ) : null}
          </View>
          {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
            <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
              <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
            </View>
          )}
        </View>
        <PickSheet
          target={
            pickOpen
              ? ({
                  id: match.id,
                  home: match.a?.display_name ?? "TBD",
                  away: match.b?.display_name ?? "TBD",
                  status: match.status,
                  startedAt: match.started_at,
                } satisfies PickTarget)
              : null
          }
          onClose={() => setPickOpen(false)}
        />
      </Screen>
    );
  }

  const ticker = [...events]
    .filter((e) => e.event_type === "goal" || e.event_type === "point" || e.event_type === "card")
    .slice(-6)
    .reverse();

  return (
    <Screen>
      <Stack.Screen options={{ title: match.tournament?.name ?? "Live" }} />
      <View style={styles.wrap}>
        <View style={styles.metaRow}>
          {isLive ? <LiveDot /> : null}
          <Txt variant="labelCaps" color={isLive ? Colors.primary : Colors.textDim} numberOfLines={1}>
            {[match.tournament?.name, match.category?.name].filter(Boolean).join(" · ").toUpperCase()}
          </Txt>
        </View>

        {/* Scoreboard */}
        <View style={styles.board}>
          <View style={styles.side}>
            <Crest name={match.a?.display_name ?? "TBD"} size={64} />
            <Txt variant="headlineSm" align="center" numberOfLines={2}>
              {match.a?.display_name ?? "TBD"}
            </Txt>
          </View>

          <View style={styles.scoreMid}>
            <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
              {state.scoreSummary.a}
            </Txt>
            <Txt variant="scoreHuge" color={Colors.textFaint}>
              :
            </Txt>
            <Txt variant="scoreHuge" color={isLive ? Colors.primary : Colors.text}>
              {state.scoreSummary.b}
            </Txt>
          </View>

          <View style={styles.side}>
            <Crest name={match.b?.display_name ?? "TBD"} size={64} />
            <Txt variant="headlineSm" align="center" numberOfLines={2}>
              {match.b?.display_name ?? "TBD"}
            </Txt>
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusPill status={match.status} />
          <Txt variant="bodyMd" color={Colors.textDim}>
            {state.isComplete ? "Final" : state.display}
          </Txt>
        </View>

        {(match.status === "live" || match.status === "scheduled" || match.status === "completed") && (
          <View style={{ alignSelf: "stretch", marginTop: Spacing.md }}>
            <PickEntry total={tallies[match.id]?.total ?? 0} onPick={() => setPickOpen(true)} />
          </View>
        )}

        {/* Ticker */}
        {ticker.length > 0 && (
          <Card style={{ marginTop: Spacing.lg, gap: 8, alignSelf: "stretch" }}>
            <Txt variant="labelCaps" color={Colors.textDim}>
              RECENT
            </Txt>
            {ticker.map((e) => {
              const side = e.payload["side"] === "a" ? match.a?.display_name : match.b?.display_name;
              const kind =
                e.event_type === "card"
                  ? `${String(e.payload["cardType"] ?? "card").toUpperCase()} card`
                  : e.event_type.charAt(0).toUpperCase() + e.event_type.slice(1);
              return (
                <View key={e.id} style={styles.tickLine}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: e.event_type === "card" ? Colors.red : Colors.primary },
                    ]}
                  />
                  <Txt variant="bodySm" color={Colors.text} style={{ flex: 1 }}>
                    {kind}
                  </Txt>
                  <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>
                    {side ?? "—"}
                  </Txt>
                </View>
              );
            })}
          </Card>
        )}
      </View>
      <PickSheet
        target={
          pickOpen
            ? ({
                id: match.id,
                home: match.a?.display_name ?? "TBD",
                away: match.b?.display_name ?? "TBD",
                status: match.status,
                startedAt: match.started_at,
              } satisfies PickTarget)
            : null
        }
        onClose={() => setPickOpen(false)}
      />
    </Screen>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: Spacing.margin, paddingTop: Spacing.lg, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  board: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: Spacing.xl,
    gap: 8,
  },
  side: { flex: 1, alignItems: "center", gap: 10 },
  scoreMid: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Spacing.lg },
  tickLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
