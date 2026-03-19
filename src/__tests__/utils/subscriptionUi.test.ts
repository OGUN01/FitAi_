import {
  getPaywallPrimaryLabel,
  getSubscriptionSubtitle,
} from "../../utils/subscriptionUi";

describe("subscriptionUi", () => {
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
