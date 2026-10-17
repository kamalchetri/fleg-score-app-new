import type { AthleteProfile } from "./athlete-live";
import { getAthleteByRegId } from "./athlete-live";
export type Direction = "in" | "out";
export interface Checkpoint { id: string; name: string; kind: string; }
export interface AccessScan { id: string; regId: string; checkpointId: string; direction: Direction; scannedAt: string; person: Pick<AthleteProfile, "name" | "role" | "district" | "photoUrl"> | null; }
const CHECKPOINTS: Checkpoint[] = [{ id: "main-gate", name: "Main Gate", kind: "gate" }, { id: "cafeteria", name: "Cafeteria", kind: "facility" }, { id: "ig-stadium", name: "Indira Gandhi Stadium", kind: "arena" }, { id: "chumoukedima", name: "Chümoukedima Stadium", kind: "arena" }];
let scans: AccessScan[] = [{ id: "scan-1", regId: "FBL-1234", checkpointId: "main-gate", direction: "in", scannedAt: new Date().toISOString(), person: { name: "Arenla Jamir", role: "Athlete", district: "Kohima", photoUrl: null } }];
export async function listCheckpoints(): Promise<Checkpoint[]> { return CHECKPOINTS; }
export async function logScan(regId: string, checkpointId: string, direction: Direction): Promise<AccessScan> { const person = await getAthleteByRegId(regId); const row: AccessScan = { id: `scan-${Date.now()}`, regId, checkpointId, direction, scannedAt: new Date().toISOString(), person: person ? { name: person.name, role: person.role, district: person.district, photoUrl: person.photoUrl } : null }; scans = [row, ...scans]; return row; }
export async function recentScans(filter?: { checkpointId?: string; regId?: string }): Promise<AccessScan[]> { return scans.filter((s) => (!filter?.checkpointId || s.checkpointId === filter.checkpointId) && (!filter?.regId || s.regId.toLowerCase().includes(filter.regId.toLowerCase()))); }
