import { Platform } from "react-native";
import { getProducts, clearProductsIOS } from "react-native-iap";
import { SubscriptionPlans } from "./plans";
import { SubscriptionPurchases } from "./purchases";
import { SubscriptionValidation } from "./validation";
import { SubscriptionStorage } from "./storage";
import {
  SUBSCRIPTION_SKUS,
  SubscriptionPlan,
  SubscriptionStatus,
  PurchaseResult,
  RestoreResult,
  SubscriptionAnalytics,
} from "./types";

class SubscriptionService {
  private isInitialized = false;
  private plans: SubscriptionPlans;
  private purchases: SubscriptionPurchases;
  private validation: SubscriptionValidation;
  private storage: SubscriptionStorage;

  constructor() {
    this.plans = new SubscriptionPlans();
    this.purchases = new SubscriptionPurchases();
    this.validation = new SubscriptionValidation();
    this.storage = new SubscriptionStorage(this.plans);

    console.log(
      "ℹ️ Client-side IAP is disabled. Use backend validation for subscriptions.",
    );
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log(
        "💳 Initializing Subscription Service (backend validation mode)...",
      );

      await this.storage.loadSubscriptionStatus();

      if (!this.storage.getCurrentSubscription().isPremium) {
        this.storage.setCurrentSubscription({
          userId: "current_user",
          status: {
            isActive: false,
            isPremium: false,
            plan: "free",
          },
          lastUpdated: new Date().toISOString(),
          purchaseHistory: [],
        });
      }

      this.isInitialized = true;
      console.log(
        "✅ Subscription service initialized successfully (backend validation mode)",
      );

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize subscription service:", error);
      this.storage.setCurrentSubscription({
        userId: "current_user",
        status: {
          isActive: false,
          isPremium: false,
          plan: "free",
        },
        lastUpdated: new Date().toISOString(),
        purchaseHistory: [],
      });
      this.isInitialized = true;
      return true;
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      const skus = Object.values(SUBSCRIPTION_SKUS);
      console.log("📦 Loading subscription products:", skus);

      const products = await getProducts({ skus });
      this.plans.setProducts(products);

      console.log(
        `✅ Loaded ${products.length} subscription products:`,
        products.map((p) => `${p.title}: ${p.localizedPrice}`),
      );
    } catch (error) {
      console.error("❌ Failed to load products:", error);
      this.plans.setProducts([]);
    }
  }

  getAvailablePlans(): SubscriptionPlan[] {
    return this.plans.getAvailablePlans();
  }

  async purchaseSubscription(planId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.purchases.purchaseSubscription(planId);
  }

  async restorePurchases(): Promise<RestoreResult> {
    return this.purchases.restorePurchases(
      this.storage.updateSubscriptionStatus.bind(this.storage),
    );
  }

  getCurrentSubscription(): SubscriptionStatus {
    return this.storage.getCurrentSubscription();
  }

  isPremiumActive(): boolean {
    return this.storage.isPremiumActive();
  }

  isTrialActive(): boolean {
    return this.storage.isTrialActive();
  }

  async cancelSubscription(): Promise<void> {
    await this.storage.cancelSubscription();
  }

  getSubscriptionAnalytics(): SubscriptionAnalytics {
    return this.storage.getSubscriptionAnalytics();
  }

  async cleanup(): Promise<void> {
    this.purchases.cleanup();

    if (Platform.OS === "ios") {
      await clearProductsIOS();
    }

    console.log("🧹 Subscription service cleaned up");
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
