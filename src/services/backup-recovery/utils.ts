import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalStorageSchema } from "../../types/localData";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function binaryToBase64(binary: string): string {
  let result = "";
  let padding = 0;

  for (let i = 0; i < binary.length; i += 3) {
    const b1 = binary.charCodeAt(i) & 0xff;
    const b2 = i + 1 < binary.length ? binary.charCodeAt(i + 1) & 0xff : 0;
    const b3 = i + 2 < binary.length ? binary.charCodeAt(i + 2) & 0xff : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;

    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < binary.length ? BASE64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < binary.length ? BASE64_CHARS[triplet & 0x3f] : "=";
  }

  return result;
}

export function base64ToBinary(base64: string): string {
  const cleanBase64 = base64.replace(/=+$/, "");
  let result = "";

  for (let i = 0; i < cleanBase64.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(cleanBase64[i]);
    const c2 =
      i + 1 < cleanBase64.length ? BASE64_CHARS.indexOf(cleanBase64[i + 1]) : 0;
    const c3 =
      i + 2 < cleanBase64.length ? BASE64_CHARS.indexOf(cleanBase64[i + 2]) : 0;
    const c4 =
      i + 3 < cleanBase64.length ? BASE64_CHARS.indexOf(cleanBase64[i + 3]) : 0;

    const triplet = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;

    result += String.fromCharCode((triplet >> 16) & 0xff);
    if (i + 2 < cleanBase64.length) {
      result += String.fromCharCode((triplet >> 8) & 0xff);
    }
    if (i + 3 < cleanBase64.length) {
      result += String.fromCharCode(triplet & 0xff);
    }
  }

  return result;
}

export function generateBackupId(): string {
  return `backup_${Date.now()}_${Crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function generateRecoveryId(): string {
  return `recovery_${Date.now()}_${Crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function generateErrorId(): string {
  return `error_${Date.now()}_${Crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
}

export function calculateNextBackupTime(backupIntervalMs: number): Date {
  return new Date(Date.now() + backupIntervalMs);
}

export function getDataTypes(data: LocalStorageSchema): string[] {
  const types: string[] = [];
  if (data.user) types.push("user");
  if (data.fitness) types.push("fitness");
  if (data.nutrition) types.push("nutrition");
  if (data.progress) types.push("progress");
  return types;
}

export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem("@fitai_device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
      await AsyncStorage.setItem("@fitai_device_id", deviceId);
    }
    return deviceId;
  } catch {
    return `device_${Date.now()}`;
  }
}

export async function calculateChecksum(data: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data,
    );
    return hash;
  } catch {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = ((checksum << 5) - checksum + data.charCodeAt(i)) | 0;
    }
    return `simple_${Math.abs(checksum).toString(16)}`;
  }
}

export async function getIncrementalChanges(): Promise<any[]> {
  try {
    const changes = await AsyncStorage.getItem("@fitai_change_log");
    if (changes) {
      const parsed = JSON.parse(changes);
      await AsyncStorage.setItem("@fitai_change_log", "[]");
      return parsed;
    }
  } catch (error) {
    console.error("Failed to get incremental changes:", error);
  }
  return [];
}
