// Conflict Resolution Service Types
// Type definitions for conflict detection and resolution

export interface DataConflict {
  id: string;
  type: ConflictType;
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  autoResolvable: boolean;
  suggestedResolution: ResolutionStrategy;
  context?: ConflictContext;
}

export interface ConflictContext {
  tableName: string;
  recordId: string;
  userId: string;
  lastModified: {
    local: Date;
    remote: Date;
  };
  relatedFields?: string[];
}

export type ConflictType =
  | "value_mismatch"
  | "missing_local"
  | "missing_remote"
  | "type_mismatch"
  | "validation_error"
  | "duplicate_record"
  | "schema_version_mismatch";

export type ResolutionStrategy =
  | "local_wins"
  | "remote_wins"
  | "merge_values"
  | "user_choice"
  | "create_new"
  | "skip_field"
  | "use_latest_timestamp";

export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedValue: any;
  userChoice?: boolean;
  timestamp: Date;
  reasoning: string;
}

export interface ConflictResolutionResult {
  resolvedConflicts: ConflictResolution[];
  unresolvedConflicts: DataConflict[];
  mergedData: any;
  requiresUserInput: boolean;
  summary: {
    total: number;
    autoResolved: number;
    userResolved: number;
    unresolved: number;
  };
}

export interface ConflictStatistics {
  byType: Record<ConflictType, number>;
  bySeverity: Record<string, number>;
  autoResolvable: number;
  requiresUserInput: number;
}

export type ResolutionRuleFunction = (
  conflict: DataConflict,
) => ResolutionStrategy;
export type UserChoiceCallback = (
  conflict: DataConflict,
) => Promise<ResolutionStrategy>;
