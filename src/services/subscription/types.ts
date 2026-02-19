// Type definitions for subscription service

import { Product, Purchase } from "react-native-iap";
import { Platform } from "react-native";

// Subscription Product IDs
export const SUBSCRIPTION_SKUS = {
  MONTHLY: Platform.select({
    ios: "fitai_premium_monthly",
    android: "fitai_premium_monthly",
    default: "fitai_premium_monthly",
  }) as string,
  YEARLY: Platform.select({
    ios: "fitai_premium_yearly",
    android: "fitai_premium_yearly",
    default: "fitai_premium_yearly",
  }) as string,
  LIFETIME: Platform.select({
    ios: "fitai_premium_lifetime",
    android: "fitai_premium_lifetime",
    default: "fitai_premium_lifetime",
  }) as string,
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  period: "monthly" | "yearly" | "lifetime";
  originalPrice?: string;
  discount?: number;
  features: string[];
  isPopular?: boolean;
  freeTrialDays?: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  plan: "free" | "monthly" | "yearly" | "lifetime";
  expiryDate?: string;
  autoRenewing?: boolean;
  isTrialActive?: boolean;
  trialExpiryDate?: string;
  purchaseDate?: string;
  originalTransactionId?: string;
  receipt?: any;
}

export interface UserSubscription {
  userId: string;
  status: SubscriptionStatus;
  lastUpdated: string;
  purchaseHistory: Purchase[];
}

export interface PurchaseResult {
  success: boolean;
  purchase?: Purchase;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  purchases?: Purchase[];
  error?: string;
}

export interface SubscriptionAnalytics {
  planType: string;
  daysSinceSubscribed: number;
  isAutoRenewing: boolean;
  trialStatus: string;
  totalSpent: number;
}
