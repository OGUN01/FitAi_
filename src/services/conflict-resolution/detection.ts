import { DataConflict, ConflictContext } from "./types";
import { deepEqual, generateConflictId } from "./utils";
import {
  determineSeverity,
  isAutoResolvable,
  suggestResolution,
} from "./rules";

export function detectConflicts(
  localData: any,
  remoteData: any,
  context: ConflictContext,
): DataConflict[] {
  const conflicts: DataConflict[] = [];

  for (const field in localData) {
    if (localData.hasOwnProperty(field)) {
      const localValue = localData[field];
      const remoteValue = remoteData[field];

      const conflict = compareValues(field, localValue, remoteValue, context);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }

  for (const field in remoteData) {
    if (remoteData.hasOwnProperty(field) && !localData.hasOwnProperty(field)) {
      conflicts.push({
        id: generateConflictId(),
        type: "missing_local",
        field,
        localValue: undefined,
        remoteValue: remoteData[field],
        timestamp: new Date(),
        severity: determineSeverity(field, undefined, remoteData[field]),
        autoResolvable: true,
        suggestedResolution: "remote_wins",
        context,
      });
    }
  }

  return conflicts;
}

function compareValues(
  field: string,
  localValue: any,
  remoteValue: any,
  context: ConflictContext,
): DataConflict | null {
  if (deepEqual(localValue, remoteValue)) {
    return null;
  }

  if (localValue == null && remoteValue != null) {
    return {
      id: generateConflictId(),
      type: "missing_local",
      field,
      localValue,
      remoteValue,
      timestamp: new Date(),
      severity: determineSeverity(field, localValue, remoteValue),
      autoResolvable: true,
      suggestedResolution: "remote_wins",
      context,
    };
  }

  if (localValue != null && remoteValue == null) {
    return {
      id: generateConflictId(),
      type: "missing_remote",
      field,
      localValue,
      remoteValue,
      timestamp: new Date(),
      severity: determineSeverity(field, localValue, remoteValue),
      autoResolvable: true,
      suggestedResolution: "local_wins",
      context,
    };
  }

  if (typeof localValue !== typeof remoteValue) {
    return {
      id: generateConflictId(),
      type: "type_mismatch",
      field,
      localValue,
      remoteValue,
      timestamp: new Date(),
      severity: "high",
      autoResolvable: false,
      suggestedResolution: "user_choice",
      context,
    };
  }

  return {
    id: generateConflictId(),
    type: "value_mismatch",
    field,
    localValue,
    remoteValue,
    timestamp: new Date(),
    severity: determineSeverity(field, localValue, remoteValue),
    autoResolvable: isAutoResolvable(field, localValue, remoteValue),
    suggestedResolution: suggestResolution(
      field,
      localValue,
      remoteValue,
      context,
    ),
    context,
  };
}
