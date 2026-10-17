export type GatedRole = "admin" | "nspg_lead" | "nspg_staff" | "organiser" | "organizer" | "user";
export const isOrganiserRole = (role: GatedRole): boolean => role === "organiser" || role === "organizer";
export function normalizeRole(value: unknown): GatedRole { return typeof value === "string" && ["admin", "nspg_lead", "nspg_staff", "organiser", "organizer", "user"].includes(value) ? value as GatedRole : "user"; }
