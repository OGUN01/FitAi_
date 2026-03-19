type SubscriptionStatus =
  | "active"
  | "authenticated"
  | "paused"
  | "cancelled"
  | "pending"
  | null
  | undefined;

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
}): string {
  const {
    plansUnavailable,
    isAuthenticated,
    selectedPlanPrice,
    billingCycle,
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

  const priceLabel =
    billingCycle === "yearly"
      ? `Subscribe - INR ${selectedPlanPrice * 12}/yr`
      : `Subscribe - INR ${selectedPlanPrice}/mo`;

  return priceLabel;
}
