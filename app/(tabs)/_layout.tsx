import { Tabs, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Alert, BackHandler, Platform } from "react-native";
import type { ColorValue } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Font } from "@/lib/theme";

const tabIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const rootTabs = ["/home", "/discover", "/live", "/profile", "/(tabs)/home", "/(tabs)/discover", "/(tabs)/live", "/(tabs)/profile"];
    if (!rootTabs.includes(pathname)) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pathname !== "/home" && pathname !== "/(tabs)/home") {
        router.replace("/(tabs)/home" as never);
      } else {
        Alert.alert("Exit FLEG Score?", "Do you want to close the app?", [
          { text: "Stay", style: "cancel" },
          { text: "Exit", onPress: () => BackHandler.exitApp() },
        ]);
      }
      return true;
    });
    return () => sub.remove();
  }, [pathname]);
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarStyle: {
          backgroundColor: Colors.canvas,
          borderTopColor: Colors.hairline,
          height: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontFamily: Font.bold, fontSize: 10, letterSpacing: 0.6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: tabIcon("home-variant") }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: tabIcon("compass-outline") }} />
      <Tabs.Screen name="live" options={{ title: "Live", tabBarIcon: tabIcon("broadcast") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account-outline") }} />
      {/* Detail routes live inside the public tabs but must never become tabs. */}
      <Tabs.Screen name="nspg" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="nspg/[sport]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="nspg/medals" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="nspg/athletes" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="live/[matchId]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="discover/[slug]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
