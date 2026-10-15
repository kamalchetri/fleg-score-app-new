import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Palette, Radius, Spacing } from "@/lib/theme";
import { fetchAppSettings } from "@/lib/app-settings";
import { useAuth } from "@/lib/auth-context";
import {
  canChangePick,
  fetchMyPick,
  fetchMyXp,
  fetchTallies,
  upsertPick,
  type PickSide,
  type PickTally,
} from "@/lib/picks";
import { Crest, Txt } from "@/components/kit";

export interface PickTarget {
  id: string;
  home: string;
  away: string;
  status: string;
  startedAt?: string | null;
}

export function PickEntry({ total, onPick }: { total: number; onPick: () => void }) {
  const label = total === 0 ? "Be the first to pick" : `${total} placed a pick`;
  return (
    <View style={styles.entry}>
      <View style={styles.avatars}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -8 }]}>
            <MaterialCommunityIcons name="account" size={12} color={Colors.textDim} />
          </View>
        ))}
      </View>
      <Txt variant="bodySm" color={Colors.textDim} style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Txt>
      <Pressable onPress={onPick} style={({ pressed }) => [styles.pickBtn, { opacity: pressed ? 0.85 : 1 }]}>
        <Txt variant="labelPill" color={Colors.onPrimary}>
          PICK
        </Txt>
      </Pressable>
    </View>
  );
}

export function PickSheet({
  target,
  onClose,
}: {
  target: PickTarget | null;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState<PickTally | null>(null);
  const [side, setSide] = useState<PickSide | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const [tallies, settings, mine, totalXp] = await Promise.all([
        fetchTallies([target.id]),
        fetchAppSettings().catch(() => ({ platform_fee_bps: 500, xp_multiplier: 1, payout_cycle_note: null })),
        userId ? fetchMyPick(target.id, userId) : Promise.resolve(null),
        userId ? fetchMyXp().catch(() => null) : Promise.resolve(null),
      ]);
      setTally(tallies[target.id] ?? { match_id: target.id, a_count: 0, b_count: 0, total: 0 });
      setMultiplier(settings.xp_multiplier);
      setSide(mine?.side ?? null);
      setCorrect(mine?.is_correct ?? null);
      setXpAwarded(mine?.xp_awarded ?? null);
      setXp(totalXp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load picks.");
    } finally {
      setLoading(false);
    }
  }, [target, userId]);

  useEffect(() => {
    if (target) void load();
  }, [target, load]);

  const open = target != null;
  const locked = target ? !canChangePick({ status: target.status, started_at: target.startedAt }) : true;
  const finished = target?.status === "completed" || target?.status === "walkover";
  const total = tally?.total ?? 0;
  const aPct = total > 0 ? Math.round(((tally?.a_count ?? 0) / total) * 100) : 0;
  const bPct = total > 0 ? 100 - aPct : 0;

  async function choose(next: PickSide) {
    if (!target || !userId || locked || busy) return;
    setBusy(true);
    setError(null);
    try {
      await upsertPick(target.id, userId, next);
      setSide(next);
      const tallies = await fetchTallies([target.id]);
      setTally(tallies[target.id] ?? tally);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your pick.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Txt variant="headlineSm">Place a pick</Txt>
            {multiplier > 1 ? (
              <View style={styles.xpBadge}>
                <Txt variant="labelPill" color={Colors.onPrimary}>
                  Double XP
                </Txt>
              </View>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : error && !tally ? (
            <View style={{ gap: 8 }}>
              <Txt variant="bodyMd" color={Colors.red}>
                {error}
              </Txt>
              <Pressable onPress={() => void load()}>
                <Txt variant="bodySm" color={Colors.primary}>
                  Retry
                </Txt>
              </Pressable>
            </View>
          ) : target ? (
            <View style={{ gap: 14 }}>
              {!userId ? (
                <Pressable onPress={() => { onClose(); router.push("/login"); }} style={styles.signIn}>
                  <Txt variant="bodyMd">Sign in to place a pick</Txt>
                </Pressable>
              ) : null}

              <View style={styles.choices}>
                <Choice
                  name={target.home}
                  pct={aPct}
                  count={tally?.a_count ?? 0}
                  selected={side === "a"}
                  disabled={!userId || locked || busy}
                  onPress={() => void choose("a")}
                />
                <Choice
                  name={target.away}
                  pct={bPct}
                  count={tally?.b_count ?? 0}
                  selected={side === "b"}
                  disabled={!userId || locked || busy}
                  onPress={() => void choose("b")}
                />
              </View>

              <View style={styles.verified}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.live} />
                <Txt variant="bodySm" color={Colors.textDim}>
                  {total} verified picks
                </Txt>
              </View>

              {finished && side ? (
                <View style={[styles.result, { borderColor: correct ? Colors.live : Colors.danger }]}>
                  <Txt variant="labelCaps" color={correct ? Colors.live : Colors.danger}>
                    {correct ? "CORRECT PICK" : correct === false ? "WRONG PICK" : "GRADED"}
                  </Txt>
                  {xpAwarded != null ? (
                    <Txt variant="headlineSm" color={Colors.primary}>
                      +{xpAwarded} XP
                    </Txt>
                  ) : null}
                </View>
              ) : locked ? (
                <Txt variant="bodySm" color={Colors.textDim}>
                  Picks close at kickoff.
                </Txt>
              ) : (
                <Txt variant="bodySm" color={Colors.textDim}>
                  You can change your pick until the match starts.
                </Txt>
              )}

              {error ? (
                <Txt variant="bodySm" color={Colors.red}>
                  {error}
                </Txt>
              ) : null}

              {xp != null ? (
                <Txt variant="labelCaps" color={Colors.textDim}>
                  YOUR XP · {xp}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Choice({
  name,
  pct,
  count,
  selected,
  disabled,
  onPress,
}: {
  name: string;
  pct: number;
  count: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor: selected ? Colors.primary : Colors.hairline,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Crest name={name} size={48} />
      <Txt variant="bodyLg" align="center" numberOfLines={2}>
        {name}
      </Txt>
      {selected ? (
        <Txt variant="labelCaps" color={Colors.primary}>
          YOUR PICK
        </Txt>
      ) : null}
      <Txt variant="scoreDisplay" color={selected ? Colors.primary : Colors.text}>
        {pct}%
      </Txt>
      <Txt variant="bodySm" color={Colors.textDim}>
        {count}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entry: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 36,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface3,
    marginBottom: 4,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  xpBadge: { backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  signIn: {
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  choices: { flexDirection: "row", gap: 12 },
  choice: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
  },
  verified: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  result: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
    backgroundColor: Palette.surfaceLow,
  },
});
