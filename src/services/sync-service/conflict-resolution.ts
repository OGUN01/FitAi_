import { supabase } from "../supabase";
import type {
  SyncConflict,
  SyncOperation,
  ConflictResolution,
  SyncConfig,
} from "./types";

export async function getPendingConflicts(
  syncQueue: SyncOperation[],
): Promise<SyncConflict[]> {
  try {
    const conflicts: SyncConflict[] = [];

    for (const operation of syncQueue) {
      try {
        const { data } = await supabase
          .from(operation.table)
          .select("*")
          .eq("id", operation.recordId)
          .maybeSingle();

        if (data && new Date(data.updated_at) > operation.timestamp) {
          conflicts.push({
            id: `conflict_${operation.id}`,
            table: operation.table,
            recordId: operation.recordId,
            field: "*",
            localValue: operation.data,
            remoteValue: data,
            resolution: "pending",
            timestamp: new Date(),
          });
        }
      } catch {
        // No conflict if record doesn't exist remotely
      }
    }

    return conflicts;
  } catch (error) {
    console.error("Failed to get pending conflicts:", error);
    return [];
  }
}

export function resolveConflict(
  conflict: SyncConflict,
  strategy: SyncConfig["conflictResolutionStrategy"],
): ConflictResolution {
  let resolvedValue: any;
  let appliedStrategy: string;

  switch (strategy) {
    case "local_wins":
      resolvedValue = conflict.localValue;
      appliedStrategy = "local_wins";
      break;

    case "remote_wins":
      resolvedValue = conflict.remoteValue;
      appliedStrategy = "remote_wins";
      break;

    case "auto":
      const localTimestamp =
        conflict.localValue?.updated_at || conflict.localValue?.created_at;
      const remoteTimestamp =
        conflict.remoteValue?.updated_at || conflict.remoteValue?.created_at;

      if (localTimestamp && remoteTimestamp) {
        const localDate = new Date(localTimestamp);
        const remoteDate = new Date(remoteTimestamp);
        resolvedValue =
          localDate > remoteDate ? conflict.localValue : conflict.remoteValue;
        appliedStrategy =
          localDate > remoteDate
            ? "use_latest_timestamp_local"
            : "use_latest_timestamp_remote";
      } else {
        resolvedValue = conflict.localValue;
        appliedStrategy = "local_wins_default";
      }
      break;

    case "manual":
    default:
      resolvedValue = conflict.localValue;
      appliedStrategy = "pending_user_review";
      break;
  }

  return {
    resolvedValue,
    strategy: appliedStrategy,
  };
}

export async function resolveConflicts(
  syncQueue: SyncOperation[],
  strategy: SyncConfig["conflictResolutionStrategy"],
): Promise<{ conflicts: SyncConflict[] }> {
  const conflicts: SyncConflict[] = [];

  try {
    const pendingConflicts = await getPendingConflicts(syncQueue);

    for (const conflict of pendingConflicts) {
      try {
        const resolution = resolveConflict(conflict, strategy);
        conflicts.push({
          ...conflict,
          resolvedValue: resolution.resolvedValue,
          resolution:
            resolution.strategy === "pending_user_review" ? "manual" : "auto",
        });
      } catch (error) {
        conflicts.push({
          ...conflict,
          resolution: "pending",
        });
      }
    }
  } catch (error) {
    console.error("Conflict resolution phase failed:", error);
  }

  return { conflicts };
}
