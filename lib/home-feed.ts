// Home / Discover feed state. Loads the public feed once on mount and derives
// the sport filter from what actually exists. No external state lib — plain
// hook, same pattern as auth-context.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  fetchLiveMatches,
  fetchPublicTournaments,
  fetchRecentResults,
  fetchUpcomingMatches,
  type FeedMatch,
  type PublicTournament,
} from "@/lib/queries";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Sport slug → label + icon. Unknown sports fall back to a trophy. */
const SPORT_META: Record<string, { label: string; icon: IconName }> = {
  futsal: { label: "Futsal", icon: "soccer" },
  football: { label: "Football", icon: "soccer" },
  pickleball: { label: "Pickleball", icon: "tennis" },
  darts: { label: "Darts", icon: "bullseye-arrow" },
  basketball: { label: "Basketball", icon: "basketball" },
  badminton: { label: "Badminton", icon: "badminton" },
};

export function sportLabel(sport: string): string {
  return SPORT_META[sport]?.label ?? sport.charAt(0).toUpperCase() + sport.slice(1);
}
export function sportIcon(sport: string): IconName {
  return SPORT_META[sport]?.icon ?? "trophy-outline";
}

export interface SportOption {
  key: string;
  label: string;
  icon: IconName;
}

export interface HomeFeed {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  sports: SportOption[];
  live: FeedMatch[];
  fixtures: FeedMatch[];
  results: FeedMatch[];
  tournaments: PublicTournament[];
  refresh: () => void;
}

/**
 * @param sport  active sport filter, or "all". Filtering is client-side — the
 *               feed is small and it keeps the query count flat.
 */
export function useHomeFeed(sport: string): HomeFeed {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<FeedMatch[]>([]);
  const [fixtures, setFixtures] = useState<FeedMatch[]>([]);
  const [results, setResults] = useState<FeedMatch[]>([]);
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);

  const load = useCallback(async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [l, u, r, t] = await Promise.all([
        fetchLiveMatches(),
        fetchUpcomingMatches(20),
        fetchRecentResults(10),
        fetchPublicTournaments(30),
      ]);
      setLive(l);
      setFixtures(u);
      setResults(r);
      setTournaments(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Sports that actually have public tournaments, in a stable order.
  const sports = useMemo<SportOption[]>(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const t of tournaments) {
      if (!seen.has(t.sport)) {
        seen.add(t.sport);
        order.push(t.sport);
      }
    }
    return order.map((s) => ({ key: s, label: sportLabel(s), icon: sportIcon(s) }));
  }, [tournaments]);

  const bySport = useCallback(
    (arr: FeedMatch[]) =>
      sport === "all" ? arr : arr.filter((m) => m.tournament?.sport === sport),
    [sport],
  );

  return {
    loading,
    refreshing,
    error,
    sports,
    live: useMemo(() => bySport(live), [bySport, live]),
    fixtures: useMemo(() => bySport(fixtures), [bySport, fixtures]),
    results: useMemo(() => bySport(results), [bySport, results]),
    tournaments: useMemo(
      () => (sport === "all" ? tournaments : tournaments.filter((t) => t.sport === sport)),
      [sport, tournaments],
    ),
    refresh: () => void load(true),
  };
}
