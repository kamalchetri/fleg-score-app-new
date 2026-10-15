import { Link, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ReviewBanner } from "@/components/review/ReviewBanner";
import { Colors, Font, Radius, Spacing } from "@/lib/theme";
import { isReviewBuild } from "@/lib/build-flags";
import { EmptyState, Screen } from "@/components/ui";

export default function ReviewRoute() {
  if (!isReviewBuild()) {
    return <Screen><EmptyState title="Not available." /></Screen>;
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ReviewBanner />
        <Text style={styles.kicker}>Association review</Text>
        <Text style={styles.title}>NSPG scoring review</Text>
        <Text style={styles.body}>
          Review every scoring surface and the pending standard rules. Everything here is synthetic sample data;
          this build does not read or write the live database.
        </Text>
        <ReviewLink href="/scoring-lab" title="Scoring lab" detail="Team, racket, combat, archery, and set-based fixtures" />
        <ReviewLink href="/ranked-results-lab" title="Ranked results lab" detail="Athletics and archery ranking samples" />
        <ReviewLink href="/rules-review" title="Rules in review" detail="Standard presets awaiting technical-committee review" />
      </ScrollView>
    </Screen>
  );
}

function ReviewLink({ href, title, detail }: { href: "/scoring-lab" | "/ranked-results-lab" | "/rules-review"; title: string; detail: string }) {
  return (
    <Link href={href as Href} asChild>
      <Pressable style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.xl },
  kicker: { color: Colors.green, fontFamily: Font.bold, fontSize: 12, letterSpacing: 1, marginTop: Spacing.lg, textTransform: "uppercase" },
  title: { color: Colors.text, fontFamily: Font.extrabold, fontSize: 28 },
  body: { color: Colors.textDim, fontFamily: Font.regular, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs, padding: Spacing.lg },
  cardTitle: { color: Colors.text, fontFamily: Font.bold, fontSize: 17 },
  cardDetail: { color: Colors.textDim, fontFamily: Font.regular, fontSize: 13, lineHeight: 19 },
});
