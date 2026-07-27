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
  data: Record<string, unknown>,
  _context: MigrationContext,
): Promise<void> {
  try {
    // Remote upload not yet implemented (REMOTE_MIGRATION_SUPPORTED = false);
    // simulate latency only.
    void data;
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
  _context: MigrationContext,
): Promise<void> {
  try {
    // Remote delete not yet implemented (REMOTE_MIGRATION_SUPPORTED = false);
    // simulate latency only.
    void id;
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
    // Remote verification not yet implemented (REMOTE_MIGRATION_SUPPORTED = false);
    // simulate latency only. Inspect uploaded data to mirror intended checks.
    if (context.uploadedData.user) {
      void context.userId;
    }

    if (context.uploadedData.fitness) {
      void context.userId;
    }

    if (context.uploadedData.nutrition) {
      void context.userId;
    }

    if (context.uploadedData.progress) {
      void context.userId;
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
  data: unknown,
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
