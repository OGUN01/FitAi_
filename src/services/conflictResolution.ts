// Conflict Resolution Service for Track B Infrastructure
// Handles data conflicts during migration with intelligent resolution strategies

import { validationService } from '../utils/validation';
import { LocalStorageSchema } from '../types/localData';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DataConflict {
  id: string;
  type: ConflictType;
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
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
  | 'value_mismatch'
  | 'missing_local'
  | 'missing_remote'
  | 'type_mismatch'
  | 'validation_error'
  | 'duplicate_record'
  | 'schema_version_mismatch';

export type ResolutionStrategy =
  | 'local_wins'
  | 'remote_wins'
  | 'merge_values'
  | 'user_choice'
  | 'create_new'
  | 'skip_field'
  | 'use_latest_timestamp';

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

// ============================================================================
// CONFLICT RESOLUTION SERVICE
// ============================================================================

export class ConflictResolutionService {
  private resolutionRules: Map<string, (conflict: DataConflict) => ResolutionStrategy>;
  private userChoiceCallbacks: Map<string, (conflict: DataConflict) => Promise<ResolutionStrategy>>;

  constructor() {
    this.resolutionRules = new Map();
    this.userChoiceCallbacks = new Map();
    this.initializeDefaultRules();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts(localData: any, remoteData: any, context: ConflictContext): DataConflict[] {
    const conflicts: DataConflict[] = [];

    // Compare each field
    for (const field in localData) {
      if (localData.hasOwnProperty(field)) {
        const localValue = localData[field];
        const remoteValue = remoteData[field];

        const conflict = this.compareValues(field, localValue, remoteValue, context);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Check for missing fields in local data
    for (const field in remoteData) {
      if (remoteData.hasOwnProperty(field) && !localData.hasOwnProperty(field)) {
        conflicts.push({
          id: this.generateConflictId(),
          type: 'missing_local',
          field,
          localValue: undefined,
          remoteValue: remoteData[field],
          timestamp: new Date(),
          severity: this.determineSeverity(field, undefined, remoteData[field]),
          autoResolvable: true,
          suggestedResolution: 'remote_wins',
          context,
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using automatic and user-defined strategies
   */
  async resolveConflicts(conflicts: DataConflict[]): Promise<ConflictResolutionResult> {
    const resolvedConflicts: ConflictResolution[] = [];
    const unresolvedConflicts: DataConflict[] = [];
    const mergedData: any = {};
    let requiresUserInput = false;

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict);

        if (resolution) {
          resolvedConflicts.push(resolution);
          mergedData[conflict.field] = resolution.resolvedValue;

          if (resolution.userChoice) {
            requiresUserInput = true;
          }
        } else {
          unresolvedConflicts.push(conflict);
          requiresUserInput = true;
        }
      } catch (error) {
        console.error(`Failed to resolve conflict for field ${conflict.field}:`, error);
        unresolvedConflicts.push(conflict);
      }
    }

    return {
      resolvedConflicts,
      unresolvedConflicts,
      mergedData,
      requiresUserInput,
      summary: {
        total: conflicts.length,
        autoResolved: resolvedConflicts.filter((r) => !r.userChoice).length,
        userResolved: resolvedConflicts.filter((r) => r.userChoice).length,
        unresolved: unresolvedConflicts.length,
      },
    };
  }

  /**
   * Register a custom resolution rule for specific field patterns
   */
  registerResolutionRule(
    fieldPattern: string,
    rule: (conflict: DataConflict) => ResolutionStrategy
  ): void {
    this.resolutionRules.set(fieldPattern, rule);
  }

  /**
   * Register a user choice callback for interactive resolution
   */
  registerUserChoiceCallback(
    conflictType: ConflictType,
    callback: (conflict: DataConflict) => Promise<ResolutionStrategy>
  ): void {
    this.userChoiceCallbacks.set(conflictType, callback);
  }

  /**
   * Get conflict statistics for reporting
   */
  getConflictStatistics(conflicts: DataConflict[]): {
    byType: Record<ConflictType, number>;
    bySeverity: Record<string, number>;
    autoResolvable: number;
    requiresUserInput: number;
  } {
    const byType: Record<ConflictType, number> = {} as any;
    const bySeverity: Record<string, number> = {};
    let autoResolvable = 0;
    let requiresUserInput = 0;

    conflicts.forEach((conflict) => {
      // Count by type
      byType[conflict.type] = (byType[conflict.type] || 0) + 1;

      // Count by severity
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] || 0) + 1;

      // Count resolution requirements
      if (conflict.autoResolvable) {
        autoResolvable++;
      } else {
        requiresUserInput++;
      }
    });

    return {
      byType,
      bySeverity,
      autoResolvable,
      requiresUserInput,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private compareValues(
    field: string,
    localValue: any,
    remoteValue: any,
    context: ConflictContext
  ): DataConflict | null {
    // Skip if values are identical
    if (this.deepEqual(localValue, remoteValue)) {
      return null;
    }

    // Handle null/undefined cases
    if (localValue == null && remoteValue != null) {
      return {
        id: this.generateConflictId(),
        type: 'missing_local',
        field,
        localValue,
        remoteValue,
        timestamp: new Date(),
        severity: this.determineSeverity(field, localValue, remoteValue),
        autoResolvable: true,
        suggestedResolution: 'remote_wins',
        context,
      };
    }

    if (localValue != null && remoteValue == null) {
      return {
        id: this.generateConflictId(),
        type: 'missing_remote',
        field,
        localValue,
        remoteValue,
        timestamp: new Date(),
        severity: this.determineSeverity(field, localValue, remoteValue),
        autoResolvable: true,
        suggestedResolution: 'local_wins',
        context,
      };
    }

    // Handle type mismatches
    if (typeof localValue !== typeof remoteValue) {
      return {
        id: this.generateConflictId(),
        type: 'type_mismatch',
        field,
        localValue,
        remoteValue,
        timestamp: new Date(),
        severity: 'high',
        autoResolvable: false,
        suggestedResolution: 'user_choice',
        context,
      };
    }

    // Handle value mismatches
    return {
      id: this.generateConflictId(),
      type: 'value_mismatch',
      field,
      localValue,
      remoteValue,
      timestamp: new Date(),
      severity: this.determineSeverity(field, localValue, remoteValue),
      autoResolvable: this.isAutoResolvable(field, localValue, remoteValue),
      suggestedResolution: this.suggestResolution(field, localValue, remoteValue, context),
      context,
    };
  }

  private async resolveConflict(conflict: DataConflict): Promise<ConflictResolution | null> {
    let strategy = conflict.suggestedResolution;
    let userChoice = false;

    // Check for custom resolution rules
    for (const [pattern, rule] of this.resolutionRules) {
      if (conflict.field.match(new RegExp(pattern))) {
        strategy = rule(conflict);
        break;
      }
    }

    // Handle user choice conflicts
    if (strategy === 'user_choice' && this.userChoiceCallbacks.has(conflict.type)) {
      const callback = this.userChoiceCallbacks.get(conflict.type)!;
      strategy = await callback(conflict);
      userChoice = true;
    }

    // Apply resolution strategy
    const resolvedValue = this.applyResolutionStrategy(strategy, conflict);

    if (resolvedValue === undefined && strategy !== 'skip_field') {
      return null; // Could not resolve
    }

    return {
      conflictId: conflict.id,
      strategy,
      resolvedValue,
      userChoice,
      timestamp: new Date(),
      reasoning: this.getResolutionReasoning(strategy, conflict),
    };
  }

  private applyResolutionStrategy(strategy: ResolutionStrategy, conflict: DataConflict): any {
    switch (strategy) {
      case 'local_wins':
        return conflict.localValue;

      case 'remote_wins':
        return conflict.remoteValue;

      case 'merge_values':
        return this.mergeValues(conflict.localValue, conflict.remoteValue);

      case 'use_latest_timestamp':
        if (conflict.context?.lastModified) {
          const { local, remote } = conflict.context.lastModified;
          return local > remote ? conflict.localValue : conflict.remoteValue;
        }
        return conflict.remoteValue; // Default to remote if no timestamp info

      case 'create_new':
        return this.createMergedValue(conflict.localValue, conflict.remoteValue);

      case 'skip_field':
        return undefined;

      default:
        return conflict.remoteValue; // Default fallback
    }
  }

  private mergeValues(localValue: any, remoteValue: any): any {
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      // Merge arrays, removing duplicates
      return [...new Set([...localValue, ...remoteValue])];
    }

    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      // Merge objects
      return { ...remoteValue, ...localValue };
    }

    // For primitive values, prefer the more recent or non-null value
    return localValue != null ? localValue : remoteValue;
  }

  private createMergedValue(localValue: any, remoteValue: any): any {
    // Create a new value that combines both
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      return `${localValue} | ${remoteValue}`;
    }

    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      return (localValue + remoteValue) / 2; // Average
    }

    return { local: localValue, remote: remoteValue };
  }

  private determineSeverity(
    field: string,
    localValue: any,
    remoteValue: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical fields that affect core functionality
    const criticalFields = ['id', 'user_id', 'email', 'password'];
    if (criticalFields.includes(field.toLowerCase())) {
      return 'critical';
    }

    // High importance fields
    const highFields = ['name', 'age', 'weight', 'height', 'goals'];
    if (highFields.some((f) => field.toLowerCase().includes(f))) {
      return 'high';
    }

    // Medium importance fields
    const mediumFields = ['preferences', 'settings', 'notes'];
    if (mediumFields.some((f) => field.toLowerCase().includes(f))) {
      return 'medium';
    }

    return 'low';
  }

  private isAutoResolvable(field: string, localValue: any, remoteValue: any): boolean {
    // Auto-resolvable if it's a low-severity field or has clear resolution logic
    const severity = this.determineSeverity(field, localValue, remoteValue);
    return severity === 'low' || this.hasTimestampInfo(field);
  }

  private hasTimestampInfo(field: string): boolean {
    return (
      field.includes('updated_at') || field.includes('created_at') || field.includes('timestamp')
    );
  }

  private suggestResolution(
    field: string,
    localValue: any,
    remoteValue: any,
    context: ConflictContext
  ): ResolutionStrategy {
    // Use timestamp-based resolution if available
    if (context.lastModified && this.hasTimestampInfo(field)) {
      return 'use_latest_timestamp';
    }

    // For arrays, suggest merging
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return 'merge_values';
    }

    // For objects, suggest merging
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return 'merge_values';
    }

    // For critical fields, require user choice
    if (this.determineSeverity(field, localValue, remoteValue) === 'critical') {
      return 'user_choice';
    }

    // Default to remote wins (server is source of truth)
    return 'remote_wins';
  }

  private getResolutionReasoning(strategy: ResolutionStrategy, conflict: DataConflict): string {
    switch (strategy) {
      case 'local_wins':
        return 'Local value was more recent or preferred';
      case 'remote_wins':
        return 'Remote value was used as source of truth';
      case 'merge_values':
        return 'Values were merged to preserve both data sets';
      case 'use_latest_timestamp':
        return 'Most recently updated value was selected';
      case 'user_choice':
        return 'User manually selected the preferred value';
      case 'create_new':
        return 'New combined value was created';
      case 'skip_field':
        return 'Field was skipped due to irreconcilable differences';
      default:
        return 'Default resolution strategy applied';
    }
  }

  private initializeDefaultRules(): void {
    // Rule for timestamp fields - always use latest
    this.registerResolutionRule('.*(_at|timestamp)$', () => 'use_latest_timestamp');

    // Rule for array fields - merge by default
    this.registerResolutionRule('.*(preferences|tags|categories).*', (conflict) => {
      if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
        return 'merge_values';
      }
      return 'remote_wins';
    });

    // Rule for settings - prefer local (user customizations)
    this.registerResolutionRule('.*settings.*', () => 'local_wins');
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const conflictResolutionService = new ConflictResolutionService();
export default conflictResolutionService;
