import { useCallback, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { Colors, Spacing } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Screen } from "@/components/ui";

interface Row {
  id: string;
  status: string;
  court: string | null;
  scheduled_at: string | null;
  a: { display_name: string } | null;
  b: { display_name: string } | null;
  category: { name: string } | null;
}

interface T {
  id: string;
  name: string;
  sport: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  venue_name: string | null;
}

export default function TournamentSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [t, setT] = useState<T | null>(null);
  const [matches, setMatches] = useState<Row[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data } = await supabase
          .from("tournaments")
          .select("id, name, sport, status, starts_at, ends_at, city, venue_name")
          .eq("id", id)
          .maybeSingle();
        setT(data as T | null);
        const { data: ms } = await supabase
          .from("matches")
          .select(
            `id, status, court, scheduled_at,
             a:entrants!matches_entrant_a_fkey(display_name),
             b:entrants!matches_entrant_b_fkey(display_name),
             category:tournament_categories!matches_category_id_fkey(name)`,
          )
          .eq("tournament_id", id)
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .limit(50);
        setMatches((ms ?? []) as unknown as Row[]);
      })();
    }, [id]),
  );

  if (!t) {
    return (
      <Screen>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }

  const live = matches.filter((m) => m.status === "live");
  const rest = matches.filter((m) => m.status !== "live");

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{t.name}</Text>
            <Badge status={t.status} />
          </View>
          <Text style={styles.meta}>
            {t.sport} · {formatDateRange(t.starts_at, t.ends_at)}
            {t.venue_name ? ` · ${t.venue_name}` : ""}
            {t.city ? `, ${t.city}` : ""}
          </Text>
          <Text style={[styles.meta, { marginTop: Spacing.sm }]}>
            Full management (entrants, brackets, scheduling) is on the web dashboard for now — in-app
            management arrives in the next build.
          </Text>
          <Button
            label="Open web dashboard"
            variant="ghost"
            onPress={() => Linking.openURL(`https://www.fleg.in/dashboard/t/${t.id}`)}
          />
        </Card>

        {live.length > 0 ? <Text style={styles.section}>Live now</Text> : null}
        {live.map((m) => (
          <MatchRow key={m.id} m={m} />
        ))}

        <Text style={styles.section}>Matches</Text>
        {rest.length === 0 ? (
          <EmptyState title="No matches yet" body="Generate the bracket on the web dashboard." />
        ) : (
          rest.map((m) => <MatchRow key={m.id} m={m} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function MatchRow({ m }: { m: Row }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.teams} numberOfLines={1}>
          {m.a?.display_name ?? "TBD"} vs {m.b?.display_name ?? "TBD"}
        </Text>
        <Badge status={m.status} />
      </View>
      <Text style={styles.meta}>
        {m.category?.name}
        {m.court ? ` · ${m.court}` : ""} · {formatDateTime(m.scheduled_at)}
      </Text>
      <Button
        label={m.status === "live" ? "Watch live" : "Open"}
        variant="ghost"
        onPress={() => router.push(`/live/${m.id}`)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: { color: Colors.text, fontSize: 18, fontWeight: "800", flex: 1 },
  teams: { color: Colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
  meta: { color: Colors.textDim, fontSize: 13, marginTop: Spacing.xs },
  section: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
