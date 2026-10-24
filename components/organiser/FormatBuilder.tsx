import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  generateFixtures,
  generateGroupsKnockoutFixtures,
  type GeneratedFixture,
  type OrganiserEntrant,
  type OrganiserFormat,
} from "@/lib/nspg-organiser";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { PrimaryButton, Txt } from "@/components/kit";

export function FormatBuilder({ entrants }: { entrants: OrganiserEntrant[] }) {
  const [format, setFormat] = useState<OrganiserFormat>("league");
  const [fixtures, setFixtures] = useState<GeneratedFixture[]>([]);
  const [semifinals, setSemifinals] = useState<Array<[string, string]>>([]);
  const [final, setFinal] = useState<[string, string] | null>(null);
  const [champion, setChampion] = useState<string | null>(null);
  const [semifinalWinners, setSemifinalWinners] = useState<Array<string | null>>([null, null]);
  const [error, setError] = useState<string | null>(null);
  const approved = entrants.filter((entrant) => entrant.status === "approved");

  async function generate() {
    setError(null);
    try {
      const ids = approved.map((entrant) => entrant.name);
      const next = format === "groups_knockout"
        ? await generateGroupsKnockoutFixtures(ids)
        : await generateFixtures(format, ids);
      setFixtures(next);
      setSemifinals([]);
      setFinal(null);
      setChampion(null);
      setSemifinalWinners([null, null]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate fixtures.");
    }
  }

  function recordWinner(fixture: GeneratedFixture, winner: string) {
    setFixtures((current) => current.map((row) => row.id === fixture.id ? { ...row, winner } : row));
    setSemifinals([]);
  }

  function qualify() {
    const groups = new Map<string, Map<string, number>>();
    for (const fixture of fixtures) {
      if (!fixture.winner || !fixture.round.startsWith("Group ")) continue;
      const group = fixture.round.split("·")[0].trim();
      const table = groups.get(group) ?? new Map<string, number>();
      table.set(fixture.winner, (table.get(fixture.winner) ?? 0) + 1);
      groups.set(group, table);
    }
    const ranked = [...groups.values()].map((table) => [...table.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id));
    if (ranked.length < 2 || ranked.some((rows) => rows.length < 2)) {
      setError("Record every group match before qualifying the semifinals.");
      return;
    }
    setError(null);
    setSemifinals([[ranked[0][0], ranked[1][1]], [ranked[1][0], ranked[0][1]]]);
    setFinal(null);
    setChampion(null);
    setSemifinalWinners([null, null]);
  }

  function recordSemifinalWinner(index: number, winner: string) {
    const winners = [...semifinalWinners];
    winners[index] = winner;
    setSemifinalWinners(winners);
    if (winners[0] && winners[1]) setFinal([winners[0], winners[1]]);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Txt variant="headlineSm">Format builder</Txt>
        <Txt variant="bodySm" color={Colors.textDim}>
          {approved.length} approved entrants · generation is a local draft until published.
        </Txt>
        <View style={styles.row}>
          {(["league", "groups_knockout", "knockout"] as const).map((item) => (
            <Pressable key={item} onPress={() => setFormat(item)} style={[styles.tab, format === item && styles.tabOn]}>
              <Txt variant="labelPill" color={format === item ? Colors.onPrimary : Colors.textDim}>
                {item === "groups_knockout" ? "GROUPS" : item.toUpperCase()}
              </Txt>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label="Generate fixtures" onPress={() => void generate()} disabled={approved.length < 2} />
        {error ? <Txt variant="bodySm" color={Colors.red}>{error}</Txt> : null}
      </View>
      {fixtures.length > 0 ? (
        <View style={styles.card}>
          <Txt variant="headlineSm">Draft fixtures · {fixtures.length}</Txt>
          {fixtures.map((fixture) => (
            <View key={fixture.id} style={styles.fixture}>
              <Txt variant="bodyMd">{fixture.round}</Txt>
              <Txt variant="bodySm" color={Colors.textDim}>{fixture.a ?? "BYE"} vs {fixture.b ?? "BYE"}</Txt>
              {fixture.a && fixture.b ? <View style={styles.row}>
                <Pressable onPress={() => recordWinner(fixture, fixture.a!)} style={[styles.winner, fixture.winner === fixture.a && styles.winnerOn]}><Txt variant="labelPill" color={fixture.winner === fixture.a ? Colors.onPrimary : Colors.textDim}>A WINS</Txt></Pressable>
                <Pressable onPress={() => recordWinner(fixture, fixture.b!)} style={[styles.winner, fixture.winner === fixture.b && styles.winnerOn]}><Txt variant="labelPill" color={fixture.winner === fixture.b ? Colors.onPrimary : Colors.textDim}>B WINS</Txt></Pressable>
              </View> : null}
            </View>
          ))}
          {format === "groups_knockout" ? (
            <>
              <PrimaryButton label="Qualify semifinals" onPress={qualify} disabled={fixtures.some((fixture) => fixture.round.startsWith("Group ") && !fixture.winner)} />
              {semifinals.map(([a, b], index) => <View key={`${a}-${b}`} style={styles.fixture}><Txt variant="bodyMd">Semifinal {index + 1} · {a} vs {b}</Txt><View style={styles.row}><Pressable onPress={() => recordSemifinalWinner(index, a)} style={styles.winner}><Txt variant="labelPill" color={Colors.textDim}>{a} WINS</Txt></Pressable><Pressable onPress={() => recordSemifinalWinner(index, b)} style={styles.winner}><Txt variant="labelPill" color={Colors.textDim}>{b} WINS</Txt></Pressable></View></View>)}
              {final ? <View style={styles.fixture}><Txt variant="bodyMd">Final · {final[0]} vs {final[1]}</Txt><View style={styles.row}><Pressable onPress={() => setChampion(final[0])} style={[styles.winner, champion === final[0] && styles.winnerOn]}><Txt variant="labelPill" color={champion === final[0] ? Colors.onPrimary : Colors.textDim}>{final[0]} WINS</Txt></Pressable><Pressable onPress={() => setChampion(final[1])} style={[styles.winner, champion === final[1] && styles.winnerOn]}><Txt variant="labelPill" color={champion === final[1] ? Colors.onPrimary : Colors.textDim}>{final[1]} WINS</Txt></Pressable></View>{champion ? <Txt variant="headlineSm" color={Colors.primary}>Champion · {champion}</Txt> : null}</View> : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.md },
  card: { backgroundColor: Colors.surface1, borderColor: Colors.hairline, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tab: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  tabOn: { backgroundColor: Colors.primary },
  fixture: { backgroundColor: Colors.surface2, borderRadius: Radius.md, gap: 4, padding: Spacing.md },
  winner: { borderColor: Colors.hairline, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  winnerOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
