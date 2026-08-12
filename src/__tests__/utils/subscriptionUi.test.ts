import {
  getPaywallPrimaryLabel,
  getSubscriptionSubtitle,
  TIER_FEATURES,
} from "../../utils/subscriptionUi";

describe("subscriptionUi", () => {
  it("advertises the free tier's real AI generation limit (1/month), not a fabricated higher number", () => {
    // Regression guard for the money-screen false-claim bug: the free plan
    // card must never promise more AI generations than
    // FREE_FEATURES.ai_generations_per_month in subscriptionStore.ts (and
    // the backend defaults) actually grant.
    const freeFeatures = TIER_FEATURES.free;
    expect(freeFeatures.some((f) => /\b1 AI generation\b/i.test(f))).toBe(
      true,
    );
    expect(freeFeatures.some((f) => /\b10 AI generations\b/i.test(f))).toBe(
      false,
    );
  });

  it("marks free tier as upgradeable instead of manageable", () => {
    expect(getSubscriptionSubtitle("free", null)).toBe(
      "Free tier - view plans and premium benefits",
    );
  });

  it("surfaces pending premium confirmation honestly", () => {
    expect(getSubscriptionSubtitle("pro", "authenticated")).toBe(
      "Payment received - premium access is still being confirmed",
    );
  });

  it("disables purchase language when live plans are unavailable", () => {
    expect(
      getPaywallPrimaryLabel({
        plansUnavailable: true,
        isAuthenticated: true,
        selectedPlanPrice: 299,
        billingCycle: "monthly",
      }),
    ).toBe("Plans unavailable");
  });

  it("tells signed-out users to sign in before subscribing", () => {
    expect(
      getPaywallPrimaryLabel({
        plansUnavailable: false,
        isAuthenticated: false,
        selectedPlanPrice: 299,
        billingCycle: "monthly",
      }),
    ).toBe("Sign in to subscribe");
  });
});
