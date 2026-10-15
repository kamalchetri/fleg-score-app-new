import { Linking, StyleSheet, Text, View } from "react-native";
import { type Href, router } from "expo-router";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Colors, Font, Spacing } from "@/lib/theme";
import { Button, Card, Screen } from "@/components/ui";

export default function Settings() {
  const { session } = useAuth();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <View style={{ padding: Spacing.lg }}>
        <Card>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{session?.user.email ?? "—"}</Text>
        </Card>
        <Card>
          <Text style={styles.label}>App version</Text>
          <Text style={styles.value}>{Constants.expoConfig?.version ?? "dev"}</Text>
        </Card>
        <Button
          label="Open web dashboard"
          variant="ghost"
          onPress={() => Linking.openURL("https://www.fleg.in/dashboard")}
        />
        {__DEV__ ? (
          <>
            <Button label="Scoring lab" variant="ghost" onPress={() => router.push("/scoring-lab" as Href)} />
            <Button label="Ranked results lab" variant="ghost" onPress={() => router.push("/ranked-results-lab" as Href)} />
          </>
        ) : null}
        <Button label="Log out" variant="danger" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.textDim, fontSize: 13 },
  value: { color: Colors.text, fontSize: 16, fontFamily: Font.semibold, marginTop: 2 },
});
