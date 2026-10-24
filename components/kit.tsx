// FLEG Score UI kit — "Electric Dark Score" component library.
// Reusable, typed building blocks that map 1:1 to the Stitch design system.
import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Font, Palette, Radius, Spacing, Type, type TypeVariant } from "@/lib/theme";
import { NspgWatermark } from "@/components/nspg/NspgWatermark";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/* ── Typography ─────────────────────────────────────────────────────────── */
export function Txt({
  variant = "bodyMd",
  color = Colors.text,
  align,
  numberOfLines,
  style,
  children,
}: {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[Type[variant] as TextStyle, { color, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

/* ── Screen wrapper ─────────────────────────────────────────────────────── */
export function Screen({ children, style, watermark = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; watermark?: boolean }) {
  const segments = useSegments() as readonly string[];
  const isNspgRoute =
    segments.includes("nspg") ||
    segments.includes("organiser") ||
    segments.includes("kiosk") ||
    segments.includes("accreditation") ||
    segments.includes("access-log") ||
    segments.includes("athlete") ||
    (segments.includes("(tabs)") && segments.includes("live"));
  return <SafeAreaView style={[styles.screen, style]}>{watermark || isNspgRoute ? <NspgWatermark /> : null}{children}</SafeAreaView>;
}

/* ── Icon button (circular) ─────────────────────────────────────────────── */
export function IconButton({
  icon,
  onPress,
  size = 44,
  dot,
  color = Colors.textDim,
  bg = Colors.surface2,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  dot?: boolean;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={size * 0.45} color={color} />
      {dot ? <View style={styles.iconDot} /> : null}
    </Pressable>
  );
}

/* ── Live pulse dot ─────────────────────────────────────────────────────── */
export function LiveDot({ color = Colors.danger, size = 8 }: { color?: string; size?: number }) {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: a }} />;
}

/* ── Status pill ────────────────────────────────────────────────────────── */
export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "live") {
    return (
      <View style={[styles.pill, { backgroundColor: "rgba(255,51,75,0.14)" }]}>
        <LiveDot />
        <Txt variant="labelCaps" color={Colors.danger}>
          LIVE
        </Txt>
      </View>
    );
  }
  const map: Record<string, { label: string; color: string }> = {
    completed: { label: "FT", color: Colors.textDim },
    walkover: { label: "W/O", color: Colors.textDim },
    scheduled: { label: "SCHEDULED", color: Colors.textDim },
    registration_open: { label: "REG OPEN", color: Colors.primary },
    published: { label: "UPCOMING", color: Colors.amber },
  };
  const m = map[s] ?? { label: status.toUpperCase(), color: Colors.textDim };
  return (
    <View style={[styles.pill, { backgroundColor: Colors.surface2 }]}>
      <Txt variant="labelCaps" color={m.color}>
        {m.label}
      </Txt>
    </View>
  );
}

