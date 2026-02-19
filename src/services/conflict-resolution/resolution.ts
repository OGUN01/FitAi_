import {
  DataConflict,
  ConflictResolution,
  ResolutionStrategy,
  ConflictType,
  UserChoiceCallback,
  ResolutionRuleFunction,
} from "./types";
import { mergeValues, createMergedValue } from "./merge";
import { getResolutionReasoning } from "./rules";

export async function resolveConflict(
  conflict: DataConflict,
  resolutionRules: Map<string, ResolutionRuleFunction>,
  userChoiceCallbacks: Map<ConflictType, UserChoiceCallback>,
): Promise<ConflictResolution | null> {
  let strategy = conflict.suggestedResolution;
  let userChoice = false;

  for (const [pattern, rule] of resolutionRules) {
    if (conflict.field.match(new RegExp(pattern))) {
      strategy = rule(conflict);
      break;
    }
  }

  if (strategy === "user_choice" && userChoiceCallbacks.has(conflict.type)) {
    const callback = userChoiceCallbacks.get(conflict.type)!;
    strategy = await callback(conflict);
    userChoice = true;
  }

  const resolvedValue = applyResolutionStrategy(strategy, conflict);

  if (resolvedValue === undefined && strategy !== "skip_field") {
    return null;
  }

  return {
    conflictId: conflict.id,
    strategy,
    resolvedValue,
    userChoice,
    timestamp: new Date(),
    reasoning: getResolutionReasoning(strategy, conflict),
  };
}

function applyResolutionStrategy(
  strategy: ResolutionStrategy,
  conflict: DataConflict,
): any {
  switch (strategy) {
    case "local_wins":
      return conflict.localValue;

    case "remote_wins":
      return conflict.remoteValue;

    case "merge_values":
      return mergeValues(conflict.localValue, conflict.remoteValue);

    case "use_latest_timestamp":
      if (conflict.context?.lastModified) {
        const { local, remote } = conflict.context.lastModified;
        return local > remote ? conflict.localValue : conflict.remoteValue;
      }
      return conflict.remoteValue;

    case "create_new":
      return createMergedValue(conflict.localValue, conflict.remoteValue);

    case "skip_field":
      return undefined;

    default:
      return conflict.remoteValue;
  }
}
