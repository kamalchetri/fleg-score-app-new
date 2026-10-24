import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getAthleteAnalytics, getAthleteProfile, type AthleteAnalytics, type AthleteProfile } from "@/lib/athlete-live";
import { Colors, Palette, Radius, Spacing } from "@/lib/theme";
import { EmptyState, Screen } from "@/components/ui";
import { StatusPill, Txt } from "@/components/kit";

export default function AthleteScreen() {
  const { regId = "" } = useLocalSearchParams<{ regId?: string }>();
  const key = Array.isArray(regId) ? regId[0] : regId;
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [analytics, setAnalytics] = useState<AthleteAnalytics[]>([]);

  useEffect(() => {
    void getAthleteProfile(key).then(setProfile);
    void getAthleteAnalytics(key).then(setAnalytics);
  }, [key]);

  if (!profile) return <Screen><EmptyState title="Athlete not found" body="Check the registration ID and try again." /></Screen>;

  const level = Math.max(1, Math.floor(profile.xp / 500) + 1);
  const levelProgress = (profile.xp % 500) / 500 * 100;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}><Txt variant="labelCaps" color={Colors.primary}>FLEG SCORE · ATHLETE SCIENCE</Txt><Txt variant="bodySm" color={Colors.textDim}>Validated competition record</Txt></View>
        <View style={styles.header}>
          {profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} style={styles.photo} /> : <View style={styles.photoFallback}><Txt variant="displayHero" color={Colors.onPrimary}>{profile.name.slice(0, 1)}</Txt></View>}
          <View style={{ flex: 1, gap: 5 }}><Txt variant="displayHero" numberOfLines={2}>{profile.name}</Txt><Txt variant="labelCaps" color={Colors.primary}>{profile.regId} · {profile.role.toUpperCase()}</Txt><Txt variant="bodyMd" color={Colors.textDim}>{profile.district} · {profile.sports.join(" / ")} · {profile.gender}</Txt></View>
        </View>
        <View style={styles.xpCard}><View style={styles.xpTop}><View><Txt variant="labelCaps" color={Colors.onPrimary}>FLEG XP</Txt><Txt variant="scoreHuge" color={Colors.onPrimary}>{profile.xp.toLocaleString()}</Txt></View><View style={styles.levelBadge}><Txt variant="labelCaps" color={Colors.onPrimary}>LEVEL</Txt><Txt variant="headlineLg" color={Colors.onPrimary}>{level}</Txt></View></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${levelProgress}%` }]} /></View><View style={styles.xpBottom}><Txt variant="bodySm" color={Colors.onPrimary}>Progress to level {level + 1}</Txt><View style={styles.streak}><MaterialCommunityIcons name="fire" size={15} color={Colors.onPrimary} /><Txt variant="labelPill" color={Colors.onPrimary}>{profile.streakDays}-DAY STREAK</Txt></View></View></View>
        <View style={styles.statsRow}><Metric label="RANK" value={`#${profile.standing.rank}`} icon="podium" /><Metric label="W–L" value={profile.standing.record} icon="chart-line" /><Metric label="PLAYED" value={String(profile.standing.played)} icon="whistle" /><Metric label="MEDALS" value={String(profile.medals.length)} icon="medal" /></View>
        <Section title="Competition standing"><View style={styles.standing}><Txt variant="headlineSm">{profile.team ?? profile.sports[0]?.toUpperCase()}</Txt><Txt variant="bodySm" color={Colors.textDim}>{profile.standing.nextMatch ? `Next match · ${profile.standing.nextMatch.opponent} · ${profile.standing.nextMatch.date}` : "Competition complete"}</Txt></View></Section>
        <Section title="Achievements"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementRow}>{profile.achievements.map((achievement) => <View key={achievement.title} style={[styles.achievement, { borderColor: achievement.tone === "gold" ? Palette.gold : achievement.tone === "red" ? Palette.alertRed : Palette.lime }]}><View style={styles.achievementIcon}><MaterialCommunityIcons name={achievement.icon as never} size={21} color={achievement.tone === "gold" ? Palette.gold : achievement.tone === "red" ? Palette.alertRed : Palette.lime} /></View><Txt variant="labelPill" numberOfLines={2}>{achievement.title}</Txt></View>)}</ScrollView></Section>
        {analytics.map((a) => <AnalyticsPanel key={a.sport} analytics={a} />)}
        <Section title="Match history"><View style={styles.panel}>{profile.history.map((m) => <View key={m.id} style={styles.history}><View style={{ flex: 1 }}><Txt variant="bodyLg">{m.opponent}</Txt><Txt variant="bodySm" color={Colors.textDim}>{m.date} · {m.venue}</Txt></View><StatusPill status={m.result === "W" || m.result === "1st" ? "completed" : "scheduled"} /><Txt variant="labelPill" color={Colors.primary}>{m.score}</Txt></View>)}</View></Section>
        {profile.medals.length ? <Section title="Medals"><View style={styles.panel}>{profile.medals.map((m) => <View key={m.event} style={styles.medal}><MaterialCommunityIcons name="medal" size={20} color={m.medal === "gold" ? Palette.gold : m.medal === "silver" ? Palette.silver : Palette.bronze} /><Txt variant="bodyMd">{m.event}</Txt><Txt variant="labelPill" color={Colors.primary}>{m.medal.toUpperCase()}</Txt></View>)}</View></Section> : null}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><View style={styles.sectionHeader}><Txt variant="headlineSm">{title}</Txt><View style={styles.sectionLine} /></View>{children}</View>; }
