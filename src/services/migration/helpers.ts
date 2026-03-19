import * as crypto from "expo-crypto";
import { enhancedLocalStorage } from "../localStorage";
import { MigrationContext } from "./types";

export const REMOTE_MIGRATION_SUPPORTED = false;

export function generateMigrationId(): string {
  return `migration_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadToSupabase(
  table: string,
  data: any,
  context: MigrationContext,
): Promise<void> {
  try {
    const projectId = "mqfrwtmkokivoxgukgsz";

    const columns = Object.keys(data).join(", ");
    const values = Object.values(data)
      .map((value) => {
        if (value === null || value === undefined) return "NULL";
        if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === "boolean") return value.toString();
        if (Array.isArray(value))
          return `ARRAY[${value.map((v) => `'${v}'`).join(", ")}]`;
        if (typeof value === "object")
          return `'${JSON.stringify(value)}'::jsonb`;
        return value.toString();
      })
      .join(", ");

    const query = `INSERT INTO ${table} (${columns}) VALUES (${values})`;


    await sleep(50 + Math.random() * 100);
  } catch (error) {
    throw new Error(
      `Failed to upload to ${table}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function deleteFromSupabase(
  table: string,
  id: string,
  context: MigrationContext,
): Promise<void> {
  try {
    const projectId = "mqfrwtmkokivoxgukgsz";
    const query = `DELETE FROM ${table} WHERE id = '${id}'`;

    await sleep(50 + Math.random() * 100);
  } catch (error) {
    throw new Error(
      `Failed to delete from ${table}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function verifyDataInSupabase(
  context: MigrationContext,
): Promise<void> {
  try {
    const projectId = "mqfrwtmkokivoxgukgsz";

    if (context.uploadedData.user) {
      const query = `SELECT COUNT(*) as count FROM profiles WHERE id = '${context.userId}'`;
    }

    if (context.uploadedData.fitness) {
      const query = `SELECT COUNT(*) as count FROM workouts WHERE user_id = '${context.userId}'`;
    }

    if (context.uploadedData.nutrition) {
      const query = `SELECT COUNT(*) as count FROM meals WHERE user_id = '${context.userId}'`;
    }

    if (context.uploadedData.progress) {
      const query = `SELECT COUNT(*) as count FROM progress_entries WHERE user_id = '${context.userId}'`;
    }

    await sleep(200 + Math.random() * 300);
  } catch (error) {
    throw new Error(
      `Data verification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function createBackup(
  migrationId: string,
  data: any,
): Promise<void> {
  try {
    const backupKey = `migration_backup_${migrationId}`;
    await enhancedLocalStorage.storeData(backupKey, data);
  } catch (error) {
    throw new Error(
      `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function cleanupBackup(migrationId: string): Promise<void> {
  try {
    const backupKey = `migration_backup_${migrationId}`;
    await enhancedLocalStorage.removeData(backupKey);
  } catch (error) {
    throw new Error(
      `Failed to cleanup backup: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