/* ── Sport pill (chip with icon) ────────────────────────────────────────── */
export function SportPill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sportPill,
        { backgroundColor: active ? Colors.primary : Colors.surface3, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={[
          styles.sportIcon,
          { backgroundColor: active ? "rgba(11,12,16,0.15)" : Palette.surface2 },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={16} color={active ? Colors.onPrimary : Colors.text} />
      </View>
      <Txt variant="labelPill" color={active ? Colors.onPrimary : Colors.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ── Team crest (monogram) ──────────────────────────────────────────────── */
export function Crest({ name, size = 44 }: { name: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.surface3,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt variant="labelPill" color={Colors.primary} style={{ fontSize: size * 0.32 }}>
        {initials}
      </Txt>
    </View>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ── Section header ─────────────────────────────────────────────────────── */
export function SectionHeader({
  title,
  live,
  onViewAll,
}: {
  title: string;
  live?: boolean;
  onViewAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Txt variant="headlineSm">{title}</Txt>
        {live ? <LiveDot color={Colors.primary} /> : null}
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Txt variant="bodySm" color={Colors.textDim}>
            View All
          </Txt>
          <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Live hero card (lime) ──────────────────────────────────────────────── */
export function LiveHeroCard({
  competition,
  home,
  away,
  homeScore,
  awayScore,
  clock,
  onPress,
}: {
  competition: string;
  home: string;
  away: string;
  homeScore: number | string;
  awayScore: number | string;
  clock: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.95 : 1 }]}>
      <View style={styles.heroHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons name="trophy" size={16} color={Colors.onPrimary} />
          <Txt variant="labelCaps" color={Colors.onPrimary}>
            {competition.toUpperCase()}
          </Txt>
        </View>
        <View style={styles.ongoing}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary }} />
          <Txt variant="labelCaps" color={Colors.primary}>
            ONGOING
          </Txt>
        </View>
      </View>

      <View style={styles.heroBody}>
        <View style={styles.heroTeam}>
          <Crest name={home} size={56} />
          <Txt variant="headlineSm" color={Colors.onPrimary} align="center" numberOfLines={1}>
            {home}
          </Txt>
        </View>
        <View style={{ alignItems: "center", paddingHorizontal: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Txt variant="scoreDisplay" color={Colors.onPrimary}>
              {homeScore}
            </Txt>
            <Txt variant="scoreDisplay" color="rgba(11,12,16,0.5)">
              :
            </Txt>
            <Txt variant="scoreDisplay" color={Colors.onPrimary}>
              {awayScore}
            </Txt>
          </View>
          <View style={styles.heroClock}>
            <MaterialCommunityIcons name="timer-outline" size={12} color={Colors.onPrimary} />
            <Txt variant="labelCaps" color={Colors.onPrimary}>
              {clock}
            </Txt>
          </View>
        </View>
        <View style={styles.heroTeam}>
          <Crest name={away} size={56} />
          <Txt variant="headlineSm" color={Colors.onPrimary} align="center" numberOfLines={1}>
            {away}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/* ── Fixture card (standard) ────────────────────────────────────────────── */
export function FixtureCard({
  home,
  away,
  status,
  score,
  meta,
  onPress,
  footer,
}: {
  home: string;
  away: string;
  status: string;
  score?: string;
  meta?: string;
  onPress?: () => void;
  footer?: ReactNode;
}) {
  return (
    <View style={[styles.card, { gap: 10 }]}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, gap: 10 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {meta ? (
          <Txt variant="labelCaps" color={Colors.textDim} numberOfLines={1} style={{ flex: 1 }}>
            {meta.toUpperCase()}
          </Txt>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <StatusPill status={status} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={styles.fxTeam}>
          <Crest name={home} size={36} />
          <Txt variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>
            {home}
          </Txt>
        </View>
        <Txt variant="scoreDisplay" color={status === "live" ? Colors.primary : Colors.text} style={{ paddingHorizontal: 12 }}>
          {score ?? "vs"}
        </Txt>
        <View style={[styles.fxTeam, { justifyContent: "flex-end" }]}>
          <Txt variant="bodyLg" numberOfLines={1} align="right" style={{ flex: 1 }}>
            {away}
          </Txt>
          <Crest name={away} size={36} />
        </View>
      </View>
      </Pressable>
      {footer}
    </View>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.primaryBtn, { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={Colors.onPrimary} /> : null}
      <Txt variant="labelPill" color={Colors.onPrimary} style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Design-system names for new screens; existing aliases remain stable. */
export const HeroCard = LiveHeroCard;
export const MatchCard = FixtureCard;
export const Pill = StatusPill;
export const Button = PrimaryButton;

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textFaint}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      style={styles.input}
    />
  );
}

/* ── Bottom navigation ──────────────────────────────────────────────────── */
export type NavTab = "home" | "events" | "games" | "profile";
const NAV: { key: NavTab; icon: IconName; label: string }[] = [
  { key: "home", icon: "home-variant", label: "Home" },
  { key: "events", icon: "calendar-star", label: "Events" },
  { key: "games", icon: "whistle", label: "My Games" },
  { key: "profile", icon: "account", label: "Profile" },
];
const NAV_PATH: Record<NavTab, "/home" | "/events" | "/games" | "/profile"> = {
  home: "/home",
  events: "/events",
  games: "/games",
  profile: "/profile",
};

export function BottomNav({ active, onNavigate }: { active: NavTab; onNavigate?: (t: NavTab) => void }) {
  const segments = useSegments() as readonly string[];
  const insets = useSafeAreaInsets();
  if (segments[0] === "(tabs)") return null;
  function go(t: NavTab) {
    if (onNavigate) return onNavigate(t);
    if (t === active) return;
    // replace (not push) so the tabs don't stack in history.
    router.replace(NAV_PATH[t]);
  }
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {NAV.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => go(t.key)} style={styles.navItem}>
            <MaterialCommunityIcons name={t.icon} size={24} color={on ? Colors.primary : Colors.textDim} />
            <Txt variant="labelCaps" color={on ? Colors.primary : Colors.textDim} style={{ fontSize: 9 }}>
              {t.label.toUpperCase()}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Tournament card (Discover / Profile lists) ─────────────────────────── */
export function TournamentCard({
  name,
  sport,
  status,
  meta,
  onPress,
}: {
  name: string;
  sport: string;
  status: string;
  meta?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1, flexDirection: "row", alignItems: "center", gap: 12 }]}>
      <Crest name={name} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyLg" numberOfLines={1}>
          {name}
        </Txt>
        <Txt variant="bodySm" color={Colors.textDim} numberOfLines={1}>
          {[sport.charAt(0).toUpperCase() + sport.slice(1), meta].filter(Boolean).join(" · ")}
        </Txt>
      </View>
      <StatusPill status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  iconBtn: { alignItems: "center", justifyContent: "center" },
  iconDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  sportPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: Radius.pill },
  sportIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, overflow: "hidden" },
  heroHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ongoing: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.canvas },
  heroBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  heroTeam: { flex: 1, alignItems: "center", gap: 8 },
  heroClock: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: "rgba(11,12,16,0.10)" },
  fxTeam: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.primary, borderColor: "rgba(255,255,255,0.22)", borderRadius: Radius.pill, borderWidth: 1, elevation: 3, minHeight: 50, paddingVertical: 14, paddingHorizontal: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 7 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(13,14,18,0.92)",
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: 10,
    paddingBottom: 24,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  input: {
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surface1,
    color: Colors.text,
    fontFamily: Font.regular,
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
  },
});
