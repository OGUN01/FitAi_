import { dataBridge } from "../DataBridge";
import { validationService } from "../../utils/validation";
import { BackupData, RecoveryOptions, RecoveryResult } from "./types";
import { loadBackup } from "./storage";
import { generateRecoveryId } from "./utils";

export async function recoverFromBackup(
  options: RecoveryOptions,
  enableCloudBackup: boolean,
  createBackupFn: (
    type: "full" | "incremental",
    description: string,
  ) => Promise<any>,
): Promise<RecoveryResult> {
  const recoveryId = generateRecoveryId();
  const startTime = new Date();

  try {
    const backup = await loadBackup(options.backupId, enableCloudBackup);
    if (!backup) {
      throw new Error(`Backup not found: ${options.backupId}`);
    }

    if (options.validateData) {
      const validation = validationService.validateLocalStorageSchema(
        backup.data,
      );
      if (!validation.isValid) {
        throw new Error(
          `Backup data validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
        );
      }
    }

    if (options.createRecoveryPoint) {
      await createBackupFn(
        "full",
        `Recovery point before restoring ${options.backupId}`,
      );
    }

    const recoveredItems = await performRecovery(backup, options);

    const endTime = new Date();
    const result: RecoveryResult = {
      success: true,
      recoveryId,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      recoveredItems,
      errors: [],
      warnings: [],
      backupInfo: backup.metadata,
    };

    return result;
  } catch (error) {
    const endTime = new Date();
    throw error;
  }
}

async function performRecovery(
  backup: BackupData,
  options: RecoveryOptions,
): Promise<RecoveryResult["recoveredItems"]> {
  const recoveredItems = {
    users: 0,
    workouts: 0,
    meals: 0,
    progress: 0,
    total: 0,
  };

  if (options.recoveryType === "full") {
    await dataBridge.importAllData(backup.data);
    recoveredItems.total = 1;
  } else {
    if (options.selectedDataTypes?.includes("user") && backup.data.user) {
      await dataBridge.importUserData(backup.data.user);
      recoveredItems.users = 1;
    }

    if (options.selectedDataTypes?.includes("fitness") && backup.data.fitness) {
      await dataBridge.importFitnessData(backup.data.fitness);
      recoveredItems.workouts = backup.data.fitness.workouts?.length || 0;
    }

    if (
      options.selectedDataTypes?.includes("nutrition") &&
      backup.data.nutrition
    ) {
      await dataBridge.importNutritionData(backup.data.nutrition);
      recoveredItems.meals = backup.data.nutrition.meals?.length || 0;
    }

    if (
      options.selectedDataTypes?.includes("progress") &&
      backup.data.progress
    ) {
      await dataBridge.importProgressData(backup.data.progress);
      recoveredItems.progress = backup.data.progress.measurements?.length || 0;
    }

    recoveredItems.total =
      recoveredItems.users +
      recoveredItems.workouts +
      recoveredItems.meals +
      recoveredItems.progress;
  }

  return recoveredItems;
}
