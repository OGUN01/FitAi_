import { useState, useEffect, useRef } from "react";
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
}

interface LoadedPlans {
  plans: PlanConfig[];
  rows: SubscriptionPlanRow[];
  source: "server" | "fallback";
  errorMessage: string | null;
}

// ============================================================================
// Fallback plans shown when Supabase returns no data (e.g. guest users)
// ============================================================================

const FALLBACK_PLANS: PlanConfig[] = [
  {
    id: "fallback-basic-monthly",
    tier: "basic",
    name: "Basic Plan",
    price_monthly: 299,
    billing_cycle: "monthly",
  },
  {
    id: "fallback-pro-monthly",
    tier: "pro",
    name: "Pro Plan (Monthly)",
    price_monthly: 599,
    billing_cycle: "monthly",
  },
  {
    id: "fallback-pro-yearly",
    tier: "pro",
    name: "Pro Plan (Yearly)",
    // ₹4799/year ÷ 12 ≈ ₹400/mo effective (~33% savings vs ₹599/mo)
    price_monthly: 400,
    billing_cycle: "yearly",
  },
];

async function loadPlansFromServer(): Promise<LoadedPlans> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("active", true)
    .neq("tier", "free")
    .order("price_monthly");

  if (error || !data || data.length === 0) {
    return {
      plans: FALLBACK_PLANS,
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
        name: `${row.name} Plan (Yearly)`,
        price_monthly: Math.round(row.price_yearly / 100 / 12),
        billing_cycle: "yearly",
      });
    }
  }

  return {
    plans: configs.length > 0 ? configs : FALLBACK_PLANS,
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
  const inFlightRef = useRef(false);

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
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPlans = async () => {
      try {
        const loaded = await loadPlansFromServer();

        if (cancelled) return;

        setPlans(loaded.plans);
        setPlanRows(loaded.rows);
        setPlansSource(loaded.source);
        setPlanLoadError(loaded.errorMessage);
      } catch (err) {
        console.warn("[usePaywall] Failed to fetch plans, using fallback:", err);
        if (!cancelled) {
          setPlans(FALLBACK_PLANS);
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
  }, [showPaywall]);

  const dismiss = () => {
    dismissPaywall();
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
    setIsLoading(true);
    try {
      // Parse composite ID: "<uuid>_monthly" or "<uuid>_yearly"
      const plan = plans.find((p) => p.id === planId);
      const billingCycle = plan?.billing_cycle ?? "monthly";
      const originalPlanId = planId.replace(/_monthly$|_yearly$/, "");
      const planRow = planRows.find((row) => row.id === originalPlanId);

      // Guard: fallback plan IDs (used when DB fetch failed) are not real UUIDs.
      // The worker will reject them with a 404. Show a clear error instead.
      if (originalPlanId.startsWith("fallback-")) {
        crossPlatformAlert(
          "Plans Unavailable",
          "We couldn't load the subscription plans from the server. Please check your connection and try again.",
          [{ text: "OK" }],
        );
        setIsLoading(false);
        return false;
      }

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
        name: user.user_metadata?.name || user.email?.split("@")[0] || "",
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

      // Step 5: Refresh subscription store to reflect new status
      await fetchSubscriptionStatus({ preserveExistingOnError: true });

      // Step 6: Success! Dismiss paywall and show success message
      dismiss();
      crossPlatformAlert(
        "🎉 Welcome to Premium!",
        "Your subscription is now active. Enjoy all premium features!",
        [{ text: "Get Started" }],
      );
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);

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
      setIsLoading(false);
    }
  };

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
    triggerPaywall,
  };
};
