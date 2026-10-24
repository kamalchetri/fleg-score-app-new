import { useEffect, useState } from "react";
import { router, useRootNavigationState } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { ensurePendingOrganizerProfile, fetchOrganizerProfile } from "@/lib/queries";
import { Colors } from "@/lib/theme";
import { isReviewBuild } from "@/lib/build-flags";

export default function Index() {
  const { session, loading } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (isReviewBuild()) {
      setDest("/review");
      return;
    }
    if (!session) {
      setDest("/(tabs)/nspg");
      return;
    }
    ensurePendingOrganizerProfile(session.user)
      .then(() => fetchOrganizerProfile(session.user.id))
      .then((p) => setDest(p ? "/(tabs)/home" : "/onboarding"))
      .catch(() => setDest("/onboarding"));
  }, [session, loading]);

  // Expo Router's linking state is not ready during the first render. Doing
  // the redirect in an effect avoids enqueueing a navigation update against a
  // navigator that has not mounted yet (especially when a dev-client deep link
  // is opening at the same time).
  useEffect(() => {
    if (!rootNavigationState?.key || !dest) return;
    router.replace(dest as never);
  }, [dest, rootNavigationState?.key]);

  if (loading || !dest || !rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  return null;
}
