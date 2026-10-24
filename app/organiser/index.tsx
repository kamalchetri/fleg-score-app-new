import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { EmptyState, Screen } from "@/components/ui";
import { PrimaryButton, StatusPill, Txt } from "@/components/kit";
import { useRole } from "@/lib/role";
import { listOrganiserTournaments, type OrganiserTournament } from "@/lib/nspg-organiser";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { NspgBrand } from "@/components/nspg/NspgBrand";

export default function OrganiserHome() {
  const { loading, canManageNspg, role } = useRole();
  const [rows, setRows] = useState<OrganiserTournament[]>([]);
  useEffect(() => { if (canManageNspg) void listOrganiserTournaments().then(setRows); }, [canManageNspg]);
  if (loading) return <Screen><EmptyState title="Checking organiser access…" /></Screen>;
  if (!canManageNspg) return <Screen><EmptyState title="Organiser access required." body={`Your role is ${role}. NSPG management is limited to approved staff.`} /></Screen>;
  const live = rows.filter((t) => t.status === "live").length;
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <NspgBrand partners />
    <Txt variant="labelCaps" color={Colors.primary}>NSPG OPERATIONS · SAMPLE DATA</Txt><Txt variant="displayHero">Organiser hub</Txt>
    <Txt variant="bodyMd" color={Colors.textDim}>Role: {role ?? "organiser"}. Manage your approved disciplines and publish verified results.</Txt>
    <View style={styles.kpis}><Kpi label="TOURNAMENTS" value={rows.length} /><Kpi label="LIVE NOW" value={live} /><Kpi label="MATCHES" value={rows.reduce((sum, t) => sum + t.matches, 0)} /><Kpi label="PUBLISHED" value={rows.filter((t) => t.status === "complete").length} /></View>
    <View style={styles.card}><Txt variant="headlineSm">Field operations</Txt><Txt variant="bodySm" color={Colors.textDim}>Open the tools for help-desk volunteers and approved checkpoint staff.</Txt><PrimaryButton label="Kiosk athlete lookup" icon="account-search" onPress={() => router.push("/kiosk" as never)} /><PrimaryButton label="Accreditation scanner" icon="qrcode-scan" onPress={() => router.push("/accreditation" as never)} /><PrimaryButton label="Access log" icon="clipboard-text-clock-outline" onPress={() => router.push("/access-log" as never)} /></View>
    <Txt variant="headlineSm">Disciplines</Txt>
    {rows.map((t) => <Pressable key={t.id} style={styles.card} onPress={() => router.push(`/organiser/${t.id}` as never)}><View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Txt variant="headlineSm">{t.sport}</Txt><Txt variant="bodySm" color={Colors.textDim}>{t.name} · {t.venue}</Txt></View><StatusPill status={t.status === "complete" ? "completed" : t.status} /></View><View style={styles.meta}><Txt variant="bodySm" color={Colors.textDim}>Entrants {t.entrants}</Txt><Txt variant="bodySm" color={Colors.textDim}>Fixtures {t.matches ? "READY" : "DRAFT"}</Txt><Txt variant="bodySm" color={Colors.textDim}>Played {t.status === "complete" ? t.matches : 0}</Txt></View></Pressable>)}
  </ScrollView></Screen>;
}
function Kpi({ label, value }: { label: string; value: number }) { return <View style={styles.kpi}><Txt variant="labelCaps" color={Colors.onPrimary}>{label}</Txt><Txt variant="displayHero" color={Colors.onPrimary}>{value}</Txt></View>; }
const styles = StyleSheet.create({ content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: Spacing.xxl }, kpis: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }, kpi: { backgroundColor: Colors.primary, borderRadius: Radius.lg, gap: 4, minWidth: "47%", padding: Spacing.md }, card: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.lg, padding: Spacing.lg }, row: { alignItems: "center", flexDirection: "row", gap: Spacing.md }, meta: { borderTopColor: Colors.hairline, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: Spacing.md } });
