import { SyncStatus, SyncMetadata } from "./sync";
import { LocalWorkout } from "./workout";
import { LocalFood } from "./nutrition";

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export const isLocalWorkout = (workout: unknown): workout is LocalWorkout => {
  return (
    workout !== null &&
    typeof workout === "object" &&
    "localId" in workout &&
    "syncStatus" in workout
  );
};

export const isLocalFood = (food: unknown): food is LocalFood => {
  return (
    food !== null &&
    typeof food === "object" &&
    "localId" in food &&
    "isCustom" in food
  );
};

export const isSyncable = (
  entity: unknown,
): entity is { syncStatus: SyncStatus; syncMetadata: SyncMetadata } => {
  return (
    entity !== null &&
    typeof entity === "object" &&
    "syncStatus" in entity &&
    "syncMetadata" in entity
  );
};
