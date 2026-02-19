import * as crypto from "expo-crypto";

export function generateSyncId(): string {
  return `sync_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function generateOperationId(): string {
  return `op_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function generateErrorId(): string {
  return `err_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function calculateNextSyncTime(intervalMs: number): Date {
  return new Date(Date.now() + intervalMs);
}
