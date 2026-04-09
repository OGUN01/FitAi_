/**
 * API Key Rotator for Gemini 2.5 Flash Vision
 * Manages multiple API keys to avoid rate limits and maximize free tier usage
 *
 * Free Tier Limits per key:
 * - 15 requests per minute
 * - 1,500 requests per day
 * - Resets at midnight Pacific Time
 */

interface KeyUsage {
  requestsToday: number;
  requestsThisMinute: number;
  lastResetTime: number;
  lastMinuteReset: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export class APIKeyRotator {
  private static instance: APIKeyRotator | null = null;
  private keys: string[] = [];
  private usageTracker = new Map<string, KeyUsage>();
  private currentKeyIndex = 0;
  private minuteIntervalId: ReturnType<typeof setInterval> | null = null;
  private midnightTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private dailyIntervalId: ReturnType<typeof setInterval> | null = null;

  // Rate limits for Gemini 2.5 Flash free tier
  private readonly DAILY_LIMIT = 1500;
  private readonly MINUTE_LIMIT = 15;
  private readonly BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeKeys();
    this.setupResetTimers();
  }

  /**
   * Get singleton instance to prevent multiple timer instances on hot reload
   */
  static getInstance(): APIKeyRotator {
    if (!APIKeyRotator.instance) {
      APIKeyRotator.instance = new APIKeyRotator();
    }
    return APIKeyRotator.instance;
  }

  /**
   * Destroy timers and clean up. Call on hot reload or unmount.
   */
  destroy(): void {
    if (this.minuteIntervalId !== null) {
      clearInterval(this.minuteIntervalId);
      this.minuteIntervalId = null;
    }
    if (this.midnightTimeoutId !== null) {
      clearTimeout(this.midnightTimeoutId);
      this.midnightTimeoutId = null;
    }
    if (this.dailyIntervalId !== null) {
      clearInterval(this.dailyIntervalId);
      this.dailyIntervalId = null;
    }
    APIKeyRotator.instance = null;
  }

  /**
   * Initialize API keys from environment variables
   */
  private initializeKeys(): void {
    // First try to use the main Gemini API key that's already working for diet/meals
    const mainApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (mainApiKey && mainApiKey.trim()) {
      this.keys.push(mainApiKey.trim());
      this.initializeKeyUsage(mainApiKey.trim());
    }

    // Also load rotation keys if available (matching gemini.ts naming)
    const keyVariables = [
      "EXPO_PUBLIC_GEMINI_KEY_1",
      "EXPO_PUBLIC_GEMINI_KEY_2",
      "EXPO_PUBLIC_GEMINI_KEY_3",
      "EXPO_PUBLIC_GEMINI_KEY_4",
      "EXPO_PUBLIC_GEMINI_KEY_5",
      "EXPO_PUBLIC_GEMINI_KEY_6",
      "EXPO_PUBLIC_GEMINI_KEY_7",
      "EXPO_PUBLIC_GEMINI_KEY_8",
      "EXPO_PUBLIC_GEMINI_KEY_9",
      "EXPO_PUBLIC_GEMINI_KEY_10",
      "EXPO_PUBLIC_GEMINI_KEY_11",
      "EXPO_PUBLIC_GEMINI_KEY_12",
      "EXPO_PUBLIC_GEMINI_KEY_13",
      "EXPO_PUBLIC_GEMINI_KEY_14",
      "EXPO_PUBLIC_GEMINI_KEY_15",
    ];

    for (const keyVar of keyVariables) {
      const key = process.env[keyVar];
      if (key && key.trim()) {
        this.keys.push(key.trim());
        this.initializeKeyUsage(key.trim());
      }
    }

    if (this.keys.length === 0) {
      // Log as error for monitoring - app can still run without food recognition
      console.error("API_KEY_CONFIG_ERROR: No Gemini API keys configured. Food recognition service will be unavailable.");
    }

  }

  /**
   * Initialize usage tracking for a key
   */
  private initializeKeyUsage(key: string): void {
    const now = Date.now();
    this.usageTracker.set(key, {
      requestsToday: 0,
      requestsThisMinute: 0,
      lastResetTime: now,
      lastMinuteReset: now,
      isBlocked: false,
    });
  }

  /**
   * Get an available API key with quota remaining
   */
  async getAvailableKey(): Promise<string | null> {
    const now = Date.now();

    // Return null if no keys are available
    if (this.keys.length === 0) {
      return null;
    }

    // Reset counters if needed
    this.resetCountersIfNeeded(now);

    // Try each key starting from current index
    for (let i = 0; i < this.keys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.keys.length;
      const key = this.keys[keyIndex];
      const usage = this.usageTracker.get(key)!;

      // Skip blocked keys
      if (usage.isBlocked && usage.blockUntil && now < usage.blockUntil) {
        continue;
      }

      // Clear block if time has passed
      if (usage.isBlocked && usage.blockUntil && now >= usage.blockUntil) {
        usage.isBlocked = false;
        usage.blockUntil = undefined;
      }

      // Check if key has quota available
      if (this.hasQuotaAvailable(key)) {
        this.currentKeyIndex = keyIndex;
        this.trackUsage(key);
        return key;
      }
    }

    return null;
  }

  /**
   * Get next available key (for retry scenarios)
   */
  async getNextAvailableKey(): Promise<string | null> {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    return this.getAvailableKey();
  }

  /**
   * Check if a key has quota available
   */
  private hasQuotaAvailable(key: string): boolean {
    const usage = this.usageTracker.get(key);
    if (!usage) return false;

    return (
      usage.requestsToday < this.DAILY_LIMIT &&
      usage.requestsThisMinute < this.MINUTE_LIMIT &&
      !usage.isBlocked
    );
  }

  /**
   * Track usage for a key
   */
  private trackUsage(key: string): void {
    const usage = this.usageTracker.get(key);
    if (!usage) return;

    usage.requestsToday++;
    usage.requestsThisMinute++;

  }
  /**
   * Mark a key as blocked due to rate limiting
   */
  markKeyAsBlocked(key: string, duration: number = this.BLOCK_DURATION): void {
    const usage = this.usageTracker.get(key);
    if (!usage) return;

    usage.isBlocked = true;
    usage.blockUntil = Date.now() + duration;

  }
  /**
   * Reset counters based on time
   */
  private resetCountersIfNeeded(now: number): void {
    for (const [key, usage] of this.usageTracker.entries()) {
      // Reset minute counter every minute
      if (now - usage.lastMinuteReset >= 60 * 1000) {
        usage.requestsThisMinute = 0;
        usage.lastMinuteReset = now;
      }

      // Reset daily counter at midnight Pacific Time
      const pacificMidnight = this.getPacificMidnight();
      if (now >= pacificMidnight && usage.lastResetTime < pacificMidnight) {
        usage.requestsToday = 0;
        usage.lastResetTime = now;
      }
    }
  }

  /**
   * Get next Pacific midnight timestamp
   */
  private getPacificMidnight(): number {
    const now = new Date();
    // Get the current Pacific time using locale string parsing
    const pacificStr = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const pacific = new Date(pacificStr);

    // Calculate the offset between UTC and Pacific time (handles PST/PDT automatically)
    // pacificOffset = UTC time - Pacific time (in ms)
    const pacificOffset = now.getTime() - pacific.getTime();

    // Next midnight in Pacific: set Pacific time to next midnight
    const midnightPacific = new Date(pacific);
    midnightPacific.setHours(24, 0, 0, 0);

    // Convert Pacific midnight back to UTC by adding the offset
    return midnightPacific.getTime() + pacificOffset;
  }

  /**
   * Setup automatic reset timers
   */
  private setupResetTimers(): void {
    // Reset minute counters every minute
    this.minuteIntervalId = setInterval(() => {
      const now = Date.now();
      this.resetCountersIfNeeded(now);
    }, 60 * 1000);

    // Reset daily counters at midnight Pacific
    const msUntilMidnight = this.getPacificMidnight() - Date.now();
    this.midnightTimeoutId = setTimeout(() => {
      // Reset all daily counters
      for (const usage of this.usageTracker.values()) {
        usage.requestsToday = 0;
        usage.lastResetTime = Date.now();
      }

      // Set up daily reset interval
      this.dailyIntervalId = setInterval(
        () => {
          for (const usage of this.usageTracker.values()) {
            usage.requestsToday = 0;
            usage.lastResetTime = Date.now();
          }
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntilMidnight);
  }

  /**
   * Get current usage statistics
   */
  getUsageStatistics(): {
    totalKeys: number;
    availableKeys: number;
    totalRequestsToday: number;
    totalRequestsThisMinute: number;
    keyStatistics: Array<{
      keyIndex: number;
      requestsToday: number;
      requestsThisMinute: number;
      isBlocked: boolean;
      hasQuota: boolean;
    }>;
  } {
    const stats = {
      totalKeys: this.keys.length,
      availableKeys: 0,
      totalRequestsToday: 0,
      totalRequestsThisMinute: 0,
      keyStatistics: [] as Array<{
        keyIndex: number;
        requestsToday: number;
        requestsThisMinute: number;
        isBlocked: boolean;
        hasQuota: boolean;
      }>,
    };

    this.keys.forEach((key, index) => {
      const usage = this.usageTracker.get(key);
      if (!usage) return;

      const hasQuota = this.hasQuotaAvailable(key);
      if (hasQuota) stats.availableKeys++;

      stats.totalRequestsToday += usage.requestsToday;
      stats.totalRequestsThisMinute += usage.requestsThisMinute;

      stats.keyStatistics.push({
        keyIndex: index + 1,
        requestsToday: usage.requestsToday,
        requestsThisMinute: usage.requestsThisMinute,
        isBlocked: usage.isBlocked,
        hasQuota,
      });
    });

    return stats;
  }

  /**
   * Force reset a specific key (for testing)
   */
  resetKey(keyIndex: number): void {
    if (keyIndex < 0 || keyIndex >= this.keys.length) return;

    const key = this.keys[keyIndex];
    const usage = this.usageTracker.get(key);
    if (!usage) return;

    usage.requestsToday = 0;
    usage.requestsThisMinute = 0;
    usage.isBlocked = false;
    usage.blockUntil = undefined;
    usage.lastResetTime = Date.now();
    usage.lastMinuteReset = Date.now();

  }

  /**
   * Get estimated time until next available request
   */
  getTimeUntilNextAvailable(): number {
    const now = Date.now();
    let minWaitTime = Infinity;

    for (const [key, usage] of this.usageTracker.entries()) {
      if (usage.isBlocked && usage.blockUntil) {
        const waitTime = usage.blockUntil - now;
        if (waitTime > 0 && waitTime < minWaitTime) {
          minWaitTime = waitTime;
        }
      } else if (usage.requestsThisMinute >= this.MINUTE_LIMIT) {
        const waitTime = 60 * 1000 - (now - usage.lastMinuteReset);
        if (waitTime > 0 && waitTime < minWaitTime) {
          minWaitTime = waitTime;
        }
      } else if (usage.requestsToday < this.DAILY_LIMIT) {
        return 0; // Available now
      }
    }

    return minWaitTime === Infinity ? -1 : minWaitTime;
  }

  /**
   * Handle API error responses
   */
  handleAPIError(key: string, error: any): void {
    if (
      error.status === 429 ||
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      // Rate limited - block this key temporarily
      this.markKeyAsBlocked(key);
    } else if (error.status === 403) {
      // Quota exceeded - block for longer
      this.markKeyAsBlocked(key, 60 * 60 * 1000); // 1 hour
    }
  }
}

export default APIKeyRotator;
