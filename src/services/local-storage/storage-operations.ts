import AsyncStorage from "@react-native-async-storage/async-storage";
import { EncryptedData, StorageInfo } from "../../types/localData";
import { STORAGE_KEYS, STORAGE_KEY_PREFIX } from "./constants";
import { CryptoUtils } from "./crypto-utils";

export class StorageOperations {
  private encryptionKey: string | null = null;
  private compressionEnabled = true;
  private encryptionEnabled = true;
  private isInitialized = false;

  setEncryptionKey(key: string | null): void {
    this.encryptionKey = key;
  }

  setCompressionEnabled(enabled: boolean): void {
    this.compressionEnabled = enabled;
  }

  setEncryptionEnabled(enabled: boolean): void {
    this.encryptionEnabled = enabled;
  }

  setInitialized(initialized: boolean): void {
    this.isInitialized = initialized;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "Enhanced Local Storage Service not initialized. Call initialize() first.",
      );
    }
  }

  async storeData<T>(key: string, data: T): Promise<void> {
    this.ensureInitialized();

    try {
      let processedData = JSON.stringify(data);

      if (this.compressionEnabled) {
        processedData = this.compress(processedData);
      }

      if (this.encryptionEnabled && this.encryptionKey) {
        const encryptedData = this.encrypt(processedData);
        processedData = JSON.stringify(encryptedData);
      }

      await AsyncStorage.setItem(key, processedData);
      await this.updateStorageInfo();
    } catch (error) {
      console.error(`Failed to store data for key ${key}:`, error);
      throw error;
    }
  }

  async storeDataDuringInit<T>(key: string, data: T): Promise<void> {
    try {
      let processedData = JSON.stringify(data);

      if (this.compressionEnabled) {
        processedData = this.compress(processedData);
      }

      if (this.encryptionEnabled && this.encryptionKey) {
        const encryptedData = this.encrypt(processedData);
        processedData = JSON.stringify(encryptedData);
      }

      await AsyncStorage.setItem(key, processedData);
    } catch (error) {
      console.error(`Failed to store data during init for key ${key}:`, error);
      throw error;
    }
  }

  async retrieveData<T>(key: string): Promise<T | null> {
    this.ensureInitialized();

    try {
      let storedData = await AsyncStorage.getItem(key);

      if (!storedData || storedData === "undefined") {
        return null;
      }

      if (this.encryptionEnabled && this.encryptionKey) {
        const encryptedData: EncryptedData = JSON.parse(storedData);
        storedData = this.decrypt(encryptedData);
      }

      if (this.compressionEnabled) {
        storedData = this.decompress(storedData);
      }

      return JSON.parse(storedData) as T;
    } catch (error) {
      console.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }

  async retrieveDataDuringInit<T>(key: string): Promise<T | null> {
    try {
      let storedData = await AsyncStorage.getItem(key);

      if (!storedData || storedData === "undefined") {
        return null;
      }

      if (this.encryptionEnabled && this.encryptionKey) {
        const encryptedData: EncryptedData = JSON.parse(storedData);
        storedData = this.decrypt(encryptedData);
      }

      if (this.compressionEnabled) {
        storedData = this.decompress(storedData);
      }

      return JSON.parse(storedData) as T;
    } catch (error) {
      console.error(
        `Failed to retrieve data during init for key ${key}:`,
        error,
      );
      return null;
    }
  }

  async removeData(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      await AsyncStorage.removeItem(key);
      await this.updateStorageInfo();
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
      throw error;
    }
  }

  async removeDataDuringInit(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove data during init for key ${key}:`, error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    this.ensureInitialized();

    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      await this.updateStorageInfo();
    } catch (error) {
      console.error("Failed to clear all data:", error);
      throw error;
    }
  }

  async clearAllDataDuringInit(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error("Failed to clear all data during init:", error);
      throw error;
    }
  }

  async updateStorageInfo(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fitaiKeys = keys.filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX),
      );

      let totalSize = 0;
      for (const key of fitaiKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2;
        }
      }

      const storageInfo: StorageInfo = {
        totalSize,
        usedSize: totalSize,
        availableSize: Math.max(0, 50 * 1024 * 1024 - totalSize),
        quotaExceeded: totalSize > 50 * 1024 * 1024,
        lastCleanup: null,
        compressionRatio: this.compressionEnabled ? 0.7 : 1.0,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.STORAGE_INFO,
        JSON.stringify(storageInfo),
      );
    } catch (error) {
      console.error("Failed to update storage info:", error);
    }
  }

  async getStorageInfo(): Promise<StorageInfo | null> {
    try {
      const info = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_INFO);
      return info ? JSON.parse(info) : null;
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return null;
    }
  }

  private encrypt(data: string): EncryptedData {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }

    const salt = CryptoUtils.lib.WordArray.random(32);
    const iv = CryptoUtils.lib.WordArray.random(16);

    const encrypted = CryptoUtils.AES.encrypt(data, this.encryptionKey, {
      iv,
      mode: CryptoUtils.mode.GCM,
    });

    return {
      payload: encrypted.ciphertext.toString(CryptoUtils.enc.Base64),
      iv: iv.toString(),
      salt: salt.toString(),
      tag: encrypted.tag?.toString(CryptoUtils.enc.Base64) || "",
    };
  }

  private decrypt(encryptedData: EncryptedData): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }

    const decrypted = CryptoUtils.AES.decrypt(
      {
        ciphertext: CryptoUtils.enc.Base64.parse(encryptedData.payload),
        tag: CryptoUtils.enc.Base64.parse(encryptedData.tag || ""),
      },
      this.encryptionKey,
      {
        iv: CryptoUtils.enc.Base64.parse(encryptedData.iv),
        mode: CryptoUtils.mode.GCM,
      },
    );

    return decrypted.toString(CryptoUtils.enc.Utf8);
  }

  private compress(data: string): string {
    return CryptoUtils.enc.Base64.stringify(CryptoUtils.enc.Utf8.parse(data));
  }

  private decompress(compressedData: string): string {
    return CryptoUtils.enc.Base64.parse(compressedData).toString(
      CryptoUtils.enc.Utf8,
    );
  }
}
