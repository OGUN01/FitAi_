// Subscription Store for FitAI
// Zustand store for managing premium subscription state (Razorpay backend)

import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import razorpayService from "../services/RazorpayService";
import { getLocalDateString } from "../utils/weekUtils";
import { API_CONFIG } from "../config/api";

// ============================================================================
// Types - aligned with backend GET /api/subscription/status response
// ============================================================================

type SubscriptionTier = "free" | "basic" | "pro";

type SubscriptionStatusType =
  | "active"
  | "authenticated"
  | "paused"
  | "cancelled"
  | "pending"
  | null;

interface PlanInfo {
  tier: SubscriptionTier;
  name: string;
  billing_cycle: string | null;
}

interface FeatureLimits {
  ai_generations_per_day: number | null;
  ai_generations_per_month: number | null;
  scans_per_day: number | null;
  unlimited_scans: boolean;
  unlimited_ai: boolean;
  analytics: boolean;
  coaching: boolean;
}

interface UsageBucket {
  current: number;
  limit: number | null;
  remaining: number | null;
}

interface UsageSummary {
  ai_generation: {
    daily: UsageBucket;
    monthly: UsageBucket;
  };
  barcode_scan: {
    daily: UsageBucket;
  };
}

/**
 * Raw shape returned by the backend's GET /api/subscription/status endpoint.
 * RazorpayService.getSubscriptionStatus() extracts `.data` for us, but the
 * service-layer type is loosely typed. We define the real shape here.
 */
