// Fleg Score design tokens — dark, FLEG green, big targets.
export const Colors = {
  bg: "#08080F",
  surface: "#13131F",
  elevated: "#1C1C2E",
  border: "#26263A",
  green: "#00D95F",
  greenDim: "#00D95F22",
  red: "#FF3B30",
  amber: "#FF9F0A",
  text: "#FFFFFF",
  textDim: "#9B9BB0",
  textFaint: "#5E5E74",
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const statusColors: Record<string, string> = {
  draft: Colors.textFaint,
  published: Colors.amber,
  registration_open: Colors.green,
  registration_closed: Colors.amber,
  live: Colors.green,
  completed: Colors.textDim,
  archived: Colors.textFaint,
  scheduled: Colors.textDim,
  walkover: Colors.textFaint,
  cancelled: Colors.red,
};

export function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}
