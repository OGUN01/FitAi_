// Backup and Recovery Service for Track B Infrastructure
// Provides automatic local data backup, cloud backup to Supabase storage, and data recovery mechanisms

import { enhancedLocalStorage } from './localStorage';
import { dataManager } from './dataManager';
import { validationService } from '../utils/validation';
import { LocalStorageSchema } from '../types/localData';

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
  type: 'full' | 'incremental';
  location: 'local' | 'cloud' | 'both';
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
  type: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  timestamp: Date;
  data?: any;
  previousData?: any;
}

export interface RecoveryOptions {
  backupId: string;
  recoveryType: 'full' | 'selective';
  selectedDataTypes?: string[];
  mergeStrategy: 'replace' | 'merge' | 'skip_existing';
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
  type: 'validation' | 'conflict' | 'corruption' | 'permission' | 'unknown';
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
  backupHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  type: 'full' | 'incremental';
  location: 'local' | 'cloud' | 'both';
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  errors: BackupError[];
  warnings: string[];
}

export interface BackupError {
  id: string;
  type: 'storage' | 'network' | 'encryption' | 'compression' | 'validation' | 'unknown';
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
      backupHealth: 'good',
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
      await this.loadAvailableBackups();
      
      if (this.config.enableAutoBackup) {
        this.startAutoBackup();
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      this.isInitialized = true;
      console.log('Backup and recovery service initialized');
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      throw error;
    }
  }

  /**
   * Create a manual backup
   */
  async createBackup(type: 'full' | 'incremental' = 'full', description = ''): Promise<BackupResult> {
    if (this.status.isBackingUp) {
      throw new Error('Backup is already in progress');
    }

    const backupId = this.generateBackupId();
    const startTime = new Date();

    try {
      this.updateStatus({ isBackingUp: true });

      // Get data to backup
      const data = await dataManager.exportAllData();
      if (!data) {
        throw new Error('No data available for backup');
      }

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        type,
        location: this.config.enableCloudBackup ? 'both' : 'local',
        createdAt: startTime,
        size: 0, // Will be calculated
        checksum: '',
        version: data.version,
        deviceId: await this.getDeviceId(),
        userId: data.user?.profile?.id || 'unknown',
        description: description || `${type} backup created on ${startTime.toISOString()}`,
        dataTypes: this.getDataTypes(data),
        isEncrypted: this.config.encryptionEnabled,
        isCompressed: this.config.compressionEnabled,
      };

      // Create backup data
      const backupData: BackupData = {
        metadata,
        data,
        incrementalChanges: type === 'incremental' ? await this.getIncrementalChanges() : undefined,
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
        location: 'local',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: 0,
        errors: [{
          id: this.generateErrorId(),
          type: 'unknown',
          message: error.message,
          details: error,
          timestamp: new Date(),
          retryable: true,
        }],
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
        const validation = validationService.validateLocalStorageSchema(backup.data);
        if (!validation.isValid) {
          throw new Error(`Backup data validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Create recovery point if requested
      if (options.createRecoveryPoint) {
        await this.createBackup('full', `Recovery point before restoring ${options.backupId}`);
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
      const result: RecoveryResult = {
        success: false,
        recoveryId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        recoveredItems: { users: 0, workouts: 0, meals: 0, progress: 0, total: 0 },
        errors: [{
          id: this.generateErrorId(),
          type: 'unknown',
          message: error.message,
          details: error,
          timestamp: new Date(),
          recoverable: false,
        }],
        warnings: [],
        backupInfo: {} as BackupMetadata,
      };

      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(location?: 'local' | 'cloud'): Promise<BackupMetadata[]> {
    await this.updateAvailableBackups();
    
    if (location) {
      return this.status.availableBackups.filter(backup => 
        backup.location === location || backup.location === 'both'
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
    console.log('Backup and recovery service stopped');
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
        const type = this.config.enableIncrementalBackup ? 'incremental' : 'full';
        await this.createBackup(type, 'Automatic backup');
      } catch (error) {
        console.error('Auto backup failed:', error);
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
    backupData.metadata.size = new Blob([processedData]).size;
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

  private async performRecovery(backup: BackupData, options: RecoveryOptions): Promise<RecoveryResult['recoveredItems']> {
    const recoveredItems = { users: 0, workouts: 0, meals: 0, progress: 0, total: 0 };

    if (options.recoveryType === 'full') {
      // Full recovery - replace all data
      await dataManager.importAllData(backup.data);
      recoveredItems.total = 1;
    } else {
      // Selective recovery
      if (options.selectedDataTypes?.includes('user') && backup.data.user) {
        await dataManager.importUserData(backup.data.user);
        recoveredItems.users = 1;
      }
      
      if (options.selectedDataTypes?.includes('fitness') && backup.data.fitness) {
        await dataManager.importFitnessData(backup.data.fitness);
        recoveredItems.workouts = backup.data.fitness.workouts?.length || 0;
      }
      
      if (options.selectedDataTypes?.includes('nutrition') && backup.data.nutrition) {
        await dataManager.importNutritionData(backup.data.nutrition);
        recoveredItems.meals = backup.data.nutrition.meals?.length || 0;
      }
      
      if (options.selectedDataTypes?.includes('progress') && backup.data.progress) {
        await dataManager.importProgressData(backup.data.progress);
        recoveredItems.progress = backup.data.progress.measurements?.length || 0;
      }
      
      recoveredItems.total = recoveredItems.users + recoveredItems.workouts + recoveredItems.meals + recoveredItems.progress;
    }

    return recoveredItems;
  }

  private async updateAvailableBackups(): Promise<void> {
    try {
      const localBackups = await this.getLocalBackups();
      const cloudBackups = this.config.enableCloudBackup ? await this.getCloudBackups() : [];
      
      // Merge and deduplicate backups
      const allBackups = [...localBackups, ...cloudBackups];
      const uniqueBackups = allBackups.reduce((acc, backup) => {
        const existing = acc.find(b => b.id === backup.id);
        if (!existing) {
          acc.push(backup);
        } else if (backup.location === 'both' || (existing.location !== 'both' && backup.location !== existing.location)) {
          existing.location = 'both';
        }
        return acc;
      }, [] as BackupMetadata[]);

      // Sort by creation date (newest first)
      uniqueBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalSize = uniqueBackups.reduce((sum, backup) => sum + backup.size, 0);
      const health = this.assessBackupHealth(uniqueBackups);

      this.updateStatus({
        availableBackups: uniqueBackups,
        totalBackupSize: totalSize,
        backupHealth: health,
      });
    } catch (error) {
      console.error('Failed to update available backups:', error);
    }
  }

  private assessBackupHealth(backups: BackupMetadata[]): BackupStatus['backupHealth'] {
    if (backups.length === 0) return 'critical';
    
    const now = new Date();
    const latestBackup = backups[0];
    const daysSinceLastBackup = (now.getTime() - latestBackup.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastBackup > 7) return 'critical';
    if (daysSinceLastBackup > 3) return 'warning';
    if (daysSinceLastBackup > 1) return 'good';
    return 'excellent';
  }

  private updateStatus(updates: Partial<BackupStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusCallbacks(this.status);
  }

  private notifyStatusCallbacks(status: BackupStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  private notifyResultCallbacks(result: BackupResult): void {
    this.resultCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in result callback:', error);
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
    if (data.user) types.push('user');
    if (data.fitness) types.push('fitness');
    if (data.nutrition) types.push('nutrition');
    if (data.progress) types.push('progress');
    return types;
  }

  // Placeholder methods for actual implementation
  private async getDeviceId(): Promise<string> {
    return 'device_123';
  }

  private async getIncrementalChanges(): Promise<IncrementalChange[]> {
    return [];
  }

  private async compressData(data: string): Promise<string> {
    // Implement compression
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    // Implement encryption
    return data;
  }

  private async calculateChecksum(data: string): Promise<string> {
    // Implement checksum calculation
    return 'checksum_' + data.length;
  }

  private async storeCloudBackup(backupData: BackupData): Promise<void> {
    // Implement cloud storage using Supabase Storage
  }

  private async loadCloudBackup(backupId: string): Promise<BackupData | null> {
    // Implement cloud loading
    return null;
  }

  private async deleteCloudBackup(backupId: string): Promise<void> {
    // Implement cloud deletion
  }

  private async getLocalBackups(): Promise<BackupMetadata[]> {
    // Get local backup metadata
    return [];
  }

  private async getCloudBackups(): Promise<BackupMetadata[]> {
    // Get cloud backup metadata
    return [];
  }

  private async processLoadedBackup(backup: BackupData): Promise<BackupData> {
    // Decrypt and decompress loaded backup
    return backup;
  }

  private async cleanupOldBackups(): Promise<void> {
    // Remove backups older than retention period
  }

  private async loadBackupStatus(): Promise<void> {
    // Load status from storage
  }

  private async saveBackupStatus(): Promise<void> {
    // Save status to storage
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const backupRecoveryService = new BackupRecoveryService();
export default backupRecoveryService;
