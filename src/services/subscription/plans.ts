import { Product } from "react-native-iap";
import { SUBSCRIPTION_SKUS, SubscriptionPlan } from "./types";

export class SubscriptionPlans {
  private products: Product[] = [];

  setProducts(products: Product[]): void {
    this.products = products;
  }

  getProducts(): Product[] {
    return this.products;
  }

  getAvailablePlans(): SubscriptionPlan[] {
    const plans: SubscriptionPlan[] = [];

    this.products.forEach((product) => {
      let plan: SubscriptionPlan | null = null;

      switch (product.productId) {
        case SUBSCRIPTION_SKUS.MONTHLY:
          plan = {
            id: product.productId,
            name: "FitAI Premium Monthly",
            description: "Premium features with monthly billing",
            price: product.localizedPrice,
            currency: product.currency,
            period: "monthly",
            freeTrialDays: 7,
            features: this.getPremiumFeatures(),
          };
          break;

        case SUBSCRIPTION_SKUS.YEARLY:
          plan = {
            id: product.productId,
            name: "FitAI Premium Yearly",
            description: "Premium features with yearly billing - Save 50%!",
            price: product.localizedPrice,
            currency: product.currency,
            period: "yearly",
            originalPrice: this.calculateMonthlyEquivalent(
              product.localizedPrice,
            ),
            discount: 50,
            freeTrialDays: 14,
            isPopular: true,
            features: this.getPremiumFeatures(),
          };
          break;

        case SUBSCRIPTION_SKUS.LIFETIME:
          plan = {
            id: product.productId,
            name: "FitAI Premium Lifetime",
            description: "One-time payment for lifetime premium access",
            price: product.localizedPrice,
            currency: product.currency,
            period: "lifetime",
            features: [
              ...this.getPremiumFeatures(),
              "Lifetime updates",
              "Priority support",
            ],
          };
          break;
      }

      if (plan) plans.push(plan);
    });

    return plans.sort((a, b) => {
      const order = { monthly: 0, yearly: 1, lifetime: 2 };
      return order[a.period] - order[b.period];
    });
  }

  private getPremiumFeatures(): string[] {
    return [
      "🚀 Unlimited AI workout generation",
      "🍽️ Advanced meal planning with macros",
      "📊 Detailed analytics and insights",
      "🏆 Exclusive achievements and badges",
      "💪 Personalized coaching recommendations",
      "🎯 Advanced goal setting and tracking",
      "📱 Multiple device sync",
      "🌙 Dark mode and premium themes",
      "📈 Export workout and nutrition data",
      "🔔 Smart notifications and reminders",
      "🎵 Premium workout music integration",
      "📸 Progress photo analysis with AI",
      "🏃‍♂️ Advanced wearable integration",
      "👥 Premium community features",
      "❌ Remove all ads",
    ];
  }

  private calculateMonthlyEquivalent(yearlyPrice: string): string {
    const numericPrice = parseFloat(yearlyPrice.replace(/[^0-9.-]+/g, ""));
    const monthlyEquivalent = (numericPrice * 2) / 12;
    return yearlyPrice.replace(/[0-9.-]+/, monthlyEquivalent.toFixed(2));
  }

  getPlanTypeFromProduct(productId: string): "monthly" | "yearly" | "lifetime" {
    if (productId === SUBSCRIPTION_SKUS.MONTHLY) return "monthly";
    if (productId === SUBSCRIPTION_SKUS.YEARLY) return "yearly";
    if (productId === SUBSCRIPTION_SKUS.LIFETIME) return "lifetime";
    return "monthly";
  }
}
