import { useEffect, useState } from "react";
import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { ensurePendingOrganizerProfile, fetchOrganizerProfile } from "@/lib/queries";
import { Colors } from "@/lib/theme";

export default function Index() {
  const { session, loading } = useAuth();
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setDest("/login");
      return;
    }
    ensurePendingOrganizerProfile(session.user)
      .then(() => fetchOrganizerProfile(session.user.id))
      .then((p) => setDest(p ? "/home" : "/onboarding"))
      .catch(() => setDest("/onboarding"));
  }, [session, loading]);

  if (loading || (session && !dest)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={(dest ?? "/onboarding") as Href} />;
}
