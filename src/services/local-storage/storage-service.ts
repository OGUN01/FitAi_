import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalStorageSchema } from "../../types/localData";
import {
  STORAGE_KEYS,
  STORAGE_VERSION,
  ENCRYPTION_CONFIG,
  STORAGE_KEY_PREFIX,
} from "./constants";
import { CryptoUtils } from "./crypto-utils";
import { SchemaOperations } from "./schema-operations";
import { StorageOperations } from "./storage-operations";

export class EnhancedLocalStorageService {
  private static instance: EnhancedLocalStorageService;
  private static initializationPromise: Promise<void> | null = null;
  private encryptionKey: string | null = null;
  private schemaOps: SchemaOperations;
  private storageOps: StorageOperations;

  private constructor() {
    this.schemaOps = new SchemaOperations();
    this.storageOps = new StorageOperations();
  }

  static getInstance(): EnhancedLocalStorageService {
    if (!EnhancedLocalStorageService.instance) {
      EnhancedLocalStorageService.instance = new EnhancedLocalStorageService();
      EnhancedLocalStorageService.initializationPromise =
        EnhancedLocalStorageService.instance.initialize().catch((error) => {
          console.error(
            "[EnhancedLocalStorage] Auto-initialization failed:",
            error,
          );
        });
    }
    return EnhancedLocalStorageService.instance;
  }

  async ensureInitializedAsync(): Promise<void> {
    if (this.storageOps.getIsInitialized()) {
      return;
    }

    if (EnhancedLocalStorageService.initializationPromise) {
      await EnhancedLocalStorageService.initializationPromise;
      return;
    }

    EnhancedLocalStorageService.initializationPromise = this.initialize();
    await EnhancedLocalStorageService.initializationPromise;
  }

  async initialize(userPassword?: string): Promise<void> {
    try {
      await this.initializeEncryption(userPassword);
      await this.checkAndMigrateVersion();
      this.storageOps.setInitialized(true);
      await this.storageOps.updateStorageInfo();
      console.log("Enhanced Local Storage Service initialized successfully");
    } catch (error) {
      console.error(
        "Failed to initialize Enhanced Local Storage Service:",
        error,
      );
      this.storageOps.setInitialized(false);
      throw error;
    }
  }

  private async initializeEncryption(userPassword?: string): Promise<void> {
    try {
      let encryptionKey = await AsyncStorage.getItem(
        STORAGE_KEYS.ENCRYPTION_KEY,
      );

      if (!encryptionKey) {
        const password = userPassword || this.generateRandomPassword();
        const salt = CryptoUtils.lib.WordArray.random(
          ENCRYPTION_CONFIG.saltLength,
        );

        encryptionKey = CryptoUtils.PBKDF2(password, salt, {
          keySize: 256 / 32,
          iterations: ENCRYPTION_CONFIG.iterations,
        }).toString();

        await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, encryptionKey);
      }

      this.encryptionKey = encryptionKey;
      this.schemaOps.setEncryptionKey(encryptionKey);
      this.storageOps.setEncryptionKey(encryptionKey);
    } catch (error) {
      console.error("Failed to initialize encryption:", error);
      throw error;
    }
  }

  private generateRandomPassword(): string {
    return CryptoUtils.lib.WordArray.random(32).toString();
  }

  private async checkAndMigrateVersion(): Promise<void> {
    try {
      const storedSchema = await this.schemaOps.getStoredSchemaDuringInit();

      if (!storedSchema) {
        await this.schemaOps.initializeSchema();
      } else if (storedSchema.version !== STORAGE_VERSION) {
        await this.schemaOps.migrateSchema(
          storedSchema.version,
          STORAGE_VERSION,
        );
      }
    } catch (error) {
      console.error("Failed to check/migrate version:", error);
      throw error;
    }
  }

  async storeData<T>(key: string, data: T): Promise<void> {
    return this.storageOps.storeData(key, data);
  }

  async retrieveData<T>(key: string): Promise<T | null> {
    return this.storageOps.retrieveData<T>(key);
  }

  async removeData(key: string): Promise<void> {
    return this.storageOps.removeData(key);
  }

  async clearAllData(): Promise<void> {
    return this.storageOps.clearAllData();
  }

  async getStoredSchema(): Promise<LocalStorageSchema | null> {
    return this.schemaOps.getStoredSchema();
  }

  async updateSchema(updates: Partial<LocalStorageSchema>): Promise<void> {
    return this.schemaOps.updateSchema(updates);
  }

  async getStorageInfo() {
    return this.storageOps.getStorageInfo();
  }

  async isQuotaExceeded(): Promise<boolean> {
    const storageInfo = await this.storageOps.getStorageInfo();
    return storageInfo?.quotaExceeded || false;
  }

  async getUsedSpace(): Promise<number> {
    const storageInfo = await this.storageOps.getStorageInfo();
    return storageInfo?.usedSize || 0;
  }

  async getAvailableSpace(): Promise<number> {
    const storageInfo = await this.storageOps.getStorageInfo();
    return storageInfo?.availableSize || 0;
  }

  async getData<T>(key: string): Promise<T | null> {
    return this.retrieveData<T>(key);
  }

  async setItem(key: string, value: any): Promise<void> {
    this.storageOps.ensureInitialized();
    await AsyncStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }

  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fitaiKeys = keys.filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX),
      );
      if (fitaiKeys.length) {
        await AsyncStorage.multiRemove(fitaiKeys);
      }
      const newSchema: LocalStorageSchema = {
        version: STORAGE_VERSION,
        encrypted: this.isEncryptionEnabled(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          authState: {
            isAuthenticated: false,
            userId: null,
            email: null,
            lastLoginAt: null,
            sessionToken: null,
            migrationStatus: {
              isRequired: false,
              isInProgress: false,
              isCompleted: false,
              currentStep: null,
              totalSteps: 0,
              completedSteps: 0,
              startedAt: null,
              completedAt: null,
              errors: [],
            },
          },
          onboardingData: null,
          profile: null,
          preferences: null,
        },
        fitness: { sessions: [] },
        nutrition: { logs: [] },
        progress: { measurements: [] },
        metadata: {},
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEMA,
        JSON.stringify(newSchema),
      );
      await this.storageOps.updateStorageInfo();
    } catch (error) {
      console.error("Failed to clear local storage:", error);
      throw error;
    }
  }

  setCompressionEnabled(enabled: boolean): void {
    this.schemaOps.setCompressionEnabled(enabled);
    this.storageOps.setCompressionEnabled(enabled);
  }

  setEncryptionEnabled(enabled: boolean): void {
    this.schemaOps.setEncryptionEnabled(enabled);
    this.storageOps.setEncryptionEnabled(enabled);
  }

  isEncryptionEnabled(): boolean {
    return !!this.encryptionKey;
  }

  isCompressionEnabled(): boolean {
    return true;
  }
}

export const enhancedLocalStorage = EnhancedLocalStorageService.getInstance();
export default enhancedLocalStorage;
