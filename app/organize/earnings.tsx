import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { fetchAppSettings } from "@/lib/app-settings";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";
import { formatInr } from "@/lib/money";
import {
  fetchEarnings,
  payoutInMonth,
  sumEarnings,
  type EarningRow,
  type EarningsBundle,
  type PayoutRow,
} from "@/lib/earnings";
import { IconButton, Screen, StatusPill, Txt } from "@/components/kit";

export default function Earnings() {
  const { session, loading: authLoading } = useAuth();
  const uid = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<EarningsBundle | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);

  const months = useMemo(() => recentMonths(6), []);
  const month = months[monthIndex] ?? months[0]!;

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!uid) {
        setLoading(false);
        return;
      }
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const [data, settings] = await Promise.all([
          fetchEarnings(uid),
          fetchAppSettings().catch(() => null),
        ]);
        setBundle(data);
        setNote(settings?.payout_cycle_note ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load earnings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const payouts = useMemo(() => {
    if (!bundle) return [];
    if (monthIndex === 0 && months[0]?.all) return bundle.payouts;
    return bundle.payouts.filter((row) => payoutInMonth(row, month.year, month.month));
  }, [bundle, month, monthIndex, months]);

  if (authLoading || loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!uid) {
    return (
      <Screen>
        <View style={styles.center}>
          <Txt variant="headlineSm">Sign in to view earnings</Txt>
          <Pressable onPress={() => router.push("/login")}>
            <Txt variant="bodyMd" color={Colors.primary}>
              Sign in
            </Txt>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const totals = sumEarnings(bundle?.earnings ?? []);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt variant="headlineSm">Earnings</Txt>
          <Txt variant="bodySm" color={Colors.textDim}>
            Payouts
          </Txt>
        </View>
        <View style={styles.badge}>
          <Txt variant="labelCaps" color={Colors.onPrimary} style={{ fontSize: 10 }}>
            MANUAL v1.0
          </Txt>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
      >
        {error ? (
          <View style={styles.center}>
            <Txt variant="bodyMd" color={Colors.red}>
              {error}
            </Txt>
            <Txt variant="bodySm" color={Colors.textDim}>
              Pull down to retry.
            </Txt>
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              <Tile label="Gross intake" value={formatInr(totals.gross)} />
              <Tile label="Platform fee" value={formatInr(totals.fee)} />
            </View>
            <View style={styles.net}>
              <Txt variant="labelCaps" color={Colors.onPrimary}>
                NET BALANCE
              </Txt>
              <Txt variant="headlineLg" color={Colors.onPrimary}>
                {formatInr(totals.net)}
              </Txt>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {months.map((item, index) => {
                const on = index === monthIndex;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setMonthIndex(index)}
                    style={[styles.month, { backgroundColor: on ? Colors.primary : Colors.surface2 }]}
                  >
                    <Txt variant="labelPill" color={on ? Colors.onPrimary : Colors.textDim}>
                      {item.label}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            {note ? (
              <Txt variant="bodySm" color={Colors.textDim}>
                {note}
              </Txt>
            ) : (
              <Txt variant="bodySm" color={Colors.textDim}>
                Payouts are processed by FLEG. The month filter applies to disbursements.
              </Txt>
            )}

            <Txt variant="headlineSm">Revenue by event</Txt>
            {(bundle?.earnings.length ?? 0) === 0 ? (
              <Empty text="No paid registrations yet." />
            ) : (
              bundle!.earnings.map((row) => <EarningCard key={`${row.source}-${row.event_id}`} row={row} />)
            )}

            <View style={styles.card}>
              <Txt variant="labelCaps" color={Colors.textDim}>
                DISBURSEMENT ACCOUNT
              </Txt>
              <Txt variant="bodyLg">{bundle?.account.label}</Txt>
              <Txt variant="bodyMd" color={Colors.textDim}>
                {bundle?.account.masked}
              </Txt>
              <Pressable onPress={() => router.push("/onboarding")}>
                <Txt variant="labelPill" color={Colors.primary}>
                  Edit details
                </Txt>
              </Pressable>
            </View>

            <Txt variant="headlineSm">Recent disbursements</Txt>
            {payouts.length === 0 ? (
              <Empty text="No disbursements in this period." />
            ) : (
              payouts.map((row) => <PayoutCard key={row.reference} row={row} />)
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Txt variant="labelCaps" color={Colors.textDim}>
        {label.toUpperCase()}
      </Txt>
      <Txt variant="headlineSm">{value}</Txt>
    </View>
  );
}

function EarningCard({ row }: { row: EarningRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Txt variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>
          {row.title}
        </Txt>
        <StatusPill status={row.status || "published"} />
      </View>
      <Txt variant="bodySm" color={Colors.textDim}>
        {row.registrations} registrations
      </Txt>
      <View style={styles.row}>
        <Stat label="Gross" value={formatInr(row.gross)} />
        <Stat label="Fee" value={formatInr(row.fee)} />
        <Stat label="Net" value={formatInr(row.net)} accent />
      </View>
    </View>
  );
}

function PayoutCard({ row }: { row: PayoutRow }) {
  const when = row.paid_at ?? row.scheduled_at;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Txt variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>
          {row.reference || "Payout"}
        </Txt>
        <StatusPill status={row.status || "pending"} />
      </View>
      <Txt variant="headlineSm" color={Colors.primary}>
        {formatInr(row.amount)}
      </Txt>
      <Txt variant="bodySm" color={Colors.textDim}>
        {[row.cycle, when ? formatDateTime(when) : null, row.utr_reference ? `UTR ${row.utr_reference}` : null]
          .filter(Boolean)
          .join(" · ")}
      </Txt>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="labelCaps" color={accent ? Colors.primary : Colors.textDim}>
        {label.toUpperCase()}
      </Txt>
      <Txt variant="bodyMd" color={accent ? Colors.primary : Colors.text}>
        {value}
      </Txt>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Txt variant="bodySm" color={Colors.textDim}>
        {text}
      </Txt>
    </View>
  );
}

function recentMonths(count: number): { key: string; label: string; year: number; month: number; all?: boolean }[] {
  const now = new Date();
  const all = { key: "all", label: "All", year: now.getFullYear(), month: now.getMonth(), all: true };
  const months = [all];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      all: false,
    });
  }
  return months;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.margin,
    paddingVertical: 8,
  },
  badge: { backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  body: { padding: Spacing.margin, paddingBottom: 40, gap: 12 },
  center: { paddingVertical: 40, alignItems: "center", gap: 8 },
  tiles: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    gap: 6,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  net: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  month: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  card: {
    gap: 8,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  empty: {
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.hairline,
  },
});