interface BackendStatusData {
  tier: SubscriptionTier;
  name: string;
  status: string;
  is_active: boolean;
  billing_cycle: string | null;
  current_period_end: number | string | null;
  razorpay_subscription_id: string | null;
  features: FeatureLimits;
  usage?: UsageSummary;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map the raw backend status string to the narrower type the store cares about.
 * Razorpay statuses like 'created', 'halted', 'completed', 'expired' are
 * collapsed to `null` (treated as no subscription).
 */
function normalizeStatus(raw: string): SubscriptionStatusType {
  switch (raw) {
    case "active":
      return "active";
    case "authenticated":
      return "authenticated";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return null;
  }
}

/**
 * Derive usage buckets from feature limits.
 *
 * The backend status endpoint returns feature-limit config but not live usage
 * counts. We initialise limits here so the UI can show caps; actual enforcement
 * happens server-side. When a dedicated usage endpoint is added, refreshUsage()
 * can be updated to call it.
 */
function deriveUsageFromFeatures(features: FeatureLimits): UsageSummary {
  return {
    ai_generation: {
      daily: {
        current: 0,
        limit: features.ai_generations_per_day,
        remaining: features.ai_generations_per_day,
      },
      monthly: {
        current: 0,
        limit: features.ai_generations_per_month,
        remaining: features.ai_generations_per_month,
      },
    },
    barcode_scan: {
      daily: {
        current: 0,
        limit: features.scans_per_day,
        remaining: features.scans_per_day,
      },
    },
  };
}

function normalizePeriodEnd(
  value: number | string | null | undefined,
): string | null {
  if (value == null) return null;

  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && String(numeric) === value) {
    return new Date(numeric * 1000).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// ============================================================================
// Free-tier defaults
// ============================================================================

const FREE_FEATURES: FeatureLimits = {
  ai_generations_per_day: null,
  ai_generations_per_month: 1,
  scans_per_day: 10,
  unlimited_scans: false,
  unlimited_ai: false,
  analytics: false,
  coaching: false,
};

const EMPTY_USAGE: UsageSummary = deriveUsageFromFeatures(FREE_FEATURES);
let subscriptionInitializationPromise: Promise<void> | null = null;

// Track the calendar month in which usage was last reset ("YYYY-MM" format)
// so we can auto-reset counts at the start of each new billing month.
function getCurrentMonthKey(): string {
  return getLocalDateString(new Date()).slice(0, 7);
}

function getCurrentDayKey(): string {
  return getLocalDateString(new Date());
}

function shouldSkipRemoteSubscriptionStatusOnLocalWeb(): boolean {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(
    window.location.hostname,
  );
  if (!isLocalHost) {
    return false;
  }

  try {
    const workerHost = new URL(API_CONFIG.WORKERS_BASE_URL).hostname;
    return !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(workerHost);
  } catch {
    return true;
  }
}

// ============================================================================
// Store interface
// ============================================================================

interface SubscriptionState {
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Subscription data
  currentPlan: PlanInfo | null;
  subscriptionStatus: SubscriptionStatusType;
  features: FeatureLimits;
  usage: UsageSummary;
  usageIsFresh: boolean;
  currentPeriodEnd: string | null;

  // Usage reset tracking — persisted to detect a new billing month on restart
  usageResetMonth: string | null;
  usageResetDay: string | null;

  // Actions
  fetchSubscriptionStatus: (options?: {
    preserveExistingOnError?: boolean;
  }) => Promise<void>;
  initializeSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  isPremium: () => boolean;
  canUseFeature: (featureKey: "ai_generation" | "barcode_scan") => boolean;
  clearSubscription: () => void;
  setOptimisticSubscription: (snapshot: {
    tier: SubscriptionTier;
    name: string;
    billing_cycle: string | null;
    features: FeatureLimits;
    current_period_end?: number | string | null;
    status?: SubscriptionStatusType;
  }) => void;
  applyLifecycleUpdate: (update: {
    status: SubscriptionStatusType;
    current_period_end?: number | string | null;
  }) => void;
  incrementUsage: (featureKey: "ai_generation" | "barcode_scan") => void;
  showPaywall: boolean;
  paywallReason: string | null;
  triggerPaywall: (reason: string) => void;
  dismissPaywall: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useSubscriptionStore = create<SubscriptionState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ----- Initial State -----
        isLoading: false,
        isInitialized: false,
        currentPlan: null,
        subscriptionStatus: null,
        features: FREE_FEATURES,
        usage: EMPTY_USAGE,
        usageIsFresh: false,
        currentPeriodEnd: null,
        showPaywall: false,
        paywallReason: null,
        usageResetMonth: null,
        usageResetDay: null,
        // ----- Actions -----

        fetchSubscriptionStatus: async (options) => {
          const preserveExistingOnError = options?.preserveExistingOnError ?? false;
          set({ isLoading: true });

          if (shouldSkipRemoteSubscriptionStatusOnLocalWeb()) {
            console.warn(
              "[subscriptionStore] Skipping remote subscription status fetch on localhost web because the configured worker URL is cross-origin.",
            );

            if (preserveExistingOnError) {
              set({ isLoading: false, usageIsFresh: false });
              return;
            }

            set({
              isLoading: false,
              currentPlan: null,
              subscriptionStatus: null,
              features: FREE_FEATURES,
              usage: EMPTY_USAGE,
              usageIsFresh: false,
              currentPeriodEnd: null,
              usageResetMonth: getCurrentMonthKey(),
              usageResetDay: getCurrentDayKey(),
            });
            return;
          }

          try {
            const data =
              (await razorpayService.getSubscriptionStatus()) as unknown as BackendStatusData;

            const status = normalizeStatus(data.status);
            const features: FeatureLimits =
              data.tier === "free" ? FREE_FEATURES : (data.features ?? FREE_FEATURES);

            const currentMonth = getCurrentMonthKey();
            const currentDay = getCurrentDayKey();
            const {
              usageResetMonth,
              usageResetDay,
              currentPlan: prevPlan,
              usage: prevUsage,
            } = get();
            const tierChanged = prevPlan !== null && prevPlan.tier !== data.tier;
            const monthChanged =
              usageResetMonth !== null && usageResetMonth !== currentMonth;
            const dayChanged =
              usageResetDay !== null && usageResetDay !== currentDay;
            const shouldResetMonthly =
              tierChanged || monthChanged || usageResetMonth === null;
            const shouldResetDaily =
              shouldResetMonthly || tierChanged || dayChanged || usageResetDay === null;

            let usage: UsageSummary;
            let usageIsFresh = false;
            if (data.usage) {
              // Server provided live usage counts — use them authoritatively
              usage = data.usage;
              usageIsFresh = true;
            } else if (shouldResetMonthly) {
              // New billing month or tier change — reset counts, mark fresh so
              // features are not blocked while waiting for a dedicated usage endpoint
              usage = get().usage;
              usageIsFresh = true;
            } else {
              // Server omitted usage — keep persisted counts, mark fresh so
              // existing quota is honoured without blocking features
              usageIsFresh = true;
              // Preserve persisted counts, update limits from server
              usage = {
                ai_generation: {
                  daily: {
                    current: shouldResetDaily
                      ? 0
                      : prevUsage.ai_generation.daily.current,
                    limit: features.ai_generations_per_day,
                    remaining:
                      features.ai_generations_per_day !== null
                        ? Math.max(
                            0,
                            features.ai_generations_per_day -
                              (shouldResetDaily
                                ? 0
                                : prevUsage.ai_generation.daily.current),
                          )
                        : null,
                  },
                  monthly: {
                    current: prevUsage.ai_generation.monthly.current,
                    limit: features.ai_generations_per_month,
                    remaining:
                      features.ai_generations_per_month !== null
                        ? Math.max(0, features.ai_generations_per_month - prevUsage.ai_generation.monthly.current)
                        : null,
                  },
                },
                barcode_scan: {
                  daily: {
                    current: shouldResetDaily
                      ? 0
                      : prevUsage.barcode_scan.daily.current,
                    limit: features.scans_per_day,
                    remaining:
                      features.scans_per_day !== null
                        ? Math.max(
                            0,
                            features.scans_per_day -
                              (shouldResetDaily
                                ? 0
                                : prevUsage.barcode_scan.daily.current),
                          )
                        : null,
                  },
                },
              };
            }

            set({
              currentPlan: {
                tier: data.tier,
                name: data.name,
                billing_cycle: data.billing_cycle,
              },
              subscriptionStatus: status,
              features,
              usage,
              usageIsFresh,
              currentPeriodEnd: normalizePeriodEnd(data.current_period_end),
              isLoading: false,
              usageResetMonth: shouldResetMonthly
                ? currentMonth
                : (usageResetMonth ?? currentMonth),
              usageResetDay: shouldResetDaily
                ? currentDay
                : (usageResetDay ?? currentDay),
            });
          } catch (error) {
            console.warn("[subscriptionStore] Failed to fetch status:", error);
            const shouldPreserveExisting = preserveExistingOnError;

            if (shouldPreserveExisting) {
              set({ isLoading: false, usageIsFresh: false });
              return;
            }

            set({
              isLoading: false,
              currentPlan: null,
              subscriptionStatus: null,
              features: FREE_FEATURES,
              usage: EMPTY_USAGE,
              usageIsFresh: false,
              currentPeriodEnd: null,
              usageResetMonth: null,
              usageResetDay: null,
            });
          }
        },

        initializeSubscription: async () => {
          if (get().isInitialized) return;
          if (subscriptionInitializationPromise) {
            await subscriptionInitializationPromise;
            return;
          }

          subscriptionInitializationPromise = (async () => {
            await get().fetchSubscriptionStatus();
            set({ isInitialized: true });
          })().finally(() => {
            subscriptionInitializationPromise = null;
          });

          await subscriptionInitializationPromise;
        },

        refreshUsage: async () => {
          await get().fetchSubscriptionStatus();
        },

        isPremium: () => {
          const { subscriptionStatus, currentPlan } = get();
          // Use persisted state even before isInitialized to avoid flash of free-tier UI.
          // If currentPlan is null (no persisted data) we default to false.
          return (
            (subscriptionStatus === "active" ||
              subscriptionStatus === "authenticated") &&
            (currentPlan?.tier === "basic" || currentPlan?.tier === "pro")
          );
        },

        canUseFeature: (
          featureKey: "ai_generation" | "barcode_scan",
        ): boolean => {
          const { usage, features, isInitialized } = get();

          if (!isInitialized) {
            return false;
          }

          if (featureKey === "ai_generation") {
            if (!get().usageIsFresh && !features.unlimited_ai) return false;
            if (features.unlimited_ai) return true;
            const dailyRemaining = usage.ai_generation.daily.remaining;
            const monthlyRemaining = usage.ai_generation.monthly.remaining;
            const dailyOk = dailyRemaining === null || dailyRemaining > 0;
            const monthlyOk = monthlyRemaining === null || monthlyRemaining > 0;
            return dailyOk && monthlyOk;
          }

          if (featureKey === "barcode_scan") {
            if (!get().usageIsFresh && !features.unlimited_scans) return false;
            if (features.unlimited_scans) return true;
            const dailyRemaining = usage.barcode_scan.daily.remaining;
            return dailyRemaining === null || dailyRemaining > 0;
          }

          return false;
        },
        incrementUsage: (featureKey: "ai_generation" | "barcode_scan") => {
          const { usage, features } = get();
          if (featureKey === "ai_generation") {
            if (features.unlimited_ai) return;
            const daily = usage.ai_generation.daily;
            const monthly = usage.ai_generation.monthly;
            const newDailyCurrent = daily.current + 1;
            const newDailyRemaining =
              daily.remaining !== null ? Math.max(0, daily.remaining - 1) : null;
            const newMonthlyCurrent = monthly.current + 1;
            const newMonthlyRemaining =
              monthly.remaining !== null ? Math.max(0, monthly.remaining - 1) : null;
            set({
              usageResetDay: getCurrentDayKey(),
              usage: {
                ...usage,
                ai_generation: {
                  ...usage.ai_generation,
                  daily: {
                    ...daily,
                    current: newDailyCurrent,
                    remaining: newDailyRemaining,
                  },
                  monthly: {
                    ...monthly,
                    current: newMonthlyCurrent,
                    remaining: newMonthlyRemaining,
                  },
                },
              },
            });
          } else if (featureKey === "barcode_scan") {
            if (features.unlimited_scans) return;
            const daily = usage.barcode_scan.daily;
            const newCurrent = daily.current + 1;
            const newRemaining =
              daily.remaining !== null ? Math.max(0, daily.remaining - 1) : null;
            set({
              usageResetDay: getCurrentDayKey(),
              usage: {
                ...usage,
                barcode_scan: {
                  daily: {
                    ...daily,
                    current: newCurrent,
                    remaining: newRemaining,
                  },
                },
              },
            });
          }
        },



        triggerPaywall: (reason: string) => {
          set({ showPaywall: true, paywallReason: reason });
        },

        dismissPaywall: () => {
          set({ showPaywall: false, paywallReason: null });
        },
        clearSubscription: () => {
          subscriptionInitializationPromise = null;
          set({
            currentPlan: null,
            subscriptionStatus: null,
            features: FREE_FEATURES,
            usage: EMPTY_USAGE,
            usageIsFresh: false,
            currentPeriodEnd: null,
            isInitialized: false,
            isLoading: false,
            usageResetMonth: null,
            usageResetDay: null,
          });
        },
        setOptimisticSubscription: (snapshot) => {
          const currentMonth = getCurrentMonthKey();
          const currentDay = getCurrentDayKey();

          set({
            currentPlan: {
              tier: snapshot.tier,
              name: snapshot.name,
              billing_cycle: snapshot.billing_cycle,
            },
            subscriptionStatus: snapshot.status ?? "authenticated",
            features: snapshot.features,
            usage: deriveUsageFromFeatures(snapshot.features),
            usageIsFresh: false,
            currentPeriodEnd: normalizePeriodEnd(snapshot.current_period_end),
            usageResetMonth: currentMonth,
            usageResetDay: currentDay,
          });
        },
        applyLifecycleUpdate: ({ status, current_period_end }) => {
          set((state) => ({
            ...state,
            subscriptionStatus: status,
            usageIsFresh: false,
            currentPeriodEnd: normalizePeriodEnd(current_period_end),
          }));
        },
      }),
      {
        name: "subscription-storage",
        storage: createDebouncedStorage(),
        partialize: (state) => ({
          currentPlan: state.currentPlan,
          subscriptionStatus: state.subscriptionStatus,
          currentPeriodEnd: state.currentPeriodEnd,
          // Persist usage so local counter survives app restarts within the same billing month
          usage: state.usage,
          usageResetMonth: state.usageResetMonth,
          usageResetDay: state.usageResetDay,
          // features intentionally excluded — always recomputed from server on fetch
          // isInitialized intentionally excluded — must always start false on app restart
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          // Fill any missing usage fields from old app versions with safe defaults
          state.usage = {
            ...EMPTY_USAGE,
            ...(state.usage ?? {}),
            ai_generation: {
              ...EMPTY_USAGE.ai_generation,
              ...(state.usage?.ai_generation ?? {}),
              daily: { ...EMPTY_USAGE.ai_generation.daily, ...(state.usage?.ai_generation?.daily ?? {}) },
              monthly: { ...EMPTY_USAGE.ai_generation.monthly, ...(state.usage?.ai_generation?.monthly ?? {}) },
            },
            barcode_scan: {
              ...EMPTY_USAGE.barcode_scan,
              ...(state.usage?.barcode_scan ?? {}),
              daily: { ...EMPTY_USAGE.barcode_scan.daily, ...(state.usage?.barcode_scan?.daily ?? {}) },
            },
          };
          // Reset daily usage counters if persisted usageResetDay is from a previous day.
          // Prevents yesterday's AI-generation/scan count from blocking today's quota.
          const today = getCurrentDayKey();
          if (state.usageResetDay && state.usageResetDay !== today) {
            const usage = state.usage;
            if (usage) {
              state.usage = {
                ...usage,
                ai_generation: {
                  ...usage.ai_generation,
                  daily: { ...usage.ai_generation.daily, current: 0 },
                },
                barcode_scan: {
                  ...usage.barcode_scan,
                  daily: { ...usage.barcode_scan.daily, current: 0 },
                },
              };
              state.usageResetDay = today;
            }
          }
        },
        version: 3, // bump to clear stale persisted state from v1/v2
        migrate: (persistedState: unknown, version: number) => {
          // v1/v2 state shapes are incompatible — discard and start fresh only when migrating from them.
          // The store will re-fetch from the server on next initializeSubscription().
          if (!version || version < 2) {
            return {
              currentPlan: null,
              subscriptionStatus: null,
              currentPeriodEnd: null,
              usage: EMPTY_USAGE,
              usageResetMonth: null,
              usageResetDay: null,
            };
          }
          // For version 2→3 keep whatever was persisted (shape is compatible).
          return persistedState as any;
        },
      },
    ),
  ),
);

export default useSubscriptionStore;
