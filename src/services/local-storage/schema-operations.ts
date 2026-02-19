import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalStorageSchema } from "../../types/localData";
import { STORAGE_KEYS, STORAGE_VERSION } from "./constants";
import { CryptoUtils } from "./crypto-utils";

export class SchemaOperations {
  private encryptionKey: string | null = null;
  private compressionEnabled = true;
  private encryptionEnabled = true;

  setEncryptionKey(key: string | null): void {
    this.encryptionKey = key;
  }

  setCompressionEnabled(enabled: boolean): void {
    this.compressionEnabled = enabled;
  }

  setEncryptionEnabled(enabled: boolean): void {
    this.encryptionEnabled = enabled;
  }

  async initializeSchema(): Promise<void> {
    const initialSchema: LocalStorageSchema = {
      version: STORAGE_VERSION,
      encrypted: this.encryptionEnabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        onboardingData: null,
        preferences: {
          units: "metric",
          notifications: true,
          darkMode: true,
          language: "en",
          timezone:
            typeof Intl !== "undefined" &&
            typeof Intl.DateTimeFormat === "function"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : "UTC",
          autoSync: true,
          dataRetention: 365,
        },
        profile: null,
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
      },
      fitness: {
        workouts: [],
        exercises: [],
        sessions: [],
        plans: [],
        customExercises: [],
      },
      nutrition: {
        meals: [],
        foods: [],
        logs: [],
        plans: [],
        customFoods: [],
        waterLogs: [],
      },
      progress: {
        measurements: [],
        photos: [],
        achievements: [],
        analytics: [],
        goals: [],
      },
      metadata: {
        lastSync: null,
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
        conflicts: [],
        backups: [],
        syncQueue: [],
        storageInfo: {
          totalSize: 0,
          usedSize: 0,
          availableSize: 0,
          quotaExceeded: false,
          lastCleanup: null,
          compressionRatio: 1.0,
        },
      },
    };

