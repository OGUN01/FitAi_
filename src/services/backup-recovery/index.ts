export { BackupRecoveryService } from "./BackupRecoveryService";
export type {
  BackupConfig,
  BackupMetadata,
  BackupData,
  IncrementalChange,
  RecoveryOptions,
  RecoveryResult,
  RecoveryError,
  BackupStatus,
  BackupResult,
  BackupError,
} from "./types";

import { BackupRecoveryService } from "./BackupRecoveryService";

export const backupRecoveryService = new BackupRecoveryService();
export default backupRecoveryService;
