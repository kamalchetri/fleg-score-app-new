import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { completeOAuthFromUrl, routeAfterAuth } from "@/lib/google-auth";
import { Colors, Spacing } from "@/lib/theme";

/** Handles cold-start / deep-link OAuth returns (flegscore://auth-callback). */
export default function AuthCallback() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.includes("auth-callback")) {
          await completeOAuthFromUrl(initialUrl);
        } else {
          const code = params.code;
          const codeValue = Array.isArray(code) ? code[0] : code;
          if (codeValue) {
            const url = Linking.createURL("auth-callback", { queryParams: { code: codeValue } });
            await completeOAuthFromUrl(url);
          }
        }
        await routeAfterAuth();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
        router.replace("/login");
      }
    })();
  }, [params.code]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.bg,
        padding: Spacing.xl,
      }}
    >
      {error ? (
        <Text style={{ color: Colors.red, textAlign: "center" }}>{error}</Text>
      ) : (
        <ActivityIndicator color={Colors.green} size="large" />
      )}
    </View>
  );
}
