import * as Crypto from "expo-crypto";
import { binaryToBase64, base64ToBinary, getDeviceId } from "./utils";

export async function encryptData(data: string): Promise<string> {
  try {
    const deviceId = await getDeviceId();
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceId + "_fitai_backup_key",
    );

    const keyBytes = keyHash.slice(0, 32);
    let encrypted = "";
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const keyCode = keyBytes.charCodeAt(i % keyBytes.length);
      encrypted += String.fromCharCode(charCode ^ keyCode);
    }

    const base64 = binaryToBase64(encrypted);
    return `ENCRYPTED:${base64}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return `UNENCRYPTED:${data}`;
  }
}

export async function decryptData(data: string): Promise<string> {
  if (data.startsWith("UNENCRYPTED:")) {
    return data.slice(12);
  }
  if (!data.startsWith("ENCRYPTED:")) {
    return data;
  }

  try {
    const base64Data = data.slice(10);
    const encrypted = base64ToBinary(base64Data);

    const deviceId = await getDeviceId();
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceId + "_fitai_backup_key",
    );

    const keyBytes = keyHash.slice(0, 32);
    let decrypted = "";
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i);
      const keyCode = keyBytes.charCodeAt(i % keyBytes.length);
      decrypted += String.fromCharCode(charCode ^ keyCode);
    }

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt backup data");
  }
}
