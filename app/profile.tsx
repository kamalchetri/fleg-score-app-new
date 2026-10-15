import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { fetchOrganizerProfile, type OrganizerProfile } from "@/lib/queries";
import { fetchMyXp } from "@/lib/picks";
import { BottomNav, Crest, Screen, StatusPill, Txt } from "@/components/kit";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function Profile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const email = session?.user.email ?? "—";
  const [fullName, setFullName] = useState<string | null>(null);
  const [org, setOrg] = useState<OrganizerProfile | null>(null);
  const [xp, setXp] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [profile, orgProfile, points] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        fetchOrganizerProfile(uid),
        fetchMyXp().catch(() => null),
      ]);
      setFullName((profile.data?.full_name as string | null) ?? null);
      setOrg(orgProfile);
      setXp(points);
    } catch {
      // best-effort — header falls back to email
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName =
    fullName ||
    (typeof session?.user.user_metadata?.full_name === "string"
      ? (session.user.user_metadata.full_name as string)
      : null) ||
    email.split("@")[0];

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.identity}>
          <Crest name={displayName} size={72} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="headlineSm" numberOfLines={1}>
              {displayName}
            </Txt>
            <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>
              {email}
            </Txt>
            {xp != null ? (
              <Txt variant="labelCaps" color={Colors.primary}>
                {xp} XP
              </Txt>
            ) : null}
            {org && (
              <View style={{ flexDirection: "row", marginTop: 2 }}>
                <StatusPill status={org.status} />
              </View>
            )}
          </View>
        </View>

        {org?.org_name ? (
          <View style={styles.orgCard}>
            <MaterialCommunityIcons name="shield-star-outline" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyMd">{org.org_name}</Txt>
              <Txt variant="bodySm" color={Colors.textDim}>
                {[org.city, org.state].filter(Boolean).join(", ") || "Organiser"}
              </Txt>
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.group}>
          <Row icon="whistle-outline" label="My games" onPress={() => router.replace("/games")} />
          <Row icon="calendar-star" label="Events" onPress={() => router.replace("/events")} />
          <Row icon="plus-circle-outline" label="Create a tournament" onPress={() => router.push("/tournament/new")} />
          <Row icon="form-select" label="Submit an event" onPress={() => router.push("/organize/new")} />
          <Row icon="cash-multiple" label="Earnings & payouts" onPress={() => router.push("/organize/earnings")} />
        </View>

        <View style={styles.group}>
          <Row
            icon="open-in-new"
            label="Open web dashboard"
            onPress={() => Linking.openURL("https://www.fleg.in/dashboard")}
          />
          <Row icon="cog-outline" label="Settings" onPress={() => router.push("/settings")} />
        </View>

        <View style={styles.group}>
          <Row icon="logout" label="Log out" danger onPress={logout} />
        </View>

        <Txt variant="bodySm" color={Colors.textFaint} align="center" style={{ marginTop: 8 }}>
          FLEG Score v{Constants.expoConfig?.version ?? "dev"}
        </Txt>
      </ScrollView>

      <BottomNav active="profile" />
    </Screen>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const tint = danger ? Colors.red : Colors.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? Colors.red : Colors.textDim} />
      <Txt variant="bodyMd" color={tint} style={{ flex: 1 }}>
        {label}
      </Txt>
      {!danger && <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDim} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.margin, paddingTop: 16, paddingBottom: 120, gap: Spacing.lg },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  orgCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  group: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
});
