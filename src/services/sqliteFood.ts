/**
 * On-Device SQLite Food Database Service
 *
 * Provides offline-first barcode lookup and food name search using a
 * pre-built SQLite database downloaded from Supabase Storage.
 *
 * The remote file is gzip-compressed (.sqlite.gz). After download the
 * service decompresses it with pako (pure JS) and writes the resulting
 * .sqlite file to the document directory.
 *
 * Download uses createDownloadResumable() (NOT downloadAsync) to avoid
 * Android's 60-second timeout bug on large files.
 */

import * as FileSystem from "expo-file-system";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { inflate } from "pako";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Row shape matching the products table in the on-device SQLite DB */
export interface SQLiteFoodResult {
  code: string;
  product_name: string | null;
  brands: string | null;
  energy_kcal_100g: number | null;
  proteins_100g: number | null;
  carbohydrates_100g: number | null;
  sugars_100g: number | null;
  fat_100g: number | null;
  saturated_fat_100g: number | null;
  fiber_100g: number | null;
  sodium_100g: number | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  image_url: string | null;
}

/** State machine for the database download lifecycle */
export type SQLiteDownloadState =
  | "not_downloaded"
  | "downloading"
  | "ready"
  | "error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_FILE_NAME = "fitai-foods.sqlite";
const DB_FILE_NAME_GZ = "fitai-foods.sqlite.gz";
const DB_REMOTE_URL =
  "https://mqfrwtmkokivoxgukgsz.supabase.co/storage/v1/object/public/food-databases/fitai-foods-latest.sqlite.gz";
const ASYNC_STORAGE_DOWNLOAD_KEY = "fitai_sqlite_download_state";
/** Minimum expected file size of the decompressed .sqlite (50 MB) */
const MIN_DB_SIZE_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class SqliteFoodService {
  // Singleton ---------------------------------------------------------------
  private static instance: SqliteFoodService;

  static getInstance(): SqliteFoodService {
    if (!SqliteFoodService.instance) {
      SqliteFoodService.instance = new SqliteFoodService();
    }
    return SqliteFoodService.instance;
  }

  private constructor() {}

  // Internal state ----------------------------------------------------------
  private state: SQLiteDownloadState = "not_downloaded";
  private db: SQLiteDatabase | null = null;
  private currentDownload: FileSystem.DownloadResumable | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Synchronous check — returns true only when state is 'ready' */
  isDatabaseReady(): boolean {
    return this.state === "ready";
  }

  /** Current download / readiness state */
  getState(): SQLiteDownloadState {
    return this.state;
  }

  /**
   * Download the pre-built SQLite database from Supabase Storage.
   *
   * The remote file is gzip-compressed. After downloading the .gz file
   * this method decompresses it with pako and writes the .sqlite output.
   *
   * Uses `FileSystem.createDownloadResumable()` so the download can be
   * paused / resumed across app restarts and avoids the Android 60-second
   * timeout bug that affects `downloadAsync()`.
   */
  async downloadDatabase(
    onProgress?: (downloaded: number, total: number) => void,
    onStage?: (stage: string) => void,
  ): Promise<void> {
    if (this.state === "ready") return;
    if (this.state === "downloading") return;

    const gzUri = this.getGzFileUri();
    const fileUri = this.getDbFileUri();
    this.state = "downloading";

    try {
      // Check if there is a previously saved resumable state
      const savedStateJson = await AsyncStorage.getItem(
        ASYNC_STORAGE_DOWNLOAD_KEY,
      );
      let resumeData: string | undefined;
      if (savedStateJson) {
        try {
          const parsed: FileSystem.DownloadPauseState =
            JSON.parse(savedStateJson);
          resumeData = parsed.resumeData;
        } catch {
          // Corrupted state — start fresh
          await AsyncStorage.removeItem(ASYNC_STORAGE_DOWNLOAD_KEY);
        }
      }

      onStage?.("Downloading\u2026");

      const downloadResumable = FileSystem.createDownloadResumable(
        DB_REMOTE_URL,
        gzUri,
        {},
        (data) => {
          if (onProgress) {
            onProgress(data.totalBytesWritten, data.totalBytesExpectedToWrite);
          }
        },
        resumeData,
      );

      this.currentDownload = downloadResumable;

      const result = resumeData
        ? await downloadResumable.resumeAsync()
        : await downloadResumable.downloadAsync();

      this.currentDownload = null;

      // If cancelled, result is undefined
      if (!result) {
        this.state = "not_downloaded";
        return;
      }

      // Clean up saved state
      await AsyncStorage.removeItem(ASYNC_STORAGE_DOWNLOAD_KEY);

      // Decompress .gz → .sqlite
      await this.decompressGz(gzUri, fileUri, onStage);

      // Integrity check — decompressed file must be > 50 MB
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || info.size < MIN_DB_SIZE_BYTES) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        this.state = "error";
        throw new Error(
          `Downloaded database file is too small (${info.exists ? info.size : 0} bytes). Expected > ${MIN_DB_SIZE_BYTES} bytes.`,
        );
      }

      await this.openDb();
      this.state = "ready";
    } catch (err) {
      if (this.state !== "not_downloaded") {
        this.state = "error";
      }
      throw err;
    }
  }

  /** Cancel an in-progress download and persist resume state */
  async cancelDownload(): Promise<void> {
    if (!this.currentDownload) return;

    try {
      const pauseState = await this.currentDownload.pauseAsync();
      await AsyncStorage.setItem(
        ASYNC_STORAGE_DOWNLOAD_KEY,
        JSON.stringify(pauseState),
      );
    } catch {
      // Best-effort cancel
    }

    this.currentDownload = null;
    this.state = "not_downloaded";
  }

  /**
   * Exact barcode lookup.
   * Returns null if the database is not ready or the barcode is not found.
   */
  async lookupBarcode(barcode: string): Promise<SQLiteFoodResult | null> {
    const db = await this.ensureDb();
    if (!db) return null;

    const row = await db.getFirstAsync<SQLiteFoodResult>(
      "SELECT * FROM products WHERE code = ?",
      [barcode],
    );

    return row ?? null;
  }

  /**
   * Name-based search using LIKE.
   * Returns an empty array if the database is not ready or nothing matches.
   */
  async searchByName(
    query: string,
    limit: number = 20,
  ): Promise<SQLiteFoodResult[]> {
    const db = await this.ensureDb();
    if (!db) return [];

    const rows = await db.getAllAsync<SQLiteFoodResult>(
      "SELECT * FROM products WHERE product_name LIKE ? LIMIT ?",
      [`%${query}%`, limit],
    );

    return rows;
  }

  /** Database statistics — product count, nutrition coverage, version */
  async getStats(): Promise<{
    totalProducts: number;
    withNutrition: number;
    version: string;
  }> {
    const db = await this.ensureDb();
    if (!db) {
      return { totalProducts: 0, withNutrition: 0, version: "unknown" };
    }

    const totalRow = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM products",
    );
    const nutritionRow = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM products WHERE energy_kcal_100g IS NOT NULL",
    );
    const versionRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'version'",
    );

    return {
      totalProducts: totalRow?.cnt ?? 0,
      withNutrition: nutritionRow?.cnt ?? 0,
      version: versionRow?.value ?? "unknown",
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private getDbFileUri(): string {
    return (FileSystem.documentDirectory ?? "") + DB_FILE_NAME;
  }

  private getGzFileUri(): string {
    return (FileSystem.documentDirectory ?? "") + DB_FILE_NAME_GZ;
  }

  /**
   * Decompress a gzip file to a raw SQLite file using pako.
   *
   * Reads the compressed file as base64, inflates with pako, and writes
   * the decompressed bytes back as base64. Deletes the .gz temp file
   * after successful decompression.
   */
  private async decompressGz(
    gzUri: string,
    sqliteUri: string,
    onStage?: (stage: string) => void,
  ): Promise<void> {
    onStage?.("Preparing database\u2026");

    // Read compressed file as base64
    const base64gz = await FileSystem.readAsStringAsync(gzUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // base64 string → Uint8Array (avoid stack overflow: don't use spread on large arrays)
    const binaryStr = atob(base64gz);
    const inputArr = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      inputArr[i] = binaryStr.charCodeAt(i);
    }

    // Decompress
    const outputArr = inflate(inputArr);

    // Uint8Array → base64 string in 8 KB chunks
    const CHUNK = 8192;
    let b64 = "";
    for (let i = 0; i < outputArr.length; i += CHUNK) {
      b64 += btoa(
        String.fromCharCode(...Array.from(outputArr.subarray(i, i + CHUNK))),
      );
    }

    // Write decompressed bytes as base64
    await FileSystem.writeAsStringAsync(sqliteUri, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Clean up gz temp file
    await FileSystem.deleteAsync(gzUri, { idempotent: true });
  }

  /**
   * Opens the database (if not already open) and runs the schema
   * initialisation DDL. The DDL uses IF NOT EXISTS so it is safe to
   * run repeatedly.
   */
  private async openDb(): Promise<SQLiteDatabase> {
    if (this.db) return this.db;

    this.db = await openDatabaseAsync(DB_FILE_NAME);
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        code TEXT PRIMARY KEY,
        product_name TEXT,
        brands TEXT,
        energy_kcal_100g REAL,
        proteins_100g REAL,
        carbohydrates_100g REAL,
        sugars_100g REAL,
        fat_100g REAL,
        saturated_fat_100g REAL,
        fiber_100g REAL,
        sodium_100g REAL,
        nutriscore_grade TEXT,
        nova_group INTEGER,
        image_url TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    `);

    return this.db;
  }

  /**
   * Returns the open database handle if the DB is ready, otherwise
   * attempts to open it from the local file. Returns null if the
   * file doesn't exist yet.
   */
  private async ensureDb(): Promise<SQLiteDatabase | null> {
    if (this.db) return this.db;

    const fileUri = this.getDbFileUri();
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }

    try {
      await this.openDb();
      this.state = "ready";
      return this.db;
    } catch {
      this.state = "error";
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Exported singleton
// ---------------------------------------------------------------------------

export const sqliteFood = SqliteFoodService.getInstance();
