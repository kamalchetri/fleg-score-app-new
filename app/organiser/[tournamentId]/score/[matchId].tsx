import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MatchScoringView } from "@/components/scoring/MatchScoringView";
import { Screen, Txt } from "@/components/kit";
import { useRole } from "@/lib/role";
import { seedScoringMatch } from "@/lib/nspg-organiser";
import { disciplineForTournament } from "@/lib/nspg-organiser";
import { SCORING_LAB_FIXTURES } from "@/lib/scoring-lab/fixtures";
import { projectMatchState } from "@/lib/scoring/project-match";
import type { ScoringEvent } from "@/lib/scoring";
import { Colors, Spacing } from "@/lib/theme";
import { RankedResultsView } from "@/components/ranked-results/RankedResultsView";
import { RANKED_LAB_FIXTURES } from "@/lib/ranked-results/fixtures";
import { parseRankedRules, type RankedBoard } from "@/lib/ranked-results/engine";

export default function OrganiserScoreControl() {
  const { matchId = "", tournamentId = "" } = useLocalSearchParams<{ matchId?: string; tournamentId?: string }>(); const { canManageNspg, loading } = useRole(); const sport = disciplineForTournament(Array.isArray(tournamentId) ? tournamentId[0] : tournamentId); const ranked = sport === "athletics" || sport === "archery"; const fixture = SCORING_LAB_FIXTURES.find((f) => f.id === (sport === "athletics" || sport === "archery" ? "ranked" : sport)) ?? SCORING_LAB_FIXTURES[0]; const match = useMemo(() => seedScoringMatch(Array.isArray(matchId) ? matchId[0] : matchId, sport), [matchId, sport]); const [events, setEvents] = useState<ScoringEvent[]>(fixture.events); const [board, setBoard] = useState<RankedBoard>(() => ({ entrants: RANKED_LAB_FIXTURES[0].entrants, actions: RANKED_LAB_FIXTURES[0].actions })); const [busy, setBusy] = useState(false);
  const rankedParsed = parseRankedRules(RANKED_LAB_FIXTURES[0].rules);
  if (loading) return <Screen><Txt variant="bodyLg" color={Colors.textDim}>Checking organiser access…</Txt></Screen>;
  if (!canManageNspg) return <Screen><Txt variant="headlineSm">Organiser access required.</Txt></Screen>;
  function onEvent(eventType: string, payload: Record<string, unknown>) { if (busy) return; setBusy(true); const id = events.reduce((max, event) => Math.max(max, event.id), 0) + 1; setEvents((current) => [...current, { id, event_type: eventType, payload, created_at: new Date().toISOString() }]); setBusy(false); }
  function onConfirm() { const state = projectMatchState(match, events); if (state?.winnerSide) Alert.alert("Seed result", "This sample result is not published to production."); }
  return <Screen><View style={styles.note}><Txt variant="labelCaps" color={Colors.primary}>NSPG ORGANISER · {sport.toUpperCase()}</Txt><Txt variant="bodySm" color={Colors.textDim}>Production writes use the guarded RPC through the existing match-control flow. This seed result stays in memory.</Txt></View>{ranked ? <RankedResultsView rules={rankedParsed.ok ? rankedParsed.rules : null} rulesReason={rankedParsed.ok ? null : rankedParsed.reason} board={board} note="Seed ranked recorder; production rules are configured per discipline." finalized={false} onBoard={setBoard} /> : <MatchScoringView match={match} events={events} busy={busy} now={Date.now()} onEvent={onEvent} onStart={() => {}} onConfirm={onConfirm} />}</Screen>;
}
const styles = StyleSheet.create({ note: { gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm } });
