import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Device-side notification setup only.
 *
 * This module deliberately does not write a token to Supabase. The production
 * registration endpoint and notification preferences are still being reviewed.
 */
export type NotificationSetupResult =
  | { ok: true; token: string; platform: string }
  | { ok: false; reason: "unsupported" | "permission_denied" | "configuration" | "unavailable"; message?: string };

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const response = await Notifications.getPermissionsAsync();
  return response.status;
}

export async function enableDeviceNotifications(): Promise<NotificationSetupResult> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "unsupported", message: "Device notifications are available in the mobile app." };
  }

  try {
    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== Notifications.PermissionStatus.GRANTED) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== Notifications.PermissionStatus.GRANTED) {
      return { ok: false, reason: "permission_denied" };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("fleg-score-updates", {
        name: "FLEG Score updates",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return { ok: false, reason: "configuration", message: "The app notification project is not configured yet." };
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return { ok: true, token, platform: Platform.OS };
  } catch (error) {
    return {
      ok: false,
      reason: "unavailable",
      message: error instanceof Error ? error.message : "Notifications are unavailable on this device.",
    };
  }
}
