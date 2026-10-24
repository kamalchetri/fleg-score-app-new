import { Tabs } from "expo-router";
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
