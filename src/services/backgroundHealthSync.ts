import { Platform } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import { healthConnectService, canUseHealthConnect } from './healthConnect';

const TASK_NAME = 'fitai-healthconnect-background-sync';

export async function registerBackgroundHealthSync(minIntervalSeconds: number = 900): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    // Guard: skip if Health Connect native module is not available
    const healthConnectAvailable = await canUseHealthConnect();
    if (!healthConnectAvailable) {
      console.warn('Background sync unavailable: Health Connect native module not available');
      return false;
    }

    // Guard: skip if native modules are not bundled (Expo Go / old dev client)
    const hasTaskManager = !!(NativeModulesProxy as any)?.ExpoTaskManager;
    const hasBackgroundFetch = !!(NativeModulesProxy as any)?.ExpoBackgroundFetch;
    if (!hasTaskManager || !hasBackgroundFetch) {
      console.warn('Background sync unavailable: ExpoTaskManager/BackgroundFetch native modules missing');
      return false;
    }
    // Requires expo-task-manager and expo-background-fetch to be installed
    const TaskManager = await import('expo-task-manager');
    const BackgroundFetch = await import('expo-background-fetch');

    // Define task if not defined
    const anyTM: any = TaskManager as any;
    const isDefined = anyTM.isTaskDefined ? anyTM.isTaskDefined(TASK_NAME) : false;
    if (!isDefined) {
      (TaskManager as any).defineTask(TASK_NAME, async () => {
        try {
          const hadChanges = await healthConnectService.runBackgroundSyncOnce();
          return hadChanges
            ? (BackgroundFetch as any).BackgroundFetchResult.NewData
            : (BackgroundFetch as any).BackgroundFetchResult.NoData;
        } catch (e) {
          return (BackgroundFetch as any).BackgroundFetchResult.Failed;
        }
      });
    }

    // Register
    const status = await (BackgroundFetch as any).registerTaskAsync(TASK_NAME, {
      minimumInterval: Math.max(900, minIntervalSeconds),
      stopOnTerminate: false,
      startOnBoot: true,
      forceAlarmManager: true,
      enableHeadless: true,
    });
    return !!status;
  } catch (e) {
    console.warn('Background health sync registration failed or modules missing:', e);
    return false;
  }
}

export async function unregisterBackgroundHealthSync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const BackgroundFetch = await import('expo-background-fetch');
    await (BackgroundFetch as any).unregisterTaskAsync(TASK_NAME);
  } catch (e) {
    console.warn('Background health sync unregister failed:', e);
  }
}

export { TASK_NAME as HEALTHCONNECT_BACKGROUND_TASK };
