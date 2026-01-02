// Subscription Store for FitAI
// Zustand store for managing premium subscription state

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { subscriptionService, SubscriptionPlan, SubscriptionStatus } from '../services/SubscriptionService';

// Helper functions
const calculatePremiumFeatures = (status: SubscriptionStatus) => {
  const isPremium = subscriptionService.isPremiumActive() || subscriptionService.isTrialActive();
  
  return {
    unlimitedAI: isPremium,
    advancedAnalytics: isPremium,
    customThemes: isPremium,
    exportData: isPremium,
    prioritySupport: isPremium,
    removeAds: isPremium,
    premiumAchievements: isPremium,
    advancedWorkouts: isPremium,
    multiDeviceSync: isPremium,
    premiumCommunity: isPremium,
  };
};

const calculateTrialInfo = (status: SubscriptionStatus) => {
  const isTrialActive = subscriptionService.isTrialActive();
  let daysRemaining = 0;
  
  if (isTrialActive && status.trialExpiryDate) {
    const now = new Date();
    const expiry = new Date(status.trialExpiryDate);
    const timeDiff = expiry.getTime() - now.getTime();
    daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }
  
  return {
    isEligible: !status.isPremium && !isTrialActive,
    daysRemaining: Math.max(0, daysRemaining),
    hasUsedTrial: status.isTrialActive === false,
  };
};

interface SubscriptionStore {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  subscriptionStatus: SubscriptionStatus;
  availablePlans: SubscriptionPlan[];
  showPaywall: boolean;
  isPurchasing: boolean;
  purchaseError: string | null;
  
  // Premium Feature Flags
  premiumFeatures: {
    unlimitedAI: boolean;
    advancedAnalytics: boolean;
    customThemes: boolean;
    exportData: boolean;
    prioritySupport: boolean;
    removeAds: boolean;
    premiumAchievements: boolean;
    advancedWorkouts: boolean;
    multiDeviceSync: boolean;
    premiumCommunity: boolean;
  };
  
  // Trial Management
  trialInfo: {
    isEligible: boolean;
    daysRemaining: number;
    hasUsedTrial: boolean;
    // Additional properties used in ProfileScreen
    nextBillingDate?: string;
    amount?: number;
  };
  
  // Actions
  initialize: () => Promise<void>;
  loadPlans: () => Promise<void>;
  purchasePlan: (planId: string) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<void>;
  showPaywallModal: (feature?: string) => void;
  hidePaywallModal: () => void;
  checkPremiumAccess: (feature: string) => boolean;
  refreshSubscriptionStatus: () => Promise<void>;
  getSubscriptionAnalytics: () => any;
  
  // Premium Feature Checks
  canUseUnlimitedAI: () => boolean;
  canAccessAdvancedAnalytics: () => boolean;
  canCustomizeThemes: () => boolean;
  canExportData: () => boolean;
  canAccessPremiumAchievements: () => boolean;
  isAdFree: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    isLoading: false,
    isInitialized: false,
    subscriptionStatus: {
      isActive: false,
      isPremium: false,
      plan: 'free',
    },
    availablePlans: [],
    showPaywall: false,
    isPurchasing: false,
    purchaseError: null,
    
    premiumFeatures: {
      unlimitedAI: false,
      advancedAnalytics: false,
      customThemes: false,
      exportData: false,
      prioritySupport: false,
      removeAds: false,
      premiumAchievements: false,
      advancedWorkouts: false,
      multiDeviceSync: false,
      premiumCommunity: false,
    },
    
    trialInfo: {
      isEligible: true,
      daysRemaining: 0,
      hasUsedTrial: false,
    },

    // Initialize subscription system
    initialize: async () => {
      set({ isLoading: true });

      try {
        console.log('💳 Initializing subscription store...');

        // Initialize subscription service
        await subscriptionService.initialize();

        // Load current subscription status
        const status = subscriptionService.getCurrentSubscription();

        // Load available plans (may be empty in backend validation mode)
        await get().loadPlans();

        // Update premium features based on status
        const premiumFeatures = calculatePremiumFeatures(status);

        // Calculate trial info
        const trialInfo = calculateTrialInfo(status);

        set({
          isInitialized: true,
          subscriptionStatus: status,
          premiumFeatures,
          trialInfo,
          isLoading: false,
        });

        console.log(`✅ Subscription store initialized - Plan: ${status.plan}`);

      } catch (error) {
        console.error('❌ Error initializing subscription store:', error);
        // Set default free tier on error but still mark as initialized
        set({
          isLoading: false,
          isInitialized: true,
          subscriptionStatus: {
            isActive: false,
            isPremium: false,
            plan: 'free',
          },
          premiumFeatures: {
            unlimitedAI: false,
            advancedAnalytics: false,
            customThemes: false,
            exportData: false,
            prioritySupport: false,
            removeAds: false,
            premiumAchievements: false,
            advancedWorkouts: false,
            multiDeviceSync: false,
            premiumCommunity: false,
          },
          trialInfo: {
            isEligible: true,
            daysRemaining: 0,
            hasUsedTrial: false,
          },
        });
      }
    },

    // Load available subscription plans
    loadPlans: async () => {
      try {
        const plans = subscriptionService.getAvailablePlans();
        set({ availablePlans: plans });
        console.log(`📦 Loaded ${plans.length} subscription plans`);
      } catch (error) {
        console.error('❌ Error loading subscription plans:', error);
        set({ availablePlans: [] });
      }
    },

