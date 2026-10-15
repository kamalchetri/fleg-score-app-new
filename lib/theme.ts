// FLEG Score design system — "Electric Dark Score".
// Dark obsidian canvas + electric chartreuse-lime signal. Plus Jakarta Sans.
// Ported from the Stitch design export. Old keys (bg/surface/green/…) are kept
// as aliases so pre-existing screens keep compiling while we migrate.

export const Palette = {
  // Surfaces (tonal layering, OLED-friendly)
  canvas: "#0D0E12", // Layer 0 — base
  surface1: "#16181F", // cards, search bars
  surface2: "#1F222A", // pills, secondary cards
  surface3: "#2A2D37", // floating controls, nav icons
  surfaceLow: "#121319", // recessed / input wells

  // Signal
  lime: "#CEF202", // PRIMARY — electric chartreuse
  limeDim: "#B4D400",
  onLime: "#0B0C10", // text/icons on lime
  liveGreen: "#10E862", // live pulse / positive
  alertRed: "#FF334B", // live red / cards / danger
  amber: "#FF9F0A",

  // Rank medals
  gold: "#FFCF5A",
  silver: "#C8D0DA",
  bronze: "#E0995A",

  // Text
  white: "#FFFFFF",
  textSecondary: "#8E929E",
  textMuted: "#545763",

  // Hairlines
  hairline: "rgba(255,255,255,0.07)",
  hairlineSoft: "rgba(255,255,255,0.05)",
} as const;

/** Semantic colors. New names + backward-compatible aliases. */
export const Colors = {
  // new semantic
  canvas: Palette.canvas,
  surface1: Palette.surface1,
  surface2: Palette.surface2,
  surface3: Palette.surface3,
  primary: Palette.lime,
  primaryDim: Palette.limeDim,
  onPrimary: Palette.onLime,
  live: Palette.liveGreen,
  danger: Palette.alertRed,
  gold: Palette.gold,
  silver: Palette.silver,
  bronze: Palette.bronze,
  text: Palette.white,
  textDim: Palette.textSecondary,
  textFaint: Palette.textMuted,
  hairline: Palette.hairline,

  // --- backward-compat aliases (old theme keys) ---
  bg: Palette.canvas,
  surface: Palette.surface1,
  elevated: Palette.surface2,
  border: "#26263A",
  green: Palette.lime, // primary is now lime
  greenDim: "rgba(206,242,2,0.13)",
  red: Palette.alertRed,
  amber: Palette.amber,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  // design-token spacing
  s2xs: 4,
  sXs: 8,
  sSm: 12,
  sMd: 16,
  sLg: 24,
  sXl: 32,
  s2xl: 48,
  margin: 20, // screen edge margin (1.25rem)
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  x2l: 32,
  pill: 9999,
} as const;

// Plus Jakarta Sans family names from @expo-google-fonts/plus-jakarta-sans.
export const Font = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

/** Typography scale (fontSize / lineHeight / family / letterSpacing). */
export const Type = {
  displayHero: { fontFamily: Font.extrabold, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 },
  headlineLg: { fontFamily: Font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  headlineMd: { fontFamily: Font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headlineSm: { fontFamily: Font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  scoreDisplay: { fontFamily: Font.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  scoreHuge: { fontFamily: Font.extrabold, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  bodyLg: { fontFamily: Font.medium, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: Font.regular, fontSize: 14, lineHeight: 22 },
  bodySm: { fontFamily: Font.medium, fontSize: 12, lineHeight: 18 },
  labelCaps: { fontFamily: Font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
  labelPill: { fontFamily: Font.bold, fontSize: 12, lineHeight: 16 },
} as const;

export type TypeVariant = keyof typeof Type;

// Status → color (used by badges/chips). Kept from old theme + tuned to new palette.
export const statusColors: Record<string, string> = {
  draft: Palette.textMuted,
  published: Palette.amber,
  registration_open: Palette.lime,
  registration_closed: Palette.amber,
  live: Palette.alertRed,
  completed: Palette.textSecondary,
  archived: Palette.textMuted,
  scheduled: Palette.textSecondary,
  walkover: Palette.textMuted,
  cancelled: Palette.alertRed,
};

export function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}
