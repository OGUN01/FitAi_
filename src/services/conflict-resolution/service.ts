import {
  DataConflict,
  ConflictContext,
  ConflictResolution,
  ConflictResolutionResult,
  ConflictStatistics,
  ConflictType,
  ResolutionRuleFunction,
  UserChoiceCallback,
} from "./types";
import { detectConflicts } from "./detection";
import { resolveConflict } from "./resolution";
import { createDefaultRules } from "./rules";

export class ConflictResolutionService {
  private resolutionRules: Map<string, ResolutionRuleFunction>;
  private userChoiceCallbacks: Map<ConflictType, UserChoiceCallback>;

  constructor() {
    this.resolutionRules = createDefaultRules();
    this.userChoiceCallbacks = new Map();
  }

  detectConflicts(
    localData: any,
    remoteData: any,
    context: ConflictContext,
  ): DataConflict[] {
    return detectConflicts(localData, remoteData, context);
  }

  async resolveConflicts(
    conflicts: DataConflict[],
  ): Promise<ConflictResolutionResult> {
    const resolvedConflicts: ConflictResolution[] = [];
    const unresolvedConflicts: DataConflict[] = [];
    const mergedData: any = {};
    let requiresUserInput = false;

    for (const conflict of conflicts) {
      try {
        const resolution = await resolveConflict(
          conflict,
          this.resolutionRules,
          this.userChoiceCallbacks,
        );

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
        console.error(
          `Failed to resolve conflict for field ${conflict.field}:`,
          error,
        );
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

  registerResolutionRule(
    fieldPattern: string,
    rule: ResolutionRuleFunction,
  ): void {
    this.resolutionRules.set(fieldPattern, rule);
  }

  registerUserChoiceCallback(
    conflictType: ConflictType,
    callback: UserChoiceCallback,
  ): void {
    this.userChoiceCallbacks.set(conflictType, callback);
  }

  getConflictStatistics(conflicts: DataConflict[]): ConflictStatistics {
    const byType: Record<ConflictType, number> = {} as any;
    const bySeverity: Record<string, number> = {};
    let autoResolvable = 0;
    let requiresUserInput = 0;

    conflicts.forEach((conflict) => {
      byType[conflict.type] = (byType[conflict.type] || 0) + 1;
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] || 0) + 1;

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
}
