// Subscription Store for FitAI
// Zustand store for managing premium subscription state (Razorpay backend)

import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeAsyncStorage } from "../utils/safeAsyncStorage";
import razorpayService from "../services/RazorpayService";

// ============================================================================
// Types - aligned with backend GET /api/subscription/status response
// ============================================================================

type SubscriptionTier = "free" | "basic" | "pro";

type SubscriptionStatusType =
  | "active"
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
  current_period_end: string | null;
  razorpay_subscription_id: string | null;
  features: FeatureLimits;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map the raw backend status string to the narrower type the store cares about.
 * Razorpay statuses like 'created', 'authenticated', 'halted', 'completed',
 * 'expired' are collapsed to `null` (treated as no active subscription).
 */
function normalizeStatus(raw: string): SubscriptionStatusType {
  switch (raw) {
    case "active":
      return "active";
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

// Track the calendar month in which usage was last reset ("YYYY-MM" format)
// so we can auto-reset counts at the start of each new billing month.
function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
  currentPeriodEnd: string | null;

  // Usage reset tracking — persisted to detect a new billing month on restart
  usageResetMonth: string | null;

  // Actions
  fetchSubscriptionStatus: () => Promise<void>;
  initializeSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  isPremium: () => boolean;
  canUseFeature: (featureKey: "ai_generation" | "barcode_scan") => boolean;
  clearSubscription: () => void;
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
        currentPeriodEnd: null,
        showPaywall: false,
        paywallReason: null,
        usageResetMonth: null,
        // ----- Actions -----

        fetchSubscriptionStatus: async () => {
          set({ isLoading: true });
          try {
            const data =
              (await razorpayService.getSubscriptionStatus()) as unknown as BackendStatusData;

            const status = normalizeStatus(data.status);
            const features: FeatureLimits =
              data.tier === "free" ? FREE_FEATURES : (data.features ?? FREE_FEATURES);

            // Decide whether to reset usage counts:
            // Reset when: (a) first run (no month key), (b) new calendar month, or (c) plan tier changed
            const currentMonth = getCurrentMonthKey();
            const { usageResetMonth, currentPlan: prevPlan, usage: prevUsage } = get();
            const tierChanged = prevPlan !== null && prevPlan.tier !== data.tier;
            const monthChanged = usageResetMonth !== null && usageResetMonth !== currentMonth;
            const shouldReset = tierChanged || monthChanged || usageResetMonth === null;

            let usage: UsageSummary;
            if (shouldReset) {
              usage = deriveUsageFromFeatures(features);
            } else {
              // Preserve persisted counts, update limits from server
              usage = {
                ai_generation: {
                  daily: {
                    current: prevUsage.ai_generation.daily.current,
                    limit: features.ai_generations_per_day,
                    remaining:
                      features.ai_generations_per_day !== null
                        ? Math.max(0, features.ai_generations_per_day - prevUsage.ai_generation.daily.current)
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
                    current: prevUsage.barcode_scan.daily.current,
                    limit: features.scans_per_day,
                    remaining:
                      features.scans_per_day !== null
                        ? Math.max(0, features.scans_per_day - prevUsage.barcode_scan.daily.current)
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
              currentPeriodEnd: data.current_period_end,
              isLoading: false,
              usageResetMonth: shouldReset ? currentMonth : (usageResetMonth ?? currentMonth),
            });
          } catch (error) {
            console.warn("[subscriptionStore] Failed to fetch status:", error);
            set({ isLoading: false });
          }
        },

        initializeSubscription: async () => {
          if (get().isInitialized) return;
          await get().fetchSubscriptionStatus();
          set({ isInitialized: true });
        },

        refreshUsage: async () => {
          await get().fetchSubscriptionStatus();
        },

        isPremium: () => {
          const { subscriptionStatus, currentPlan } = get();
          return (
            subscriptionStatus === "active" &&
            (currentPlan?.tier === "basic" || currentPlan?.tier === "pro")
          );
        },

        canUseFeature: (
          featureKey: "ai_generation" | "barcode_scan",
        ): boolean => {
          const { usage, features } = get();

          if (featureKey === "ai_generation") {
            if (features.unlimited_ai) return true;
            const dailyRemaining = usage.ai_generation.daily.remaining;
            const monthlyRemaining = usage.ai_generation.monthly.remaining;
            const dailyOk = dailyRemaining === null || dailyRemaining > 0;
            const monthlyOk = monthlyRemaining === null || monthlyRemaining > 0;
            return dailyOk && monthlyOk;
          }

          if (featureKey === "barcode_scan") {
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
            const monthly = usage.ai_generation.monthly;
            const newCurrent = monthly.current + 1;
            const newRemaining =
              monthly.remaining !== null ? Math.max(0, monthly.remaining - 1) : null;
            set({
              usage: {
                ...usage,
                ai_generation: {
                  ...usage.ai_generation,
                  monthly: {
                    ...monthly,
                    current: newCurrent,
                    remaining: newRemaining,
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
          set({
            currentPlan: null,
            subscriptionStatus: null,
            features: FREE_FEATURES,
            usage: EMPTY_USAGE,
            currentPeriodEnd: null,
            isInitialized: false,
            isLoading: false,
            usageResetMonth: null,
          });
        },
      }),
      {
        name: "subscription-storage",
        storage: createJSONStorage(() => safeAsyncStorage),
        partialize: (state) => ({
          currentPlan: state.currentPlan,
          subscriptionStatus: state.subscriptionStatus,
          currentPeriodEnd: state.currentPeriodEnd,
          // Persist usage so local counter survives app restarts within the same billing month
          usage: state.usage,
          usageResetMonth: state.usageResetMonth,
          // features intentionally excluded — always recomputed from server on fetch
          // isInitialized intentionally excluded — must always start false on app restart
        }),
        version: 3, // bump to clear stale persisted state from v1/v2
      },
    ),
  ),
);

export default useSubscriptionStore;
