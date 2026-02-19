import * as crypto from "expo-crypto";

export function generateOperationId(): string {
  return `${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
