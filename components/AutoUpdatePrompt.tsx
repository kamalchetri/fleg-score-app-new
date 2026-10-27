/**
 * Production OTA prompt for FLEG Score.
 *
 * EAS Update downloads compatible JavaScript/assets. The user is asked before
 * restarting so active match scoring or unsaved forms are never interrupted.
 * Expo Go and development builds do not support this flow.
 */
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

const FOREGROUND_CHECK_INTERVAL_MS = 60_000;

export function AutoUpdatePrompt() {
  const { isUpdatePending } = Updates.useUpdates();
  const checking = useRef(false);
  const promptOpen = useRef(false);
  const promptedThisLaunch = useRef(false);
  const lastCheck = useRef(0);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);

  const offerRestart = useCallback(() => {
    if (__DEV__ || !Updates.isEnabled || promptOpen.current || promptedThisLaunch.current) return;
    promptOpen.current = true;
    promptedThisLaunch.current = true;
    Alert.alert(
      "FLEG Score update ready",
      "The latest app improvements are downloaded. Restart FLEG Score to apply them now?",
      [
        {
          text: "Later",
          style: "cancel",
          onPress: () => { promptOpen.current = false; },
        },
        {
          text: "Update now",
          onPress: () => {
            promptOpen.current = false;
            void Updates.reloadAsync().catch(() => {
              Alert.alert("Update not applied", "Close and reopen FLEG Score to apply the downloaded update.");
            });
          },
        },
      ],
      { cancelable: false },
    );
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current || promptedThisLaunch.current) return;
    const now = Date.now();
    if (now - lastCheck.current < FOREGROUND_CHECK_INTERVAL_MS) return;
    lastCheck.current = now;
    checking.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        const download = await Updates.fetchUpdateAsync();
        if (download.isNew) offerRestart();
      }
    } catch (error) {
      // Offline, Expo Go, update-server errors, and incompatible runtimes must
      // never block launching or using the app. Try again on a later foreground.
      if (__DEV__) console.warn("FLEG OTA check failed", error);
    } finally {
      checking.current = false;
    }
  }, [offerRestart]);

  useEffect(() => {
    if (isUpdatePending) offerRestart();
  }, [isUpdatePending, offerRestart]);

  useEffect(() => {
    // Native ON_LOAD also fetches updates; this handles the still-open app.
    const startup = setTimeout(() => { void checkForUpdates(); }, 5_000);
    const listener = AppState.addEventListener("change", (state) => {
      const wasAway = currentAppState.current === "inactive" || currentAppState.current === "background";
      currentAppState.current = state;
      if (state === "active" && wasAway) void checkForUpdates();
    });
    return () => { clearTimeout(startup); listener.remove(); };
  }, [checkForUpdates]);

  return null;
}
