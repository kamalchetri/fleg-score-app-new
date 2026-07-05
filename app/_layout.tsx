import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { Colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: Colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: "Fleg Score", headerBackVisible: false }} />
        <Stack.Screen name="match/[id]" options={{ title: "Match Control" }} />
        <Stack.Screen name="live/[id]" options={{ title: "Live" }} />
        <Stack.Screen name="tournament/[id]" options={{ title: "Tournament" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </AuthProvider>
  );
}
