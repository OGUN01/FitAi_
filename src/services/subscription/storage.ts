import AsyncStorage from "@react-native-async-storage/async-storage";
import { Purchase } from "react-native-iap";
import {
  UserSubscription,
  SubscriptionStatus,
  SubscriptionAnalytics,
} from "./types";
import { SubscriptionPlans } from "./plans";

export class SubscriptionStorage {
  private readonly STORAGE_KEY = "fitai_subscription_status";
  private readonly PURCHASE_HISTORY_KEY = "fitai_purchase_history";
  private currentSubscription: UserSubscription | null = null;
  private plans: SubscriptionPlans;

  constructor(plans: SubscriptionPlans) {
    this.plans = plans;
  }

  async loadSubscriptionStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentSubscription = JSON.parse(stored);
        console.log("✅ Subscription status loaded from storage");
      }
    } catch (error) {
      console.error("❌ Error loading subscription status:", error);
    }
  }

  async saveSubscriptionStatus(): Promise<void> {
    try {
      if (this.currentSubscription) {
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(this.currentSubscription),
        );
        console.log("✅ Subscription status saved to storage");
      }
    } catch (error) {
      console.error("❌ Error saving subscription status:", error);
    }
  }

  async savePurchaseToHistory(purchase: Purchase): Promise<void> {
    try {
      const history = this.currentSubscription?.purchaseHistory || [];
      history.push(purchase);

      if (this.currentSubscription) {
        this.currentSubscription.purchaseHistory = history;
      }

      await AsyncStorage.setItem(
        this.PURCHASE_HISTORY_KEY,
        JSON.stringify(history),
      );
    } catch (error) {
      console.error("❌ Error saving purchase history:", error);
    }
  }

  async updateSubscriptionStatus(purchase: Purchase): Promise<void> {
    const status: SubscriptionStatus = {
      isActive: true,
      isPremium: true,
      plan: this.plans.getPlanTypeFromProduct(purchase.productId),
      purchaseDate: new Date(purchase.transactionDate).toISOString(),
      originalTransactionId:
        purchase.originalTransactionIdentifierIOS || purchase.purchaseToken,
      autoRenewing: purchase.autoRenewingAndroid !== false,
      receipt: purchase,
    };

    if (status.plan === "monthly") {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      status.expiryDate = expiryDate.toISOString();
    } else if (status.plan === "yearly") {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      status.expiryDate = expiryDate.toISOString();
    }

    this.currentSubscription = {
      userId: "current_user",
      status,
      lastUpdated: new Date().toISOString(),
      purchaseHistory: this.currentSubscription?.purchaseHistory || [],
    };

    await this.saveSubscriptionStatus();

    console.log("✅ Subscription status updated:", status.plan);
  }

  getCurrentSubscription(): SubscriptionStatus {
    return (
      this.currentSubscription?.status || {
        isActive: false,
        isPremium: false,
        plan: "free",
      }
    );
  }

  setCurrentSubscription(subscription: UserSubscription): void {
    this.currentSubscription = subscription;
  }

  async cancelSubscription(): Promise<void> {
    console.log(
      "ℹ️ Subscription cancellation must be done through the app store",
    );

    if (this.currentSubscription) {
      this.currentSubscription.status.autoRenewing = false;
      await this.saveSubscriptionStatus();
    }
  }

  isPremiumActive(): boolean {
    const status = this.getCurrentSubscription();

    if (status.plan === "lifetime") return true;
    if (!status.isActive || !status.isPremium) return false;
    if (!status.expiryDate) return false;

    const now = new Date();
    const expiry = new Date(status.expiryDate);

    return now < expiry;
  }

  isTrialActive(): boolean {
    const status = this.getCurrentSubscription();

    if (!status.isTrialActive || !status.trialExpiryDate) return false;

    const now = new Date();
    const trialExpiry = new Date(status.trialExpiryDate);

    return now < trialExpiry;
  }

  getSubscriptionAnalytics(): SubscriptionAnalytics {
    const status = this.getCurrentSubscription();
    const history = this.currentSubscription?.purchaseHistory || [];

    let daysSinceSubscribed = 0;
    if (status.purchaseDate) {
      const purchaseDate = new Date(status.purchaseDate);
      const now = new Date();
      daysSinceSubscribed = Math.floor(
        (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    const totalSpent = history.reduce((sum, purchase) => {
      const price = parseFloat(
        purchase.productId.includes("monthly")
          ? "9.99"
          : purchase.productId.includes("yearly")
            ? "59.99"
            : "199.99",
      );
      return sum + price;
    }, 0);

    return {
      planType: status.plan,
      daysSinceSubscribed,
      isAutoRenewing: status.autoRenewing || false,
      trialStatus: this.isTrialActive()
        ? "active"
        : status.isTrialActive
          ? "expired"
          : "none",
      totalSpent,
    };
  }
}
