import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { EmptyState, Screen } from "@/components/ui";
import { StatusPill, Txt } from "@/components/kit";
import { useRole } from "@/lib/role";
import { listOrganiserTournaments, type OrganiserTournament } from "@/lib/nspg-organiser";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function OrganiserHome() {
  const { loading, canManageNspg, role } = useRole(); const [rows, setRows] = useState<OrganiserTournament[]>([]);
  useEffect(() => { if (canManageNspg) void listOrganiserTournaments().then(setRows); }, [canManageNspg]);
  if (loading) return <Screen><EmptyState title="Checking organiser access…" /></Screen>;
  if (!canManageNspg) return <Screen><EmptyState title="Organiser access required." body={`Your role is ${role}. NSPG management is limited to approved staff.`} /></Screen>;
  return <Screen><ScrollView contentContainerStyle={styles.content}><Txt variant="labelCaps" color={Colors.primary}>NSPG OPERATIONS · SAMPLE DATA</Txt><Txt variant="displayHero">Organiser hub</Txt><Txt variant="bodyMd" color={Colors.textDim}>Seed tournaments mirror the management flow. Production writes remain behind the approved RLS/RPC contracts.</Txt>{rows.map((t) => <Pressable key={t.id} style={styles.card} onPress={() => router.push(`/organiser/${t.id}` as never)}><View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Txt variant="headlineSm">{t.name}</Txt><Txt variant="bodySm" color={Colors.textDim}>{t.sport} · {t.venue}</Txt></View><StatusPill status={t.status === "complete" ? "completed" : t.status} /></View><View style={styles.meta}><Txt variant="bodySm" color={Colors.textDim}>{t.categories} categories</Txt><Txt variant="bodySm" color={Colors.textDim}>{t.entrants} entrants</Txt><Txt variant="bodySm" color={Colors.textDim}>{t.matches} matches</Txt></View></Pressable>)}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl }, card: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.lg, padding: Spacing.lg }, row: { alignItems: "center", flexDirection: "row", gap: Spacing.md }, meta: { borderTopColor: Colors.hairline, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: Spacing.md } });
