import { DataConflict, ConflictContext, ResolutionStrategy } from "./types";

export function determineSeverity(
  field: string,
  localValue: any,
  remoteValue: any,
): "low" | "medium" | "high" | "critical" {
  const criticalFields = ["id", "user_id", "email", "password"];
  if (criticalFields.includes(field.toLowerCase())) {
    return "critical";
  }

  const highFields = ["name", "age", "weight", "height", "goals"];
  if (highFields.some((f) => field.toLowerCase().includes(f))) {
    return "high";
  }

  const mediumFields = ["preferences", "settings", "notes"];
  if (mediumFields.some((f) => field.toLowerCase().includes(f))) {
    return "medium";
  }

  return "low";
}

export function isAutoResolvable(
  field: string,
  localValue: any,
  remoteValue: any,
): boolean {
  const severity = determineSeverity(field, localValue, remoteValue);
  return severity === "low" || hasTimestampInfo(field);
}

export function hasTimestampInfo(field: string): boolean {
  return (
    field.includes("updated_at") ||
    field.includes("created_at") ||
    field.includes("timestamp")
  );
}

export function suggestResolution(
  field: string,
  localValue: any,
  remoteValue: any,
  context: ConflictContext,
): ResolutionStrategy {
  if (context.lastModified && hasTimestampInfo(field)) {
    return "use_latest_timestamp";
  }

  if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
    return "merge_values";
  }

  if (typeof localValue === "object" && typeof remoteValue === "object") {
    return "merge_values";
  }

  if (determineSeverity(field, localValue, remoteValue) === "critical") {
    return "user_choice";
  }

  return "remote_wins";
}

export function getResolutionReasoning(
  strategy: ResolutionStrategy,
  conflict: DataConflict,
): string {
  switch (strategy) {
    case "local_wins":
      return "Local value was more recent or preferred";
    case "remote_wins":
      return "Remote value was used as source of truth";
    case "merge_values":
      return "Values were merged to preserve both data sets";
    case "use_latest_timestamp":
      return "Most recently updated value was selected";
    case "user_choice":
      return "User manually selected the preferred value";
    case "create_new":
      return "New combined value was created";
    case "skip_field":
      return "Field was skipped due to irreconcilable differences";
    default:
      return "Default resolution strategy applied";
  }
}

export function createDefaultRules(): Map<
  string,
  (conflict: DataConflict) => ResolutionStrategy
> {
  const rules = new Map<
    string,
    (conflict: DataConflict) => ResolutionStrategy
  >();

  rules.set(".*(_at|timestamp)$", () => "use_latest_timestamp");

  rules.set(".*(preferences|tags|categories).*", (conflict) => {
    if (
      Array.isArray(conflict.localValue) &&
      Array.isArray(conflict.remoteValue)
    ) {
      return "merge_values";
    }
    return "remote_wins";
  });

  rules.set(".*settings.*", () => "local_wins");

  return rules;
}
