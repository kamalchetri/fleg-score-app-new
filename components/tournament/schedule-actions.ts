// Thin shims around the queries module — keep tab components decoupled from
// the underlying helpers and let us add tournament-id guards without
// touching the call sites.
import { setWalkover, updateMatchSchedule } from "@/lib/queries";

export async function setMatchSchedule(
  _tournamentId: string,
  matchId: string,
  input: { court: string; scheduledAt: string; refereeId: string },
): Promise<void> {
  await updateMatchSchedule(matchId, input);
}

export async function setWalkoverAction(
  _tournamentId: string,
  matchId: string,
  side: "a" | "b",
): Promise<void> {
  await setWalkover(matchId, side);
}
