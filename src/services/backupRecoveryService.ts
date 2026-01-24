// Backup and Recovery Service for Track B Infrastructure
// Provides automatic local data backup, cloud backup to Supabase storage, and data recovery mechanisms

import { enhancedLocalStorage } from "./localStorage";
import { dataBridge } from "./DataBridge";
import { validationService } from "../utils/validation";
import { LocalStorageSchema } from "../types/localData";
import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

// ============================================================================
// BASE64 ENCODING/DECODING (React Native compatible)
// ============================================================================

/**
 * Base64 encoding table
 */
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode binary string to base64 (React Native compatible)
 */
function binaryToBase64(binary: string): string {
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

/**
 * Decode base64 to binary string (React Native compatible)
 */
function base64ToBinary(base64: string): string {
  // Remove padding
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

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface BackupConfig {
  enableAutoBackup: boolean;
  backupIntervalMs: number;
  maxLocalBackups: number;
  maxCloudBackups: number;
  enableCloudBackup: boolean;
  enableIncrementalBackup: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  backupRetentionDays: number;
}

export interface BackupMetadata {
  id: string;
  type: "full" | "incremental";
  location: "local" | "cloud" | "both";
  createdAt: Date;
  size: number; // bytes
  checksum: string;
  version: string;
  deviceId: string;
  userId: string;
  description: string;
  dataTypes: string[];
  isEncrypted: boolean;
  isCompressed: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: LocalStorageSchema;
  incrementalChanges?: IncrementalChange[];
}

export interface IncrementalChange {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  recordId: string;
  timestamp: Date;
  data?: any;
  previousData?: any;
}

export interface RecoveryOptions {
  backupId: string;
  recoveryType: "full" | "selective";
  selectedDataTypes?: string[];
  mergeStrategy: "replace" | "merge" | "skip_existing";
  validateData: boolean;
  createRecoveryPoint: boolean;
}

export interface RecoveryResult {
  success: boolean;
  recoveryId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  recoveredItems: {
    users: number;
    workouts: number;
    meals: number;
    progress: number;
    total: number;
  };
  errors: RecoveryError[];
  warnings: string[];
  backupInfo: BackupMetadata;
}

export interface RecoveryError {
  id: string;
  type: "validation" | "conflict" | "corruption" | "permission" | "unknown";
  message: string;
  details: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface BackupStatus {
  isBackingUp: boolean;
  lastBackupTime: Date | null;
  lastBackupResult: BackupResult | null;
  nextBackupTime: Date | null;
  availableBackups: BackupMetadata[];
  totalBackupSize: number;
  backupHealth: "excellent" | "good" | "warning" | "critical";
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  type: "full" | "incremental";
  location: "local" | "cloud" | "both";
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  errors: BackupError[];
  warnings: string[];
}

export interface BackupError {
  id: string;
  type:
    | "storage"
    | "network"
    | "encryption"
    | "compression"
    | "validation"
    | "unknown";
  message: string;
  details: any;
  timestamp: Date;
  retryable: boolean;
}

// ============================================================================
// BACKUP AND RECOVERY SERVICE
// ============================================================================

export class BackupRecoveryService {
  private config: BackupConfig;
  private status: BackupStatus;
  private backupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private statusCallbacks: ((status: BackupStatus) => void)[] = [];
  private resultCallbacks: ((result: BackupResult) => void)[] = [];

  constructor(config?: Partial<BackupConfig>) {
    this.config = {
      enableAutoBackup: true,
      backupIntervalMs: 3600000, // 1 hour
      maxLocalBackups: 10,
      maxCloudBackups: 30,
      enableCloudBackup: true,
      enableIncrementalBackup: true,
      compressionEnabled: true,
      encryptionEnabled: true,
      backupRetentionDays: 30,
      ...config,
    };

    this.status = {
      isBackingUp: false,
      lastBackupTime: null,
      lastBackupResult: null,
      nextBackupTime: null,
      availableBackups: [],
      totalBackupSize: 0,
      backupHealth: "good",
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Initialize backup service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadBackupStatus();
      await this.updateAvailableBackups();

      if (this.config.enableAutoBackup) {
        this.startAutoBackup();
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      this.isInitialized = true;
      console.log("Backup and recovery service initialized");
    } catch (error) {
      console.error("Failed to initialize backup service:", error);
      throw error;
    }
  }

  /**
   * Create a manual backup
   */
  async createBackup(
    type: "full" | "incremental" = "full",
    description = "",
  ): Promise<BackupResult> {
    if (this.status.isBackingUp) {
      throw new Error("Backup is already in progress");
    }

    const backupId = this.generateBackupId();
    const startTime = new Date();

    try {
      this.updateStatus({ isBackingUp: true });

      // Get data to backup
      const data = await dataBridge.exportAllData();
      if (!data) {
        throw new Error("No data available for backup");
      }

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        type,
        location: this.config.enableCloudBackup ? "both" : "local",
        createdAt: startTime,
        size: 0, // Will be calculated
        checksum: "",
        version: data.version,
        deviceId: await this.getDeviceId(),
        userId: data.user?.profile?.id || "unknown",
        description:
          description || `${type} backup created on ${startTime.toISOString()}`,
        dataTypes: this.getDataTypes(data),
        isEncrypted: this.config.encryptionEnabled,
        isCompressed: this.config.compressionEnabled,
      };

      // Create backup data
      const backupData: BackupData = {
        metadata,
        data,
        incrementalChanges:
          type === "incremental"
            ? await this.getIncrementalChanges()
            : undefined,
      };

      // Process and store backup
      const processedBackup = await this.processBackupData(backupData);
      await this.storeBackup(processedBackup);

      const endTime = new Date();
      const result: BackupResult = {
        success: true,
        backupId,
        type,
        location: metadata.location,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: processedBackup.metadata.size,
        errors: [],
        warnings: [],
      };

      this.updateStatus({
        isBackingUp: false,
        lastBackupTime: endTime,
        lastBackupResult: result,
        nextBackupTime: this.calculateNextBackupTime(),
      });

      await this.updateAvailableBackups();
      this.notifyResultCallbacks(result);

      return result;
    } catch (error) {
      const endTime = new Date();
      const result: BackupResult = {
        success: false,
        backupId,
        type,
        location: "local",
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: 0,
        errors: [
          {
            id: this.generateErrorId(),
            type: "unknown",
            message: error instanceof Error ? error.message : String(error),
            details: error,
            timestamp: new Date(),
            retryable: true,
          },
        ],
        warnings: [],
      };

      this.updateStatus({
        isBackingUp: false,
        lastBackupResult: result,
        nextBackupTime: this.calculateNextBackupTime(),
      });

      this.notifyResultCallbacks(result);
      throw error;
    }
  }

  /**
   * Recover data from backup
   */
  async recoverFromBackup(options: RecoveryOptions): Promise<RecoveryResult> {
    const recoveryId = this.generateRecoveryId();
    const startTime = new Date();

    try {
      // Load backup data
      const backup = await this.loadBackup(options.backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      // Validate backup data
      if (options.validateData) {
        const validation = validationService.validateLocalStorageSchema(
          backup.data,
        );
        if (!validation.isValid) {
          throw new Error(
            `Backup data validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
          );
        }
      }

      // Create recovery point if requested
      if (options.createRecoveryPoint) {
        await this.createBackup(
          "full",
          `Recovery point before restoring ${options.backupId}`,
        );
      }

      // Perform recovery
      const recoveredItems = await this.performRecovery(backup, options);

      const endTime = new Date();
      const result: RecoveryResult = {
        success: true,
        recoveryId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        recoveredItems,
        errors: [],
        warnings: [],
        backupInfo: backup.metadata,
      };

      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const result: BackupResult = {
        success: false,
        backupId: this.generateBackupId(),
        type: "full",
        location: "local",
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: 0,
        errors: [
          {
            id: this.generateErrorId(),
            type: "unknown",
            message: errorMessage,
            details: error,
            timestamp: new Date(),
            retryable: true,
          },
        ],
        warnings: [],
      };

      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(location?: "local" | "cloud"): Promise<BackupMetadata[]> {
    await this.updateAvailableBackups();

    if (location) {
      return this.status.availableBackups.filter(
        (backup) => backup.location === location || backup.location === "both",
      );
    }

    return this.status.availableBackups;
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Remove from local storage
      await enhancedLocalStorage.removeData(`backup_${backupId}`);

      // Remove from cloud storage (if applicable)
      if (this.config.enableCloudBackup) {
        await this.deleteCloudBackup(backupId);
      }

      // Update available backups
      await this.updateAvailableBackups();

      console.log(`Backup deleted: ${backupId}`);
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Get backup status
   */
  getStatus(): BackupStatus {
    return { ...this.status };
  }

  /**
   * Update backup configuration
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.enableAutoBackup !== undefined) {
      if (newConfig.enableAutoBackup) {
        this.startAutoBackup();
      } else {
        this.stopAutoBackup();
      }
    }
  }

  /**
   * Stop backup service
   */
  async stop(): Promise<void> {
    this.stopAutoBackup();
    await this.saveBackupStatus();
    this.isInitialized = false;
    console.log("Backup and recovery service stopped");
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to backup status updates
   */
  onStatusChange(callback: (status: BackupStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to backup result updates
   */
  onBackupResult(callback: (result: BackupResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startAutoBackup(): void {
    this.stopAutoBackup();

    this.backupTimer = setInterval(async () => {
      try {
        const type = this.config.enableIncrementalBackup
          ? "incremental"
          : "full";
        await this.createBackup(type, "Automatic backup");
      } catch (error) {
        console.error("Auto backup failed:", error);
      }
    }, this.config.backupIntervalMs);

    this.updateStatus({
      nextBackupTime: this.calculateNextBackupTime(),
    });
  }

  private stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  private async processBackupData(backupData: BackupData): Promise<BackupData> {
    let processedData = JSON.stringify(backupData.data);

    // Compress if enabled
    if (this.config.compressionEnabled) {
      processedData = await this.compressData(processedData);
    }

    // Encrypt if enabled
    if (this.config.encryptionEnabled) {
      processedData = await this.encryptData(processedData);
    }

    // Calculate size and checksum
    // Estimate byte size for React Native compatibility (UTF-16)\n    backupData.metadata.size = processedData.length * 2;
    backupData.metadata.checksum = await this.calculateChecksum(processedData);

    return backupData;
  }

  private async storeBackup(backupData: BackupData): Promise<void> {
    const backupKey = `backup_${backupData.metadata.id}`;

    // Store locally
    await enhancedLocalStorage.storeData(backupKey, backupData);

    // Store in cloud if enabled
    if (this.config.enableCloudBackup) {
      await this.storeCloudBackup(backupData);
    }
  }

  private async loadBackup(backupId: string): Promise<BackupData | null> {
    try {
      const backupKey = `backup_${backupId}`;
      const backup = await enhancedLocalStorage.getData<BackupData>(backupKey);

      if (backup) {
        // Decrypt and decompress if needed
        return await this.processLoadedBackup(backup);
      }

      // Try loading from cloud
      if (this.config.enableCloudBackup) {
        return await this.loadCloudBackup(backupId);
      }

      return null;
    } catch (error) {
      console.error(`Failed to load backup ${backupId}:`, error);
      return null;
    }
  }

  private async performRecovery(
    backup: BackupData,
    options: RecoveryOptions,
  ): Promise<RecoveryResult["recoveredItems"]> {
    const recoveredItems = {
      users: 0,
      workouts: 0,
      meals: 0,
      progress: 0,
      total: 0,
    };

    if (options.recoveryType === "full") {
      // Full recovery - replace all data
      await dataBridge.importAllData(backup.data);
      recoveredItems.total = 1;
    } else {
      // Selective recovery
      if (options.selectedDataTypes?.includes("user") && backup.data.user) {
        await dataBridge.importUserData(backup.data.user);
        recoveredItems.users = 1;
      }

      if (
        options.selectedDataTypes?.includes("fitness") &&
        backup.data.fitness
      ) {
        await dataBridge.importFitnessData(backup.data.fitness);
        recoveredItems.workouts = backup.data.fitness.workouts?.length || 0;
      }

      if (
        options.selectedDataTypes?.includes("nutrition") &&
        backup.data.nutrition
      ) {
        await dataBridge.importNutritionData(backup.data.nutrition);
        recoveredItems.meals = backup.data.nutrition.meals?.length || 0;
      }

      if (
        options.selectedDataTypes?.includes("progress") &&
        backup.data.progress
      ) {
        await dataBridge.importProgressData(backup.data.progress);
        recoveredItems.progress =
          backup.data.progress.measurements?.length || 0;
      }

      recoveredItems.total =
        recoveredItems.users +
        recoveredItems.workouts +
        recoveredItems.meals +
        recoveredItems.progress;
    }

    return recoveredItems;
  }

  private async updateAvailableBackups(): Promise<void> {
    try {
      const localBackups = await this.getLocalBackups();
      const cloudBackups = this.config.enableCloudBackup
        ? await this.getCloudBackups()
        : [];

      // Merge and deduplicate backups
      const allBackups = [...localBackups, ...cloudBackups];
      const uniqueBackups = allBackups.reduce((acc, backup) => {
        const existing = acc.find((b) => b.id === backup.id);
        if (!existing) {
          acc.push(backup);
        } else if (
          backup.location === "both" ||
          (existing.location !== "both" &&
            backup.location !== existing.location)
        ) {
          existing.location = "both";
        }
        return acc;
      }, [] as BackupMetadata[]);

      // Sort by creation date (newest first)
      uniqueBackups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      const totalSize = uniqueBackups.reduce(
        (sum, backup) => sum + backup.size,
        0,
      );
      const health = this.assessBackupHealth(uniqueBackups);

      this.updateStatus({
        availableBackups: uniqueBackups,
        totalBackupSize: totalSize,
        backupHealth: health,
      });
    } catch (error) {
      console.error("Failed to update available backups:", error);
    }
  }

  private assessBackupHealth(
    backups: BackupMetadata[],
  ): BackupStatus["backupHealth"] {
    if (backups.length === 0) return "critical";

    const now = new Date();
    const latestBackup = backups[0];
    const daysSinceLastBackup =
      (now.getTime() - latestBackup.createdAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceLastBackup > 7) return "critical";
    if (daysSinceLastBackup > 3) return "warning";
    if (daysSinceLastBackup > 1) return "good";
    return "excellent";
  }

  private updateStatus(updates: Partial<BackupStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusCallbacks(this.status);
  }

  private notifyStatusCallbacks(status: BackupStatus): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in status callback:", error);
      }
    });
  }

  private notifyResultCallbacks(result: BackupResult): void {
    this.resultCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Error in result callback:", error);
      }
    });
  }

  // Utility methods
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecoveryId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextBackupTime(): Date {
    return new Date(Date.now() + this.config.backupIntervalMs);
  }

  private getDataTypes(data: LocalStorageSchema): string[] {
    const types: string[] = [];
    if (data.user) types.push("user");
    if (data.fitness) types.push("fitness");
    if (data.nutrition) types.push("nutrition");
    if (data.progress) types.push("progress");
    return types;
  }

  // Utility methods for encryption and storage
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem("@fitai_device_id");
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem("@fitai_device_id", deviceId);
      }
      return deviceId;
    } catch {
      return `device_${Date.now()}`;
    }
  }

  private async getIncrementalChanges(): Promise<IncrementalChange[]> {
    // Load change log from storage
    try {
      const changes = await AsyncStorage.getItem("@fitai_change_log");
      if (changes) {
        const parsed = JSON.parse(changes);
        // Clear change log after reading
        await AsyncStorage.setItem("@fitai_change_log", "[]");
        return parsed;
      }
    } catch (error) {
      console.error("Failed to get incremental changes:", error);
    }
    return [];
  }

  private async compressData(data: string): Promise<string> {
    // Simple LZ-style compression for React Native
    // In production, use a proper compression library like pako
    // For now, we use base64 encoding with a marker
    try {
      // Basic run-length encoding for repeated characters
      let compressed = data.replace(/(.)\1{4,}/g, (match, char) => {
        return `${char}#${match.length}#`;
      });
      return `COMPRESSED:${compressed}`;
    } catch {
      return data;
    }
  }

  private async decompressData(data: string): Promise<string> {
    if (!data.startsWith("COMPRESSED:")) {
      return data;
    }
    try {
      let decompressed = data.slice(11); // Remove "COMPRESSED:" prefix
      // Reverse run-length encoding
      decompressed = decompressed.replace(/(.)\#(\d+)\#/g, (_, char, count) => {
        return char.repeat(parseInt(count, 10));
      });
      return decompressed;
    } catch {
      return data;
    }
  }

  private async encryptData(data: string): Promise<string> {
    // Use expo-crypto for encryption
    // In a production app, you'd use a proper encryption key stored securely
    try {
      // Generate a simple hash-based encryption key from device ID
      const deviceId = await this.getDeviceId();
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        deviceId + "_fitai_backup_key",
      );

      // Simple XOR encryption with the key (for demo purposes)
      // In production, use proper AES encryption with expo-crypto or react-native-crypto
      const keyBytes = keyHash.slice(0, 32);
      let encrypted = "";
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i);
        const keyCode = keyBytes.charCodeAt(i % keyBytes.length);
        encrypted += String.fromCharCode(charCode ^ keyCode);
      }

      // Base64 encode for storage safety (React Native compatible)
      const base64 = binaryToBase64(encrypted);
      return `ENCRYPTED:${base64}`;
    } catch (error) {
      console.error("Encryption failed:", error);
      // Return unencrypted data with marker
      return `UNENCRYPTED:${data}`;
    }
  }

  private async decryptData(data: string): Promise<string> {
    if (data.startsWith("UNENCRYPTED:")) {
      return data.slice(12);
    }
    if (!data.startsWith("ENCRYPTED:")) {
      return data;
    }

    try {
      const base64Data = data.slice(10); // Remove "ENCRYPTED:" prefix
      const encrypted = base64ToBinary(base64Data);

      // Reverse XOR encryption
      const deviceId = await this.getDeviceId();
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

  private async calculateChecksum(data: string): Promise<string> {
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data,
      );
      return hash;
    } catch {
      // Fallback to simple checksum
      let checksum = 0;
      for (let i = 0; i < data.length; i++) {
        checksum = ((checksum << 5) - checksum + data.charCodeAt(i)) | 0;
      }
      return `simple_${Math.abs(checksum).toString(16)}`;
    }
  }

  private async storeCloudBackup(backupData: BackupData): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("Cannot store cloud backup: User not authenticated");
        return;
      }

      // Serialize backup data
      const serializedData = JSON.stringify(backupData);
      const blob = new Blob([serializedData], { type: "application/json" });

      // Upload to Supabase Storage
      const filePath = `backups/${user.id}/${backupData.metadata.id}.json`;
      const { error } = await supabase.storage
        .from("user-backups")
        .upload(filePath, blob, {
          contentType: "application/json",
          upsert: true,
        });

      if (error) {
        console.error("Failed to upload backup to cloud:", error);
        // Don't throw - cloud backup is optional
      } else {
        console.log("Backup uploaded to cloud:", backupData.metadata.id);
      }
    } catch (error) {
      console.error("Cloud backup storage error:", error);
      // Don't throw - cloud backup is optional
    }
  }

  private async loadCloudBackup(backupId: string): Promise<BackupData | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const filePath = `backups/${user.id}/${backupId}.json`;
      const { data, error } = await supabase.storage
        .from("user-backups")
        .download(filePath);

      if (error || !data) {
        console.error("Failed to download backup from cloud:", error);
        return null;
      }

      const text = await data.text();
      const backupData = JSON.parse(text) as BackupData;

      // Process (decrypt/decompress) the loaded backup
      return await this.processLoadedBackup(backupData);
    } catch (error) {
      console.error("Cloud backup load error:", error);
      return null;
    }
  }

  private async deleteCloudBackup(backupId: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const filePath = `backups/${user.id}/${backupId}.json`;
      const { error } = await supabase.storage
        .from("user-backups")
        .remove([filePath]);

      if (error) {
        console.error("Failed to delete cloud backup:", error);
      }
    } catch (error) {
      console.error("Cloud backup deletion error:", error);
    }
  }

  private async getLocalBackups(): Promise<BackupMetadata[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys.filter((key) => key.startsWith("backup_"));

      const metadataList: BackupMetadata[] = [];

      for (const key of backupKeys) {
        try {
          const data = await enhancedLocalStorage.getData<BackupData>(key);
          if (data?.metadata) {
            metadataList.push({
              ...data.metadata,
              location: "local",
              createdAt: new Date(data.metadata.createdAt),
            });
          }
        } catch {
          // Skip corrupted backups
        }
      }

      return metadataList;
    } catch (error) {
      console.error("Failed to get local backups:", error);
      return [];
    }
  }

  private async getCloudBackups(): Promise<BackupMetadata[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data: files, error } = await supabase.storage
        .from("user-backups")
        .list(`backups/${user.id}`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error || !files) {
        console.error("Failed to list cloud backups:", error);
        return [];
      }

      // Extract metadata from file names (or download and parse)
      const metadataList: BackupMetadata[] = files
        .filter((file) => file.name.endsWith(".json"))
        .map((file) => ({
          id: file.name.replace(".json", ""),
          type: "full" as const,
          location: "cloud" as const,
          createdAt: new Date(file.created_at || Date.now()),
          size: file.metadata?.size || 0,
          checksum: "",
          version: "1.0",
          deviceId: "",
          userId: user.id,
          description: `Cloud backup from ${new Date(file.created_at || Date.now()).toLocaleDateString()}`,
          dataTypes: [],
          isEncrypted: true,
          isCompressed: true,
        }));

      return metadataList;
    } catch (error) {
      console.error("Failed to get cloud backups:", error);
      return [];
    }
  }

  private async processLoadedBackup(backup: BackupData): Promise<BackupData> {
    try {
      let dataStr = JSON.stringify(backup.data);

      // Decrypt if encrypted
      if (backup.metadata.isEncrypted) {
        dataStr = await this.decryptData(dataStr);
      }

      // Decompress if compressed
      if (backup.metadata.isCompressed) {
        dataStr = await this.decompressData(dataStr);
      }

      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(dataStr);
      if (
        backup.metadata.checksum &&
        calculatedChecksum !== backup.metadata.checksum
      ) {
        console.warn("Backup checksum mismatch - data may be corrupted");
      }

      return {
        ...backup,
        data: JSON.parse(dataStr),
      };
    } catch (error) {
      console.error("Failed to process loaded backup:", error);
      return backup; // Return as-is if processing fails
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - this.config.backupRetentionDays,
      );

      const allBackups = await this.listBackups();

      // Keep at least the most recent backups up to maxLocalBackups
      const sortedBackups = allBackups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      // Delete old backups beyond the retention limit
      const backupsToDelete = sortedBackups.slice(this.config.maxLocalBackups);
      const oldBackups = sortedBackups.filter((b) => b.createdAt < cutoffDate);

      const deleteList = [...new Set([...backupsToDelete, ...oldBackups])];

      for (const backup of deleteList) {
        try {
          await this.deleteBackup(backup.id);
          console.log(`Cleaned up old backup: ${backup.id}`);
        } catch (error) {
          console.error(`Failed to cleanup backup ${backup.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Backup cleanup failed:", error);
    }
  }

  private async loadBackupStatus(): Promise<void> {
    try {
      const statusJson = await AsyncStorage.getItem("@fitai_backup_status");
      if (statusJson) {
        const savedStatus = JSON.parse(statusJson);
        this.status = {
          ...this.status,
          lastBackupTime: savedStatus.lastBackupTime
            ? new Date(savedStatus.lastBackupTime)
            : null,
          lastBackupResult: savedStatus.lastBackupResult,
        };
      }
    } catch (error) {
      console.error("Failed to load backup status:", error);
    }
  }

  private async saveBackupStatus(): Promise<void> {
    try {
      const statusToSave = {
        lastBackupTime: this.status.lastBackupTime?.toISOString(),
        lastBackupResult: this.status.lastBackupResult,
      };
      await AsyncStorage.setItem(
        "@fitai_backup_status",
        JSON.stringify(statusToSave),
      );
    } catch (error) {
      console.error("Failed to save backup status:", error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const backupRecoveryService = new BackupRecoveryService();
export default backupRecoveryService;
