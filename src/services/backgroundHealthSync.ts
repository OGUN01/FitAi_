import { Platform } from "react-native";
import { NativeModulesProxy } from "expo-modules-core";
import { healthConnectService, canUseHealthConnect } from "./healthConnect";

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
        try {
          const hadChanges = await healthConnectService.runBackgroundSyncOnce();
          return hadChanges
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (e) {
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }

    // Register
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
