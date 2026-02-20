import { useState } from "react";
import { Alert } from "react-native";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import razorpayService, {
  RazorpayServiceError,
} from "../services/RazorpayService";
import { supabase } from "../services/supabase";

// Plan configuration for the 3 tiers
const PLAN_CONFIGS = [
  {
    id: process.env.RAZORPAY_PLAN_ID_BASIC_MONTHLY || "",
    tier: "basic" as const,
    name: "Basic Plan",
    price_monthly: 299,
    billing_cycle: "monthly" as const,
  },
  {
    id: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY || "",
    tier: "pro" as const,
    name: "Pro Plan (Monthly)",
    price_monthly: 499,
    billing_cycle: "monthly" as const,
  },
  {
    id: process.env.RAZORPAY_PLAN_ID_PRO_YEARLY || "",
    tier: "pro" as const,
    name: "Pro Plan (Yearly)",
    price_monthly: 333, // 3999/12
    billing_cycle: "yearly" as const,
  },
];

export const usePaywall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | null>(null);

  const { currentPlan, usage, fetchSubscriptionStatus } =
    useSubscriptionStore();

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
   * @param planId - Razorpay plan ID (e.g., plan_xxx)
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  const subscribe = async (planId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Step 1: Create subscription on backend
      const { subscription_id, key_id } =
        await razorpayService.createSubscription(planId);

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

      // Unknown error
      console.error("[usePaywall] Unexpected error:", error);
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
    plans: PLAN_CONFIGS,
    usage,
    subscribe,
    dismiss,
    triggerPaywall,
  };
};
