export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface SubscriptionStatus {
  isPremium: boolean;
  plan: SubscriptionPlan | null;
  trialExpiryDate?: string;
  isTrialActive?: boolean;
}

export const subscriptionService = {
  isPremiumActive: () => false,
  isTrialActive: () => false,
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => ({
    isPremium: false,
    plan: null,
    isTrialActive: false,
  }),
  initializeSubscription: async () => {},
  initialize: async () => {},
  getCurrentSubscription: async () => null,
  getAvailablePlans: async () => [],
  getSubscriptionAnalytics: async () => ({}),
  purchaseSubscription: async (planId: string) => ({
    success: false,
    error: "Not implemented",
  }),
  restorePurchases: async () => ({
    success: false,
    restored: 0,
    error: "Not implemented",
  }),
  cancelSubscription: async () => ({
    success: false,
    error: "Not implemented",
  }),
};