function Metric({ label, value, icon }: { label: string; value: string; icon: string }) { return <View style={styles.metric}><MaterialCommunityIcons name={icon as never} size={17} color={Colors.primary} /><Txt variant="labelCaps" color={Colors.textDim}>{label}</Txt><Txt variant="headlineSm">{value}</Txt></View>; }
function AnalyticsPanel({ analytics }: { analytics: AthleteAnalytics }) { return <Section title={`${analytics.sport.toUpperCase()} performance`}><View style={styles.panel}><View style={styles.stats}>{analytics.stats.map((s) => <View key={s.label} style={styles.stat}><Txt variant="labelCaps" color={Colors.textDim}>{s.label}</Txt><Txt variant="headlineSm">{s.value}</Txt></View>)}</View><Txt variant="bodySm" color={Colors.textDim}>Performance trend</Txt>{analytics.trends.map((t) => <View key={t.label} style={styles.trend}><Txt variant="bodySm" color={Colors.textDim} style={{ width: 68 }}>{t.label}</Txt><View style={styles.track}><View style={[styles.fill, { width: `${t.value}%` }]} /></View><Txt variant="labelPill" color={Colors.primary}>{t.value}</Txt></View>)}</View></Section>; }

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.margin, paddingBottom: 120 }, brand: { gap: 3 }, header: { alignItems: "center", flexDirection: "row", gap: Spacing.lg }, photo: { borderColor: Colors.primary, borderRadius: 50, borderWidth: 2, height: 100, width: 100 }, photoFallback: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 50, height: 100, justifyContent: "center", width: 100 }, xpCard: { backgroundColor: Colors.primary, borderRadius: Radius.xl, gap: Spacing.md, padding: Spacing.lg }, xpTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, levelBadge: { alignItems: "center", backgroundColor: "rgba(11,12,16,0.16)", borderRadius: Radius.lg, gap: 2, paddingHorizontal: 16, paddingVertical: 10 }, progressTrack: { backgroundColor: "rgba(11,12,16,0.18)", borderRadius: 4, height: 8, overflow: "hidden" }, progressFill: { backgroundColor: Colors.onPrimary, borderRadius: 4, height: 8 }, xpBottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, streak: { alignItems: "center", flexDirection: "row", gap: 4 }, statsRow: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.lg, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: Spacing.md }, metric: { alignItems: "center", gap: 3 }, section: { gap: Spacing.sm }, sectionHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.sm }, sectionLine: { backgroundColor: Colors.hairline, flex: 1, height: 1 }, standing: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.lg, borderWidth: 1, gap: 4, padding: Spacing.lg }, achievementRow: { gap: Spacing.sm }, achievement: { alignItems: "center", backgroundColor: Colors.surface1, borderRadius: Radius.lg, borderWidth: 1, gap: 8, padding: Spacing.md, width: 116 }, achievementIcon: { alignItems: "center", backgroundColor: Colors.surface2, borderRadius: Radius.pill, height: 42, justifyContent: "center", width: 42 }, panel: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg }, stats: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }, stat: { gap: 3, minWidth: "20%" }, trend: { alignItems: "center", flexDirection: "row", gap: 8 }, track: { backgroundColor: Colors.surface3, borderRadius: 4, flex: 1, height: 8, overflow: "hidden" }, fill: { backgroundColor: Colors.primary, height: 8 }, history: { alignItems: "center", borderBottomColor: Colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingVertical: 8 }, medal: { alignItems: "center", flexDirection: "row", gap: 8 },
});
