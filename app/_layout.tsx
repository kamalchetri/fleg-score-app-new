import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "@/lib/auth-context";
import { Colors, Font } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.canvas },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontFamily: Font.bold },
          contentStyle: { backgroundColor: Colors.canvas },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: "Sign up" }} />
        <Stack.Screen name="onboarding" options={{ title: "Setup", headerBackVisible: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="events" options={{ headerShown: false }} />
        <Stack.Screen name="discover" options={{ headerShown: false }} />
        <Stack.Screen name="games" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="organize/new" options={{ headerShown: false }} />
        <Stack.Screen name="organize/earnings" options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: "Match Control" }} />
        <Stack.Screen name="scoring-lab" options={{ title: "Scoring lab" }} />
        <Stack.Screen name="ranked-results-lab" options={{ title: "Ranked results lab" }} />
        <Stack.Screen name="review" options={{ title: "Association review" }} />
        <Stack.Screen name="rules-review" options={{ title: "Rules in review" }} />
        <Stack.Screen name="live/[id]" options={{ title: "Live" }} />
        <Stack.Screen name="tournament/new" options={{ title: "New tournament" }} />
        <Stack.Screen name="tournament/[id]" options={{ title: "Tournament" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </AuthProvider>
  );
}
