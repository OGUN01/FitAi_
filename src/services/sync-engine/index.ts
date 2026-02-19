export { SyncEngine } from "./SyncEngine";
export type { DataType, SyncOperation, SyncStatus, SyncResult } from "./types";
export {
  QUEUE_STORAGE_KEY,
  LAST_SYNC_KEY,
  MAX_RETRIES,
  BASE_DELAY_MS,
} from "./constants";

import { SyncEngine } from "./SyncEngine";
export const syncEngine = new SyncEngine();
