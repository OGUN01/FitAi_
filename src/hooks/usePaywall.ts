import { useState, useEffect, useRef, useMemo } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import razorpayService, {
  RazorpayServiceError,
} from "../services/RazorpayService";
import { supabase } from "../services/supabase";

// ============================================================================
// Types
// ============================================================================

interface PlanConfig {
  id: string;
  tier: "basic" | "pro";
  name: string;
  price_monthly: number;
  billing_cycle: "monthly" | "yearly";
}

interface SubscriptionPlanRow {
  id: string;
  tier: "free" | "basic" | "pro";
  name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_yearly: string | null;
  ai_generations_per_day: number | null;
  ai_generations_per_month: number | null;
  scans_per_day: number | null;
  unlimited_scans: boolean;
  unlimited_ai: boolean;
  analytics: boolean;
  coaching: boolean;
  active: boolean;
  // P2-11: Server-owned feature-list copy (JSONB array of strings). NULL when
  // no curated copy exists — UI falls back to the app-side TIER_FEATURES map.
  features_list?: string[] | null;
}

interface LoadedPlans {
  plans: PlanConfig[];
  rows: SubscriptionPlanRow[];
  source: "server" | "fallback";
  errorMessage: string | null;
}

// ============================================================================
// Plan loading
//
// NO hardcoded fallback pricing (principle 8): when the server fetch fails or
// returns no priced rows, we return an EMPTY plan list and surface the
// "Plans unavailable" state (with retry) instead of fabricating prices that
// would drift from DB truth.
// ============================================================================

async function loadPlansFromServer(): Promise<LoadedPlans> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("active", true)
    .neq("tier", "free")
    .order("price_monthly");

  if (error || !data || data.length === 0) {
    console.warn(
      "[usePaywall] subscription_plans fetch failed or empty:",
      error?.message ?? "no rows",
    );
    return {
      plans: [],
      rows: [],
      source: "fallback",
      errorMessage:
        error?.message ?? "We couldn't load the current subscription plans.",
    };
  }

  const configs: PlanConfig[] = [];

  for (const row of data as SubscriptionPlanRow[]) {
    const tier = row.tier as "basic" | "pro";

    if (row.price_monthly != null) {
      configs.push({
        id: `${row.id}_monthly`,
        tier,
        name: tier === "basic" ? "Basic Plan" : "Pro Plan",
        price_monthly: Math.round(row.price_monthly / 100),
        billing_cycle: "monthly",
      });
    }

    if (row.price_yearly != null) {
      configs.push({
        id: `${row.id}_yearly`,
        tier,
        // DB row.name already ends in "Plan" (e.g. "Pro Plan") — appending
        // another "Plan" rendered "Pro Plan Plan (Yearly)". Mirror the
        // monthly tier-based naming instead.
        name: tier === "basic" ? "Basic Plan (Yearly)" : "Pro Plan (Yearly)",
        price_monthly: Math.round(row.price_yearly / 100 / 12),
        billing_cycle: "yearly",
      });
    }
  }

  if (configs.length === 0) {
    console.warn(
      "[usePaywall] subscription_plans rows returned without prices; no plans rendered.",
    );
  }

  return {
    plans: configs,
    rows: data as SubscriptionPlanRow[],
    source: configs.length > 0 ? "server" : "fallback",
    errorMessage:
      configs.length > 0
        ? null
        : "We couldn't load the current subscription plans.",
  };
}

// ============================================================================
// Hook
// ============================================================================

export const usePaywall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [planRows, setPlanRows] = useState<SubscriptionPlanRow[]>([]);
  const [plansSource, setPlansSource] = useState<"server" | "fallback">(
    "fallback",
  );
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  // Incremented by reloadPlans() to re-trigger the fetch effect after a
  // failed load (plansSource alone can't re-fire when it stays "fallback").
  const [retryTick, setRetryTick] = useState(0);
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  // P1-19: Track whether plans were successfully loaded from the server. The
  // fallback sets plans.length to 3, which previously caused the mount effect's
  // `plans.length > 0` guard to block all retries — locking the user into
  // stale fallback plans forever. This flag gates the guard on *server*
  // success, not on array length, so a failed fetch can be retried.
  const loadedSuccessfullyRef = useRef(false);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const {
    currentPlan,
    usage,
    fetchSubscriptionStatus,
    showPaywall,
    paywallReason,
    triggerPaywall,
    dismissPaywall,
  } = useSubscriptionStore();

  /**
   * Fetch subscription plans from Supabase on mount.
   * Maps each paid row into one or two PlanConfig entries (monthly + yearly).
   *
   * P1-19: Previously gated on `plans.length > 0`, which permanently blocked
   * refetches after the fallback (3 plans) was applied — even if the failure
   * was transient. Now gated on `loadedSuccessfullyRef` (set only when the
   * server returned real plans), so a failed fetch can be retried on re-mount.
   */
  useEffect(() => {
    if (loadedSuccessfullyRef.current) return; // server plans already loaded
    let cancelled = false;

    const fetchPlans = async () => {
      try {
        const loaded = await loadPlansFromServer();

        if (cancelled) return;

        setPlans(loaded.plans);
        setPlanRows(loaded.rows);
        setPlansSource(loaded.source);
        setPlanLoadError(loaded.errorMessage);
        // Only mark as successfully loaded when the server is the source —
        // fallback data must remain retryable.
        if (loaded.source === "server") {
          loadedSuccessfullyRef.current = true;
        }
      } catch (err) {
        console.warn("[usePaywall] Failed to fetch plans:", err);
        if (!cancelled) {
          setPlans([]);
          setPlanRows([]);
          setPlansSource("fallback");
          setPlanLoadError(
            err instanceof Error
              ? err.message
              : "We couldn't load the current subscription plans.",
          );
        }
      }
    };

    fetchPlans();

    return () => {
      cancelled = true;
    };
    // Deps: plansSource so a "fallback" state triggers a retry on re-mount /
    // dep change; retryTick so an explicit user retry re-runs the fetch.
    // Empty-array `[]` would run once; we want the retry path.
  }, [plansSource, retryTick]);

  const dismiss = () => {
    dismissPaywall();
  };

  /** Retry the plan fetch after a failure (used by the "Plans unavailable"
      banner's retry action). */
  const reloadPlans = () => {
    setPlanLoadError(null);
    setRetryTick((t) => t + 1);
  };

  /**
   * Subscribe to a plan via Razorpay checkout flow
   *
   * @param planId - Supabase UUID of the subscription_plans row
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  const subscribe = async (planId: string): Promise<boolean> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      crossPlatformAlert(
        "Sign In Required",
        "Please sign in before starting a subscription.",
        [{ text: "OK" }],
      );
      return false;
    }

    if (inFlightRef.current) {
      return false;
    }

    inFlightRef.current = true;
    if (isMountedRef.current) setIsLoading(true);
    try {
      // Parse composite ID: "<uuid>_monthly" or "<uuid>_yearly"
      const plan = plans.find((p) => p.id === planId);
      const billingCycle = plan?.billing_cycle ?? "monthly";
      const originalPlanId = planId.replace(/_monthly$|_yearly$/, "");
      const planRow = planRows.find((row) => row.id === originalPlanId);

      // Guard: no plan row means the fetch failed (no fabricated fallback
      // plans are ever rendered) — ask the user to retry instead of
      // transacting against an unknown price.
      if (!planRow) {
        crossPlatformAlert(
          "Plans Unavailable",
          "We couldn't load the current plan details. Please reopen the paywall and try again.",
          [{ text: "OK" }],
        );
        return false;
      }

      // Step 1: Create subscription on backend
      const { subscription_id, key_id } =
        await razorpayService.createSubscription(originalPlanId, billingCycle);

      // Step 2: Get user info for checkout
      const userInfo = {
        name: user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
      };

      // Step 3: Open Razorpay checkout modal (SDK handles payment)
      const result = await razorpayService.openCheckout(
        subscription_id,
        key_id,
        userInfo,
      );

      // Step 4: Verify payment signature on backend
      await razorpayService.verifyPayment(
        result.razorpay_payment_id,
        result.razorpay_subscription_id,
        result.razorpay_signature,
      );

      useSubscriptionStore
        .getState()
        .setOptimisticSubscription({
          tier: planRow.tier,
          name: planRow.name,
          billing_cycle: billingCycle,
          features: {
            ai_generations_per_day: planRow.ai_generations_per_day,
            ai_generations_per_month: planRow.ai_generations_per_month,
            scans_per_day: planRow.scans_per_day,
            unlimited_scans: planRow.unlimited_scans,
            unlimited_ai: planRow.unlimited_ai,
            analytics: planRow.analytics,
            coaching: planRow.coaching,
          },
          status: "authenticated",
        });

      // Step 5: Refresh subscription store to reflect new status.
      // preserveExistingOnError: keep optimistic state if network fails (C8-2).
      // skipDowngrade: prevent webhook lag from overwriting premium state with
      // stale free-tier data before the server has processed the payment (C8-3).
      await fetchSubscriptionStatus({ preserveExistingOnError: true, skipDowngrade: true });

      // Step 6: Success! Dismiss paywall and show success message
      if (!isMountedRef.current) return true;
      dismiss();
      crossPlatformAlert(
        "🎉 Welcome to Premium!",
        "Your subscription is now active. Enjoy all premium features!",
        [{ text: "Get Started" }],
      );
      return true;
    } catch (error) {
      if (isMountedRef.current) setIsLoading(false);

      // Always log the real error for debugging
      console.error("[usePaywall] subscribe error:", error);

      // Handle Razorpay-specific errors
      if (error instanceof RazorpayServiceError) {
        if (error.code === "CHECKOUT_CANCELLED") {
          // User cancelled checkout — NOT an error, just dismiss
          dismiss();
          return false;
        }

        if (error.code === "PAYMENT_FAILED") {
          crossPlatformAlert(
            "Payment Failed",
            error.message ||
              "Your payment could not be processed. Please try again.",
            [{ text: "OK" }],
          );
          return false;
        }

        if (error.code === "API_ERROR") {
          crossPlatformAlert(
            "Payment Verification Failed",
            error.message || "Unable to verify your payment right now. Please try again.",
            [{ text: "OK" }],
          );
          return false;
        }

        if (error.code === "AUTH_ERROR") {
          crossPlatformAlert("Authentication Error", "Please log in and try again.", [
            { text: "OK" },
          ]);
          return false;
        }

        // Generic Razorpay error
        crossPlatformAlert(
          "Error",
          error.message || "Something went wrong. Please try again.",
          [{ text: "OK" }],
        );
        return false;
      }

      // Unknown error — surfaced via Alert below
      crossPlatformAlert(
        "Error",
        "An unexpected error occurred. Please try again later.",
        [{ text: "OK" }],
      );
      return false;
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  // P2-11: Expose server-owned feature copy per tier so PaywallModal can read
  // from the DB instead of the hardcoded TIER_FEATURES map. Maps tier ->
  // features_list (string[]). Empty when plans came from the fallback (UI
  // should keep its app-side fallback in that case).
  const planFeaturesByTier: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const row of planRows) {
      if (row.features_list && row.features_list.length > 0) {
        map[row.tier] = row.features_list;
      }
    }
    return map;
  }, [planRows]);

  return {
    isLoading,
    showPaywall,
    paywallReason,
    currentPlan,
    plans,
    plansSource,
    planLoadError,
    usage,
    subscribe,
    dismiss,
    reloadPlans,
    triggerPaywall,
    // P2-11: server-owned feature copy (read from subscription_plans.features_list).
    // PaywallModal should prefer this over the hardcoded TIER_FEATURES map.
    planFeaturesByTier,
  };
};
