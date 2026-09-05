/**
 * Regression tests for src/stores/subscriptionStore.ts
 *
 * Covers the "shouldResetMonthly" branch of fetchSubscriptionStatus: when the
 * backend omits live `usage` and a new billing month (or tier change) has
 * started, the store must actually zero the local counters via
 * deriveUsageFromFeatures() rather than copying the previous month's counts
 * forward unchanged. Prior to the fix this left a free-tier user's 1/month
 * AI generation counter stuck at "used" forever after their first use.
 */
jest.mock("../../utils/safeAsyncStorage", () => ({
  // No-op storage so the persist middleware never touches AsyncStorage
  createDebouncedStorage: () => ({
    getItem: async () => null,
    setItem: () => {},
    removeItem: async () => {},
  }),
  safeAsyncStorage: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

jest.mock("../../services/RazorpayService", () => ({
  __esModule: true,
  default: {
    getSubscriptionStatus: jest.fn(),
  },
}));

import { useSubscriptionStore } from "../../stores/subscriptionStore";
import razorpayService from "../../services/RazorpayService";
import { getLocalDateString } from "../../utils/weekUtils";

const getStatusMock = razorpayService.getSubscriptionStatus as jest.Mock;

const FREE_FEATURES = {
  ai_generations_per_day: null,
  ai_generations_per_month: 1,
  scans_per_day: 10,
  unlimited_scans: false,
  unlimited_ai: false,
  analytics: false,
  coaching: false,
};

describe("subscriptionStore.fetchSubscriptionStatus", () => {
  beforeEach(() => {
    getStatusMock.mockReset();
    useSubscriptionStore.getState().clearSubscription();
  });

  describe("shouldResetMonthly branch", () => {
    it("zeroes ai_generation/barcode_scan counters via deriveUsageFromFeatures when the billing month changes and the server omits live usage", async () => {
      // Seed state as if the user already used their 1/month AI generation
      // last month, and the server usage field is absent this time.
      useSubscriptionStore.setState({
        currentPlan: { tier: "free", name: "Free", billing_cycle: null },
        usageResetMonth: "2020-01", // definitely not the current month
        usageResetDay: "2020-01-01",
        usage: {
          ai_generation: {
            daily: { current: 0, limit: null, remaining: null },
            monthly: { current: 1, limit: 1, remaining: 0 },
          },
          barcode_scan: {
            daily: { current: 5, limit: 10, remaining: 5 },
          },
        },
      });

      getStatusMock.mockResolvedValueOnce({
        tier: "free",
        name: "Free",
        status: "active",
        is_active: true,
        billing_cycle: null,
        current_period_end: null,
        razorpay_subscription_id: null,
        features: FREE_FEATURES,
        // usage intentionally omitted — server didn't provide live counts
      });

      await useSubscriptionStore.getState().fetchSubscriptionStatus();

      const { usage, usageIsFresh } = useSubscriptionStore.getState();
      expect(usageIsFresh).toBe(true);
      expect(usage.ai_generation.monthly.current).toBe(0);
      expect(usage.ai_generation.monthly.remaining).toBe(1);
      expect(usage.barcode_scan.daily.current).toBe(0);
      expect(usage.barcode_scan.daily.remaining).toBe(10);
    });

    it("preserves persisted counts within the same billing month/day when usage is omitted (no reset)", async () => {
      useSubscriptionStore.setState({
        currentPlan: { tier: "free", name: "Free", billing_cycle: null },
        // BUG FIX: the store's own getCurrentMonthKey/getCurrentDayKey compare
        // against getLocalDateString (local timezone), not UTC. Seeding with
        // toISOString() (UTC) mismatches whenever the local date has already
        // rolled over past UTC's date (any timezone ahead of UTC, in the
        // evening/night UTC hours) — the store then wrongly thinks a new day
        // has started and resets barcode_scan.daily.current to 0, making this
        // test flaky by time-of-day/timezone rather than by real app behavior.
        usageResetMonth: getLocalDateString(new Date()).slice(0, 7),
        usageResetDay: getLocalDateString(new Date()),
        usage: {
          ai_generation: {
            daily: { current: 0, limit: null, remaining: null },
            monthly: { current: 1, limit: 1, remaining: 0 },
          },
          barcode_scan: {
            daily: { current: 3, limit: 10, remaining: 7 },
          },
        },
      });

      getStatusMock.mockResolvedValueOnce({
        tier: "free",
        name: "Free",
        status: "active",
        is_active: true,
        billing_cycle: null,
        current_period_end: null,
        razorpay_subscription_id: null,
        features: FREE_FEATURES,
      });

      await useSubscriptionStore.getState().fetchSubscriptionStatus();

      const { usage } = useSubscriptionStore.getState();
      // Not a new month/day/tier — counts must NOT be reset.
      expect(usage.ai_generation.monthly.current).toBe(1);
      expect(usage.ai_generation.monthly.remaining).toBe(0);
      expect(usage.barcode_scan.daily.current).toBe(3);
    });
  });
});
