import { Platform } from "react-native";
import { NativeModulesProxy } from "expo-modules-core";
import { healthConnectService, canUseHealthConnect } from "./healthConnect";
// Task 3 — background sync must update the Zustand store, not just AsyncStorage.
// Importing the store (not the hook) lets the background task call the action
// directly without a React context.
import { useHealthDataStore } from "../stores/healthDataStore";

const TASK_NAME = "fitai-healthconnect-background-sync";

// NativeModulesProxy is typed as a Record but may have extra properties at runtime
const nativeModules = NativeModulesProxy as Record<string, unknown>;

export async function registerBackgroundHealthSync(
  minIntervalSeconds: number = 900,
): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    // Guard: skip if Health Connect native module is not available
    const healthConnectAvailable = await canUseHealthConnect();
    if (!healthConnectAvailable) {
      return false;
    }

    // Guard: skip if native modules are not bundled (Expo Go / old dev client)
    const hasTaskManager = !!nativeModules.ExpoTaskManager;
    const hasBackgroundFetch = !!nativeModules.ExpoBackgroundFetch;
    if (!hasTaskManager || !hasBackgroundFetch) {
      return false;
    }
    // Requires expo-task-manager and expo-background-fetch to be installed
    const TaskManager = await import("expo-task-manager");
    const BackgroundFetch = await import("expo-background-fetch");

    // Define task if not defined
    const isDefined = TaskManager.isTaskDefined
      ? TaskManager.isTaskDefined(TASK_NAME)
      : false;
    if (!isDefined) {
      TaskManager.defineTask(TASK_NAME, async () => {
        // Task 3 — Background sync must update the Zustand store so the
        // foreground UI reflects newly-fetched data on next open. Previously
        // this called healthConnectService.runBackgroundSyncOnce() which writes
        // ONLY to AsyncStorage — leaving background-fetched data invisible
        // until a manual refresh. Now we call the STORE action
        // syncFromHealthConnect(1) which reads from HC, updates the store, AND
        // persists to Supabase (health_metrics) via saveHealthSnapshot. The
        // task is already gated to 15-min intervals by expo-background-fetch
        // (minimumInterval: 900), so double-fire is not a concern here.
        // syncStatus transitions ("syncing"→"success"/"error") are fine for
        // background — they'll be reflected when the user opens the app.
        try {
          const result = await useHealthDataStore
            .getState()
            .syncFromHealthConnect(1);
          if (result?.success) {
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
          return BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (e) {
          console.error(
            "[backgroundHealthSync] background sync task failed:",
            e,
          );
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }

    // Register. registerTaskAsync is idempotent on expo-background-fetch —
    // re-registering with the same task name is a safe no-op, so we don't need
    // to pre-check task status (those APIs aren't uniformly available across
    // SDK versions anyway). App.tsx calls this on every startup.
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: Math.max(900, minIntervalSeconds),
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch (e) {
    console.error(
      "[backgroundHealthSync] registerBackgroundHealthSync failed:",
      e,
    );
    return false;
  }
}

export async function unregisterBackgroundHealthSync(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const BackgroundFetch = await import("expo-background-fetch");
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  } catch (e) {
    console.error(
      "[backgroundHealthSync] unregisterBackgroundHealthSync failed:",
      e,
    );
  }
}

export { TASK_NAME as HEALTHCONNECT_BACKGROUND_TASK };
