type SubscriptionStatus =
  | "active"
  | "authenticated"
  | "paused"
  | "cancelled"
  | "pending"
  | null
  | undefined;

/**
 * Single shared fallback map of per-tier feature copy. Used when the server's
 * subscription_plans.features_list is unavailable. Every subscription UI
 * (paywall, management screen) must read from here — never re-hardcode lists.
 */
export const TIER_FEATURES: Record<string, string[]> = {
  // NOTE: the free-tier AI generation count here MUST match
  // FREE_FEATURES.ai_generations_per_month in src/stores/subscriptionStore.ts
  // (the entitlement actually enforced client-side) and the backend defaults
  // in fitai-workers (subscriptionGate.ts / subscription.ts). This is the
  // copy shown on the Free Plan card on every paywall open — it must never
  // claim more than what is actually granted.
  free: [
    "1 AI generation per month",
    "10 AI food scans per day",
    "Basic progress tracking",
  ],
  basic: [
    "10 AI generations per day",
    "Unlimited AI food scans",
    "Basic analytics dashboard",
  ],
  pro: [
    "Unlimited AI generations",
    "Unlimited AI food scans",
    "Advanced analytics & insights",
    "Personalized AI coaching",
    "Priority support",
    "Export your data",
  ],
};

/**
 * Format a whole-rupee amount with Indian digit grouping (e.g. ₹4,999).
 * Falls back to manual grouping if Intl is unavailable (older Hermes).
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    const digits = String(Math.abs(rounded));
    const grouped =
      digits.length <= 3
        ? digits
        : `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${digits.slice(-3)}`;
    return `${rounded < 0 ? "-" : ""}₹${grouped}`;
  }
}

export function getSubscriptionSubtitle(
  tier: string | undefined,
  status: SubscriptionStatus,
): string {
  if (!tier || tier === "free") {
    return "Free tier - view plans and premium benefits";
  }

  if (status === "cancelled") {
    return "Cancellation scheduled - review billing and access";
  }

  if (status === "paused") {
    return "Paused - resume or adjust your subscription";
  }

  if (status === "authenticated" || status === "pending") {
    return "Payment received - premium access is still being confirmed";
  }

  return `Current tier: ${tier.charAt(0).toUpperCase() + tier.slice(1)} - manage billing and premium access`;
}

export function getPaywallPrimaryLabel(options: {
  plansUnavailable: boolean;
  isAuthenticated: boolean;
  selectedPlanPrice?: number;
  billingCycle?: "monthly" | "yearly";
  /** True when the selected plan's tier AND billing cycle exactly match the
   * user's active subscription — subscribing again would be a duplicate
   * purchase, so the CTA must say so instead of offering to "Subscribe". */
  isCurrentPlan?: boolean;
}): string {
  const {
    plansUnavailable,
    isAuthenticated,
    selectedPlanPrice,
    billingCycle,
    isCurrentPlan,
  } = options;

  if (plansUnavailable) {
    return "Plans unavailable";
  }

  if (!isAuthenticated) {
    return "Sign in to subscribe";
  }

  if (selectedPlanPrice == null || !billingCycle) {
    return "Select a Plan";
  }

  if (isCurrentPlan) {
    return "Current Plan";
  }

  const priceLabel =
    billingCycle === "yearly"
      ? `Subscribe - ${formatINR(selectedPlanPrice * 12)}/yr`
      : `Subscribe - ${formatINR(selectedPlanPrice)}/mo`;

  return priceLabel;
}
