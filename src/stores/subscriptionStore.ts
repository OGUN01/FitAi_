// Subscription Store for FitAI
// Zustand store for managing premium subscription state (Razorpay backend)

import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const EMPTY_USAGE: UsageSummary = {
  ai_generation: {
    daily: { current: 0, limit: null, remaining: null },
    monthly: { current: 0, limit: null, remaining: null },
  },
  barcode_scan: {
    daily: { current: 0, limit: null, remaining: null },
  },
};

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

  // Actions
  fetchSubscriptionStatus: () => Promise<void>;
  initializeSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  isPremium: () => boolean;
  canUseFeature: (featureKey: "ai_generation" | "barcode_scan") => boolean;
  clearSubscription: () => void;
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

        // ----- Actions -----

        fetchSubscriptionStatus: async () => {
          set({ isLoading: true });
          try {
            // Service-layer type is loosely typed; cast to actual backend shape
            const data =
              (await razorpayService.getSubscriptionStatus()) as unknown as BackendStatusData;

            const status = normalizeStatus(data.status);
            const features: FeatureLimits = data.features ?? FREE_FEATURES;
            const usage = deriveUsageFromFeatures(features);

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
            return dailyRemaining === null || dailyRemaining > 0;
          }

          if (featureKey === "barcode_scan") {
            if (features.unlimited_scans) return true;
            const dailyRemaining = usage.barcode_scan.daily.remaining;
            return dailyRemaining === null || dailyRemaining > 0;
          }

          return false;
        },

        clearSubscription: () => {
          set({
            currentPlan: null,
            subscriptionStatus: null,
            features: FREE_FEATURES,
            usage: EMPTY_USAGE,
            currentPeriodEnd: null,
            isInitialized: false,
          });
        },
      }),
      {
        name: "subscription-storage",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          currentPlan: state.currentPlan,
          subscriptionStatus: state.subscriptionStatus,
          features: state.features,
          usage: state.usage,
          currentPeriodEnd: state.currentPeriodEnd,
          isInitialized: state.isInitialized,
        }),
      },
    ),
  ),
);

export default useSubscriptionStore;