    await this.storeDataDuringInit(STORAGE_KEYS.SCHEMA, initialSchema);
  }

  async migrateSchema(fromVersion: string, toVersion: string): Promise<void> {
    console.log(`🔄 Migrating schema from ${fromVersion} to ${toVersion}`);

    const schema = await this.retrieveDataDuringInit<LocalStorageSchema>(
      STORAGE_KEYS.SCHEMA,
    );
    if (!schema) {
      console.warn(
        "⚠️ No schema found during migration, initializing fresh schema",
      );
      await this.initializeSchema();
      return;
    }

    const migrations: Record<
      string,
      (schema: LocalStorageSchema) => LocalStorageSchema
    > = {
      "0.1.0->0.1.1": (s) => {
        if (!s.metadata) {
          s.metadata = {};
        }
        if (!s.metadata.syncQueue) {
          s.metadata.syncQueue = [];
        }
        return s;
      },
      "0.1.1->0.1.2": (s) => {
        if (!s.nutrition.waterLogs) {
          s.nutrition.waterLogs = [];
        }
        return s;
      },
      "0.1.2->0.1.3": (s) => {
        if (!s.progress.goals) {
          s.progress.goals = [];
        }
        return s;
      },
      "0.1.3->0.1.4": (s) => {
        if (!s.fitness.customExercises) {
          s.fitness.customExercises = [];
        }
        if (!s.nutrition.customFoods) {
          s.nutrition.customFoods = [];
        }
        return s;
      },
      "0.1.4->0.1.5": (s) => {
        if (!s.metadata) {
          s.metadata = {};
        }
        if (!s.metadata.storageInfo) {
          s.metadata.storageInfo = {
            totalSize: 0,
            usedSize: 0,
            availableSize: 0,
            quotaExceeded: false,
            lastCleanup: null,
            compressionRatio: 1.0,
          };
        }
        return s;
      },
    };

    const allVersions = ["0.1.0", "0.1.1", "0.1.2", "0.1.3", "0.1.4", "0.1.5"];
    const startIndex = allVersions.findIndex((v) => v === fromVersion);
    const endIndex = allVersions.findIndex((v) => v === toVersion);

    let migratedSchema = { ...schema };
    let migrationsApplied = 0;

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      for (let i = startIndex; i < endIndex; i++) {
        const migrationKey = `${allVersions[i]}->${allVersions[i + 1]}`;
        const migrationFn = migrations[migrationKey];

        if (migrationFn) {
          console.log(`  📦 Applying migration: ${migrationKey}`);
          try {
            migratedSchema = migrationFn(migratedSchema);
            migrationsApplied++;
          } catch (error) {
            console.error(`  ❌ Migration ${migrationKey} failed:`, error);
          }
        } else {
          console.log(`  ⏭️ No migration needed for: ${migrationKey}`);
        }
      }
    } else {
      console.log(
        `  ⚠️ Unknown version path ${fromVersion} -> ${toVersion}, updating version only`,
      );
    }

    migratedSchema.version = toVersion;
    migratedSchema.updatedAt = new Date().toISOString();

    await this.storeDataDuringInit(STORAGE_KEYS.SCHEMA, migratedSchema);

    console.log(
      `✅ Schema migration complete: ${migrationsApplied} migrations applied`,
    );
    console.log(`   Version updated: ${fromVersion} -> ${toVersion}`);
  }

  async getStoredSchema(): Promise<LocalStorageSchema | null> {
    return this.retrieveData<LocalStorageSchema>(STORAGE_KEYS.SCHEMA);
  }

  async getStoredSchemaDuringInit(): Promise<LocalStorageSchema | null> {
    return this.retrieveDataDuringInit<LocalStorageSchema>(STORAGE_KEYS.SCHEMA);
  }

  async updateSchema(updates: Partial<LocalStorageSchema>): Promise<void> {
    const currentSchema = await this.getStoredSchema();
    if (!currentSchema) {
      throw new Error("No schema found to update");
    }

    const updatedSchema: LocalStorageSchema = {
      ...currentSchema,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.storeData(STORAGE_KEYS.SCHEMA, updatedSchema);
  }

  async updateSchemaDuringInit(
    updates: Partial<LocalStorageSchema>,
  ): Promise<void> {
    const currentSchema = await this.getStoredSchemaDuringInit();
    if (!currentSchema) {
      throw new Error("No schema found to update");
    }

    const updatedSchema: LocalStorageSchema = {
      ...currentSchema,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.storeDataDuringInit(STORAGE_KEYS.SCHEMA, updatedSchema);
  }

  private async storeData<T>(key: string, data: T): Promise<void> {
    let processedData = JSON.stringify(data);

    if (this.compressionEnabled) {
      processedData = this.compress(processedData);
    }

    if (this.encryptionEnabled && this.encryptionKey) {
      const encryptedData = this.encrypt(processedData);
      processedData = JSON.stringify(encryptedData);
    }

    await AsyncStorage.setItem(key, processedData);
  }

  private async storeDataDuringInit<T>(key: string, data: T): Promise<void> {
    let processedData = JSON.stringify(data);

    if (this.compressionEnabled) {
      processedData = this.compress(processedData);
    }

    if (this.encryptionEnabled && this.encryptionKey) {
      const encryptedData = this.encrypt(processedData);
      processedData = JSON.stringify(encryptedData);
    }

    await AsyncStorage.setItem(key, processedData);
  }

  private async retrieveData<T>(key: string): Promise<T | null> {
    let storedData = await AsyncStorage.getItem(key);

    if (!storedData || storedData === "undefined") {
      return null;
    }

    if (this.encryptionEnabled && this.encryptionKey) {
      const encryptedData = JSON.parse(storedData);
      storedData = this.decrypt(encryptedData);
    }

    if (this.compressionEnabled) {
      storedData = this.decompress(storedData);
    }

    return JSON.parse(storedData) as T;
  }

  private async retrieveDataDuringInit<T>(key: string): Promise<T | null> {
    let storedData = await AsyncStorage.getItem(key);

    if (!storedData || storedData === "undefined") {
      return null;
    }

    if (this.encryptionEnabled && this.encryptionKey) {
      const encryptedData = JSON.parse(storedData);
      storedData = this.decrypt(encryptedData);
    }

    if (this.compressionEnabled) {
      storedData = this.decompress(storedData);
    }

    return JSON.parse(storedData) as T;
  }

  private encrypt(data: string): any {
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

  private decrypt(encryptedData: any): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }

    const decrypted = CryptoUtils.AES.decrypt(
      {
        ciphertext: CryptoUtils.enc.Base64.parse(encryptedData.payload),
        tag: CryptoUtils.enc.Base64.parse(encryptedData.tag || ""),
      } as any,
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
