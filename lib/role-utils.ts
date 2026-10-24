export type GatedRole =
  | "admin"
  | "nspg_lead"
  | "nspg_staff"
  | "organiser"
  | "organizer"
  | "volunteer"
  | "kiosk_volunteer"
  | "official"
  | "referee"
  | "user";

const ROLES: readonly GatedRole[] = [
  "admin",
  "nspg_lead",
  "nspg_staff",
  "organiser",
  "organizer",
  "volunteer",
  "kiosk_volunteer",
  "official",
  "referee",
  "user",
];

export const isOrganiserRole = (role: GatedRole): boolean => role === "organiser" || role === "organizer";
export const isNspgStaffRole = (role: GatedRole): boolean =>
  role === "admin" || role === "nspg_lead" || role === "nspg_staff" || isOrganiserRole(role);
export const canScanAccreditation = (role: GatedRole): boolean =>
  isNspgStaffRole(role) || role === "volunteer" || role === "kiosk_volunteer";
export const canViewAccessLog = (role: GatedRole): boolean => isNspgStaffRole(role);

export function normalizeRole(value: unknown): GatedRole {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (ROLES as readonly string[]).includes(normalized) ? normalized as GatedRole : "user";
}
