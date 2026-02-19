/**
 * Constants for Enhanced Local Storage Service
 */

import { EncryptionConfig } from "../../types/localData";

export const STORAGE_VERSION = "0.1.5";
export const STORAGE_KEY_PREFIX = "@fitai_local_";

export const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: "AES-256-GCM",
  keyDerivation: "PBKDF2",
  iterations: 10000,
  saltLength: 32,
  ivLength: 16,
};

export const STORAGE_KEYS = {
  SCHEMA: `${STORAGE_KEY_PREFIX}schema`,
  USER_DATA: `${STORAGE_KEY_PREFIX}user`,
  FITNESS_DATA: `${STORAGE_KEY_PREFIX}fitness`,
  NUTRITION_DATA: `${STORAGE_KEY_PREFIX}nutrition`,
  PROGRESS_DATA: `${STORAGE_KEY_PREFIX}progress`,
  METADATA: `${STORAGE_KEY_PREFIX}metadata`,
  ENCRYPTION_KEY: `${STORAGE_KEY_PREFIX}encryption_key`,
  STORAGE_INFO: `${STORAGE_KEY_PREFIX}storage_info`,
} as const;
