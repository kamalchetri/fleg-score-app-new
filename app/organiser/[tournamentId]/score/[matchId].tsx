import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MatchScoringView } from "@/components/scoring/MatchScoringView";
import { Screen, Txt } from "@/components/kit";
import { useRole } from "@/lib/role";
import { seedScoringMatch } from "@/lib/nspg-organiser";
import { SCORING_LAB_FIXTURES } from "@/lib/scoring-lab/fixtures";
import { projectMatchState } from "@/lib/scoring/project-match";
import type { ScoringEvent } from "@/lib/scoring";
import { Colors, Spacing } from "@/lib/theme";

export default function OrganiserScoreControl() {
  const { matchId = "" } = useLocalSearchParams<{ matchId?: string }>(); const { canManageNspg, loading } = useRole(); const fixture = SCORING_LAB_FIXTURES.find((f) => f.id === "football") ?? SCORING_LAB_FIXTURES[0]; const match = useMemo(() => seedScoringMatch(matchId), [matchId]); const [events, setEvents] = useState<ScoringEvent[]>(fixture.events); const [busy, setBusy] = useState(false);
  if (loading) return <Screen><Txt variant="bodyLg" color={Colors.textDim}>Checking organiser access…</Txt></Screen>;
  if (!canManageNspg) return <Screen><Txt variant="headlineSm">Organiser access required.</Txt></Screen>;
  function onEvent(eventType: string, payload: Record<string, unknown>) { if (busy) return; setBusy(true); const id = events.reduce((max, event) => Math.max(max, event.id), 0) + 1; setEvents((current) => [...current, { id, event_type: eventType, payload, created_at: new Date().toISOString() }]); setBusy(false); }
  function onConfirm() { const state = projectMatchState(match, events); if (state?.winnerSide) Alert.alert("Seed result", "This sample result is not published to production."); }
  return <Screen><View style={styles.note}><Txt variant="labelCaps" color={Colors.primary}>NSPG ORGANISER · SAMPLE CONTROL</Txt><Txt variant="bodySm" color={Colors.textDim}>Production matches use the guarded RPC through the existing match-control flow. This seed match stays in memory.</Txt></View><MatchScoringView match={match} events={events} busy={busy} now={Date.now()} onEvent={onEvent} onStart={() => {}} onConfirm={onConfirm} /></Screen>;
}
const styles = StyleSheet.create({ note: { gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm } });
