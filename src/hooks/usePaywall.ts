import { useState, useEffect } from "react";
import { Alert } from "react-native";
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
  unlimited_scans: boolean;
  unlimited_ai: boolean;
  analytics: boolean;
  coaching: boolean;
  active: boolean;
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
    price_monthly: 499,
    billing_cycle: "yearly",
  },
];

// ============================================================================
// Hook
// ============================================================================

export const usePaywall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>([]);

  const { currentPlan, usage, fetchSubscriptionStatus } =
    useSubscriptionStore();

  /**
   * Fetch subscription plans from Supabase on mount.
   * Maps each paid row into one or two PlanConfig entries (monthly + yearly).
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .neq("tier", "free")
        .order("price_monthly");

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setPlans(FALLBACK_PLANS);
        return;
      }

      const configs: PlanConfig[] = [];

      for (const row of data as SubscriptionPlanRow[]) {
        const tier = row.tier as "basic" | "pro";

        // Monthly entry (always present for paid plans)
        if (row.price_monthly != null) {
          configs.push({
            id: `${row.id}_monthly`,
            tier,
            name: tier === "basic" ? "Basic Plan" : "Pro Plan (Monthly)",
            price_monthly: Math.round(row.price_monthly / 100),
            billing_cycle: "monthly",
          });
        }

        // Yearly entry (only if the plan offers yearly pricing)
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

      setPlans(configs.length > 0 ? configs : FALLBACK_PLANS);
    };

    fetchPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Trigger paywall display with a specific upgrade reason
   */
  const triggerPaywall = (reason: string) => {
    setPaywallReason(reason);
    setShowPaywall(true);
  };

  /**
   * Dismiss paywall modal
   */
  const dismiss = () => {
    setShowPaywall(false);
    setPaywallReason(null);
  };

  /**
   * Subscribe to a plan via Razorpay checkout flow
   *
   * @param planId - Supabase UUID of the subscription_plans row
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  const subscribe = async (planId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Parse composite ID: "<uuid>_monthly" or "<uuid>_yearly"
      const plan = plans.find((p) => p.id === planId);
      const billingCycle = plan?.billing_cycle ?? "monthly";
      const originalPlanId = planId.replace(/_monthly$|_yearly$/, "");

      // Step 1: Create subscription on backend
      const { subscription_id, key_id } =
        await razorpayService.createSubscription(originalPlanId, billingCycle);

      // Step 2: Get user info for checkout
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

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
      const verified = await razorpayService.verifyPayment(
        result.razorpay_payment_id,
        result.razorpay_subscription_id,
        result.razorpay_signature,
      );

      if (!verified) {
        Alert.alert(
          "Payment Verification Failed",
          "Unable to verify your payment. Please contact support.",
          [{ text: "OK" }],
        );
        setIsLoading(false);
        return false;
      }

      // Step 5: Refresh subscription store to reflect new status
      await fetchSubscriptionStatus();

      // Step 6: Success! Dismiss paywall and show success message
      dismiss();
      Alert.alert(
        "🎉 Welcome to Premium!",
        "Your subscription is now active. Enjoy all premium features!",
        [{ text: "Get Started" }],
      );
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);

      // Handle Razorpay-specific errors
      if (error instanceof RazorpayServiceError) {
        if (error.code === "CHECKOUT_CANCELLED") {
          // User cancelled checkout — NOT an error, just dismiss
          dismiss();
          return false;
        }

        if (error.code === "PAYMENT_FAILED") {
          Alert.alert(
            "Payment Failed",
            error.message ||
              "Your payment could not be processed. Please try again.",
            [{ text: "OK" }],
          );
          return false;
        }

        if (error.code === "AUTH_ERROR") {
          Alert.alert("Authentication Error", "Please log in and try again.", [
            { text: "OK" },
          ]);
          return false;
        }

        // Generic Razorpay error
        Alert.alert(
          "Error",
          error.message || "Something went wrong. Please try again.",
          [{ text: "OK" }],
        );
        return false;
      }

      // Unknown error — surfaced via Alert below
      Alert.alert(
        "Error",
        "An unexpected error occurred. Please try again later.",
        [{ text: "OK" }],
      );
      return false;
    }
  };

  return {
    isLoading,
    showPaywall,
    paywallReason,
    currentPlan,
    plans,
    usage,
    subscribe,
    dismiss,
    triggerPaywall,
  };
};
