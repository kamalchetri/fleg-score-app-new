import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { fetchOrganizerProfile, type OrganizerProfile } from "@/lib/queries";
import { fetchMyXp } from "@/lib/picks";
import { BottomNav, Crest, Screen, StatusPill, Txt, PrimaryButton } from "@/components/kit";
import { useRole } from "@/lib/role";
import { uploadPlayerAvatar } from "@/lib/uploads";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function Profile() {
  const { session } = useAuth();
  const { canOrganise, canManageNspg, isSuperAdmin } = useRole();
  const uid = session?.user.id;
  const email = session?.user.email ?? "—";
  const [fullName, setFullName] = useState<string | null>(null);
  const [org, setOrg] = useState<OrganizerProfile | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [profile, orgProfile, points] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", uid).maybeSingle(),
        fetchOrganizerProfile(uid),
        fetchMyXp().catch(() => null),
      ]);
      setFullName((profile.data?.full_name as string | null) ?? null);
      setAvatarUrl((profile.data?.avatar_url as string | null) ?? null);
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

  async function chooseAvatar() {
    if (!uid || uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "Allow photo access to choose a profile picture.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      // Keep the result within the production avatar bucket's 1 MB limit.
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setUploading(true);
    try {
      const url = await uploadPlayerAvatar(picked.assets[0].uri, uid, picked.assets[0].mimeType ?? "image/jpeg");
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", uid)
        .select("id, avatar_url")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updatedProfile) throw new Error("Your profile could not be updated. Please sign in again and retry.");
      setAvatarUrl(url);
    } catch (error) {
      Alert.alert("Could not update photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (!session) {
    return <Screen><View style={styles.guest}><Txt variant="displayHero">Your profile</Txt><Txt variant="bodyLg" color={Colors.textDim} align="center">Sign in to view your profile, saved games, and personal actions.</Txt><PrimaryButton label="Sign in" onPress={() => router.push("/login" as never)} /></View></Screen>;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}><Image source={require("../assets/fleg-score-logo-white.png")} style={styles.brandLogo} resizeMode="contain" /><Txt variant="labelCaps" color={Colors.primary}>FLEG SCORE</Txt></View>
        {/* Identity */}
        <View style={styles.identity}>
          <Pressable onPress={() => void chooseAvatar()} style={styles.avatarButton}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Crest name={displayName} size={72} />}
            <View style={styles.cameraBadge}><MaterialCommunityIcons name="camera" size={13} color={Colors.onPrimary} /></View>
          </Pressable>
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
            {isSuperAdmin ? <Txt variant="labelCaps" color={Colors.primary}>SUPER ADMIN · FULL CONTROL</Txt> : null}
            <Pressable onPress={() => void chooseAvatar()} disabled={uploading} hitSlop={8}>
              <Txt variant="labelCaps" color={Colors.primary}>{uploading ? "UPLOADING PHOTO…" : avatarUrl ? "CHANGE PROFILE PHOTO" : "ADD PROFILE PHOTO"}</Txt>
            </Pressable>
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

        {canOrganise || canManageNspg ? (
          <PrimaryButton label="Organiser / Admin Dashboard →" onPress={() => router.push("/organiser" as never)} />
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
  guest: { alignItems: "center", flex: 1, gap: Spacing.lg, justifyContent: "center", padding: Spacing.margin },
  // Keep the final action above the fixed tab bar and Android gesture/navigation inset.
  body: { paddingHorizontal: Spacing.margin, paddingTop: 16, paddingBottom: 192, gap: Spacing.lg },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  brandLogo: { height: 28, width: 28 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarButton: { position: "relative" },
  avatarImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: Colors.primary },
  cameraBadge: { alignItems: "center", backgroundColor: Colors.primary, borderColor: Colors.canvas, borderRadius: 13, borderWidth: 2, bottom: -2, height: 26, justifyContent: "center", position: "absolute", right: -2, width: 26 },
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
