import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import type {
  SyncOperation,
  SyncError,
  DeltaSyncInfo,
  RemoteChange,
} from "./types";
import {
  TABLES_TO_SYNC,
  TABLE_TO_STORAGE_KEY,
  MAX_OPERATION_AGE_MS,
} from "./constants";
import { chunkArray, generateErrorId } from "./utilities";
import { loadDeltaSyncInfo, saveDeltaSyncInfo } from "./persistence";

export async function executeUploadOperation(
  operation: SyncOperation,
): Promise<void> {
  const { type, table, recordId, data } = operation;


  switch (type) {
    case "create":
      const { error: createError } = await supabase.from(table).insert(data);
      if (createError) throw new Error(createError.message);
      break;

    case "update":
      const { error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq("id", recordId);
      if (updateError) throw new Error(updateError.message);
      break;

    case "delete":
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", recordId);
      if (deleteError) throw new Error(deleteError.message);
      break;
  }

}

export async function uploadLocalChanges(
  syncQueue: SyncOperation[],
  batchSize: number,
): Promise<{
  uploaded: number;
  errors: SyncError[];
  updatedQueue: SyncOperation[];
}> {
  const errors: SyncError[] = [];
  let uploaded = 0;
  const updatedQueue = [...syncQueue];

  try {
    const batches = chunkArray(updatedQueue, batchSize);

    for (const batch of batches) {
      for (const operation of batch) {
        try {
          await executeUploadOperation(operation);
          uploaded++;

          const index = updatedQueue.indexOf(operation);
          if (index > -1) {
            updatedQueue.splice(index, 1);
          }
        } catch (error) {
          operation.retryCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({
            id: generateErrorId(),
            type: "network",
            message: `Failed to upload ${operation.type} operation: ${errorMessage}`,
            details: { operation, error },
            timestamp: new Date(),
            retryable: operation.retryCount < operation.maxRetries,
            retryCount: operation.retryCount,
          });
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push({
      id: generateErrorId(),
      type: "unknown",
      message: `Upload phase failed: ${errorMessage}`,
      details: error,
      timestamp: new Date(),
      retryable: true,
      retryCount: 0,
    });
  }

  return { uploaded, errors, updatedQueue };
}

export async function fetchRemoteChanges(
  deltaInfo: DeltaSyncInfo,
): Promise<RemoteChange[]> {
  const changes: RemoteChange[] = [];
  const lastSync = deltaInfo.lastSyncTimestamp.toISOString();

  for (const table of TABLES_TO_SYNC) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .gt("updated_at", lastSync)
        .order("updated_at", { ascending: true });

      if (error) {
        continue;
      }

      if (data && data.length > 0) {
        changes.push(
          ...data.map((record) => ({
            table,
            record,
            type: "remote_update" as const,
          })),
        );
      }
    } catch (error) {
    }
  }

  return changes;
}

export async function applyRemoteChange(change: RemoteChange): Promise<void> {
  const { table, record } = change;

  const storageKey = TABLE_TO_STORAGE_KEY[table];
  if (storageKey) {
    try {
      const existingJson = await AsyncStorage.getItem(storageKey);
      const existing = existingJson ? JSON.parse(existingJson) : [];
      const history = Array.isArray(existing) ? existing : [];

      const index = history.findIndex((item: any) => item.id === record.id);
      if (index >= 0) {
        history[index] = { ...history[index], ...record };
      } else {
        history.push(record);
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.error(`Failed to apply change to ${table}:`, error);
      throw error;
    }
  }
}

export async function downloadRemoteChanges(): Promise<{
  downloaded: number;
  errors: SyncError[];
}> {
  const errors: SyncError[] = [];
  let downloaded = 0;

  try {
    const deltaInfo = await loadDeltaSyncInfo();
    const remoteChanges = await fetchRemoteChanges(deltaInfo);

    for (const change of remoteChanges) {
      try {
        await applyRemoteChange(change);
        downloaded++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          id: generateErrorId(),
          type: "validation",
          message: `Failed to apply remote change: ${errorMessage}`,
          details: { change, error },
          timestamp: new Date(),
          retryable: true,
          retryCount: 0,
        });
      }
    }

    await saveDeltaSyncInfo(deltaInfo);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push({
      id: generateErrorId(),
      type: "network",
      message: `Download phase failed: ${errorMessage}`,
      details: error,
      timestamp: new Date(),
      retryable: true,
      retryCount: 0,
    });
  }

  return { downloaded, errors };
}

export function cleanupSyncQueue(queue: SyncOperation[]): SyncOperation[] {
  const now = new Date();

  return queue.filter((op) => {
    const age = now.getTime() - op.timestamp.getTime();
    const expired = age > MAX_OPERATION_AGE_MS;
    const maxRetriesReached = op.retryCount >= op.maxRetries;

    if (expired || maxRetriesReached) {
      return false;
    }
    return true;
  });
}
