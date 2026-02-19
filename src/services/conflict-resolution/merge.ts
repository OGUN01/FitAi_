export function mergeValues(localValue: any, remoteValue: any): any {
  if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
    return [...new Set([...localValue, ...remoteValue])];
  }

  if (typeof localValue === "object" && typeof remoteValue === "object") {
    return { ...remoteValue, ...localValue };
  }

  return localValue != null ? localValue : remoteValue;
}

export function createMergedValue(localValue: any, remoteValue: any): any {
  if (typeof localValue === "string" && typeof remoteValue === "string") {
    return `${localValue} | ${remoteValue}`;
  }

  if (typeof localValue === "number" && typeof remoteValue === "number") {
    return (localValue + remoteValue) / 2;
  }

  return { local: localValue, remote: remoteValue };
}