    // Purchase a subscription plan
    purchasePlan: async (planId: string) => {
      set({ isPurchasing: true, purchaseError: null });
      
      try {
        console.log('🛒 Starting purchase for plan:', planId);
        
        const result = await subscriptionService.purchaseSubscription(planId);
        
        if (result.success) {
          // Refresh subscription status
          await get().refreshSubscriptionStatus();
          
          set({ 
            isPurchasing: false,
            showPaywall: false,
          });
          
          console.log('🎉 Purchase completed successfully!');
          return { success: true };
        } else {
          set({ 
            isPurchasing: false,
            purchaseError: result.error || 'Purchase failed',
          });
          
          return { success: false, error: result.error };
        }
        
      } catch (error: any) {
        const errorMessage = error.message || 'Purchase failed';
        set({ 
          isPurchasing: false,
          purchaseError: errorMessage,
        });
        
        console.error('❌ Purchase error:', error);
        return { success: false, error: errorMessage };
      }
    },

    // Restore previous purchases
    restorePurchases: async () => {
      set({ isLoading: true });
      
      try {
        console.log('🔄 Restoring purchases...');
        
        const result = await subscriptionService.restorePurchases();
        
        if (result.success) {
          // Refresh subscription status
          await get().refreshSubscriptionStatus();
          console.log('✅ Purchases restored successfully');
        } else {
          console.error('❌ Failed to restore purchases:', result.error);
        }
        
      } catch (error) {
        console.error('❌ Error restoring purchases:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    // Show paywall modal
    showPaywallModal: (feature?: string) => {
      console.log('🚧 Showing paywall for feature:', feature || 'general');
      set({ showPaywall: true, purchaseError: null });
    },

    // Hide paywall modal
    hidePaywallModal: () => {
      set({ showPaywall: false, purchaseError: null });
    },

    // Check if user has premium access to a feature
    checkPremiumAccess: (feature: string) => {
      const state = get();
      const { subscriptionStatus, premiumFeatures } = state;
      
      // Always allow access in trial
      if (subscriptionService.isTrialActive()) {
        return true;
      }
      
      // Check premium status
      if (!subscriptionService.isPremiumActive()) {
        return false;
      }
      
      // Check specific feature access
      switch (feature) {
        case 'unlimited_ai':
          return premiumFeatures.unlimitedAI;
        case 'advanced_analytics':
          return premiumFeatures.advancedAnalytics;
        case 'custom_themes':
          return premiumFeatures.customThemes;
        case 'export_data':
          return premiumFeatures.exportData;
        case 'premium_achievements':
          return premiumFeatures.premiumAchievements;
        case 'remove_ads':
          return premiumFeatures.removeAds;
        case 'advanced_workouts':
          return premiumFeatures.advancedWorkouts;
        case 'multi_device_sync':
          return premiumFeatures.multiDeviceSync;
        case 'premium_community':
          return premiumFeatures.premiumCommunity;
        default:
          return subscriptionStatus.isPremium;
      }
    },

    // Refresh subscription status
    refreshSubscriptionStatus: async () => {
      try {
        const status = subscriptionService.getCurrentSubscription();
        const premiumFeatures = calculatePremiumFeatures(status);
        const trialInfo = calculateTrialInfo(status);
        
        set({
          subscriptionStatus: status,
          premiumFeatures,
          trialInfo,
        });
        
        console.log('🔄 Subscription status refreshed');
      } catch (error) {
        console.error('❌ Error refreshing subscription status:', error);
      }
    },

    // Get subscription analytics
    getSubscriptionAnalytics: () => {
      return subscriptionService.getSubscriptionAnalytics();
    },


    // Premium feature helper methods
    canUseUnlimitedAI: () => {
      return get().checkPremiumAccess('unlimited_ai');
    },

    canAccessAdvancedAnalytics: () => {
      return get().checkPremiumAccess('advanced_analytics');
    },

    canCustomizeThemes: () => {
      return get().checkPremiumAccess('custom_themes');
    },

    canExportData: () => {
      return get().checkPremiumAccess('export_data');
    },

    canAccessPremiumAchievements: () => {
      return get().checkPremiumAccess('premium_achievements');
    },

    isAdFree: () => {
      return get().checkPremiumAccess('remove_ads');
    },
  }))
);

// Subscription management helpers
export const subscriptionHelpers = {
  // Check if feature requires premium and show paywall if needed
  requiresPremium: (feature: string, showPaywall = true) => {
    const store = useSubscriptionStore.getState();
    const hasAccess = store.checkPremiumAccess(feature);
    
    if (!hasAccess && showPaywall) {
      store.showPaywallModal(feature);
    }
    
    return hasAccess;
  },

  // Track premium feature usage for analytics
  trackPremiumFeatureUsage: (feature: string, usage: any = {}) => {
    const store = useSubscriptionStore.getState();
    const hasAccess = store.checkPremiumAccess(feature);
    
    console.log(`📊 Premium feature usage - ${feature}:`, {
      hasAccess,
      isPremium: store.subscriptionStatus.isPremium,
      plan: store.subscriptionStatus.plan,
      ...usage,
    });
    
    // Here you could send analytics to your backend
    return hasAccess;
  },

  // Get feature limit for free users
  getFeatureLimit: (feature: string): number => {
    const limits: Record<string, number> = {
      ai_generations_daily: 3,
      meal_plans_weekly: 2,
      workout_exports_monthly: 1,
      progress_photos: 10,
      custom_exercises: 5,
    };
    
    return limits[feature] || 0;
  },

  // Check if user has reached free tier limit
  hasReachedLimit: (feature: string, currentUsage: number): boolean => {
    const store = useSubscriptionStore.getState();
    
    if (store.checkPremiumAccess(feature)) {
      return false; // No limits for premium users
    }
    
    const limit = subscriptionHelpers.getFeatureLimit(feature);
    return currentUsage >= limit;
  },
};

export default useSubscriptionStore;