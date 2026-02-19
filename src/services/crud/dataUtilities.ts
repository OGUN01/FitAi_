import { dataBridge } from "../DataBridge";
import { LocalStorageSchema, ValidationResult } from "../../types/localData";
import { DataStatistics } from "./types";

export async function validateAllData(): Promise<ValidationResult> {
  try {
    const schema = await dataBridge.exportAllData();
    if (!schema) {
      return {
        isValid: false,
        errors: [
          {
            field: "schema",
            message: "No data found",
            code: "NO_DATA",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }

    const { validationService } = await import("../../utils/validation");
    return validationService.validateLocalStorageSchema(schema);
  } catch (error) {
    console.error("Failed to validate data:", error);
    return {
      isValid: false,
      errors: [
        {
          field: "validation",
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          severity: "error",
        },
      ],
      warnings: [],
    };
  }
}

export async function getDataStatistics(): Promise<DataStatistics> {
  try {
    return await dataBridge.getDataStatistics();
  } catch (error) {
    console.error("Failed to get data statistics:", error);
    return {
      totalWorkoutSessions: 0,
      totalMealLogs: 0,
      totalMeasurements: 0,
      pendingSyncItems: 0,
      storageUsed: 0,
      lastUpdated: null,
    };
  }
}

export async function exportAllData(): Promise<LocalStorageSchema | null> {
  try {
    return await dataBridge.exportAllData();
  } catch (error) {
    console.error("Failed to export data:", error);
    return null;
  }
}

export async function importData(data: LocalStorageSchema): Promise<void> {
  try {
    await dataBridge.importData(data);
    console.log("Data imported successfully");
  } catch (error) {
    console.error("Failed to import data:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await dataBridge.clearAllData();
    console.log("All data cleared successfully");
  } catch (error) {
    console.error("Failed to clear all data:", error);
    throw error;
  }
}

export async function getStorageInfo(): Promise<any> {
  try {
    return await dataBridge.getStorageInfo();
  } catch (error) {
    console.error("Failed to get storage info:", error);
    return null;
  }
}

export async function isQuotaExceeded(): Promise<boolean> {
  try {
    return await dataBridge.isQuotaExceeded();
  } catch (error) {
    console.error("Failed to check quota:", error);
    return false;
  }
}
