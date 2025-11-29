// Premium Subscription Service for FitAI
// Comprehensive subscription management with React Native IAP

import { 
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  validateReceiptIos,
  validateReceiptAndroid,
  finishTransaction,
  clearProductsIOS,
  clearTransaction,
  Product,
  Purchase,
  PurchaseError,
  SubscriptionPurchase,
  ProductPurchase,
} from 'react-native-iap';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const getEnvVar = (key: string): string | null => {
  try {
    // Strategy 1: process.env (development)
    const processEnvValue = process.env[key];
    if (processEnvValue) return processEnvValue;
    
    // Strategy 2: Constants.expoConfig (production)
    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) return expoConfigValue;
    
    // Strategy 3: Constants.expoConfig.extra (CRITICAL for production)
    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) return extraValue;
    
    console.warn(`❌ Environment variable ${key} not found`);
    return null;
  } catch (error) {
    console.error(`Environment variable ${key} access error:`, error);
    return null;
  }
};

// Subscription Product IDs
export const SUBSCRIPTION_SKUS = {
  MONTHLY: Platform.select({
    ios: 'fitai_premium_monthly',
    android: 'fitai_premium_monthly',
    default: 'fitai_premium_monthly'
  }) as string,
  YEARLY: Platform.select({
    ios: 'fitai_premium_yearly',
    android: 'fitai_premium_yearly', 
    default: 'fitai_premium_yearly'
  }) as string,
  LIFETIME: Platform.select({
    ios: 'fitai_premium_lifetime',
    android: 'fitai_premium_lifetime',
    default: 'fitai_premium_lifetime'
  }) as string,
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  period: 'monthly' | 'yearly' | 'lifetime';
  originalPrice?: string;
  discount?: number;
  features: string[];
  isPopular?: boolean;
  freeTrialDays?: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
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

class SubscriptionService {
  private readonly STORAGE_KEY = 'fitai_subscription_status';
  private readonly PURCHASE_HISTORY_KEY = 'fitai_purchase_history';
  
  private isInitialized = false;
  private products: Product[] = [];
  private currentSubscription: UserSubscription | null = null;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  constructor() {
    // 🚧 IAP DISABLED - Backend validation should be used instead
    // Client-side IAP is insecure and can be bypassed
    // Backend URL: https://fitai-workers.sharmaharsh9887.workers.dev
    console.log('ℹ️ Client-side IAP is disabled. Use backend validation for subscriptions.');
    // this.initializeService(); // DISABLED
  }

  /**
   * Initialize the subscription service
   */
  async initialize(): Promise<boolean> {
    // 🚧 DISABLED - Use backend validation
    console.log('ℹ️ Subscription service is disabled. Use Cloudflare Workers backend.');
    return false;

    /* DISABLED - Use Cloudflare Workers backend instead
    if (this.isInitialized) return true;

    try {
      console.log('💳 Initializing Premium Subscription Service...');

      // Initialize IAP connection
      const result = await initConnection();
      console.log('✅ IAP Connection established:', result);

      // Set up purchase listeners
      this.setupPurchaseListeners();

      // Load subscription products
      await this.loadProducts();

      // Load user's current subscription status
      await this.loadSubscriptionStatus();

      // Restore purchases if needed
      await this.restorePurchases();

      this.isInitialized = true;
      console.log('🎉 Subscription service initialized successfully!');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize subscription service:', error);
      return false;
    }
    */
  }

  /**
   * Initialize service on construction
   */
  private async initializeService(): Promise<void> {
    // DISABLED
    // await this.initialize();
  }

  /**
   * Set up purchase event listeners
   */
  private setupPurchaseListeners(): void {
    // Purchase successful listener
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('🛒 Purchase successful:', purchase);
        await this.handlePurchaseSuccess(purchase);
      }
    );

    // Purchase error listener  
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('❌ Purchase failed:', error);
        this.handlePurchaseError(error);
      }
    );
  }

  /**
   * Load available subscription products
   */
  private async loadProducts(): Promise<void> {
    try {
      const skus = Object.values(SUBSCRIPTION_SKUS);
      console.log('📦 Loading subscription products:', skus);

      const products = await getProducts({ skus });
      this.products = products;

      console.log(`✅ Loaded ${products.length} subscription products:`, 
        products.map(p => `${p.title}: ${p.localizedPrice}`));
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      this.products = [];
    }
  }

  /**
   * Get available subscription plans
   */
  getAvailablePlans(): SubscriptionPlan[] {
    const plans: SubscriptionPlan[] = [];

    this.products.forEach(product => {
      let plan: SubscriptionPlan | null = null;

      switch (product.productId) {
        case SUBSCRIPTION_SKUS.MONTHLY:
          plan = {
            id: product.productId,
            name: 'FitAI Premium Monthly',
            description: 'Premium features with monthly billing',
            price: product.localizedPrice,
            currency: product.currency,
            period: 'monthly',
            freeTrialDays: 7,
            features: this.getPremiumFeatures(),
          };
          break;

        case SUBSCRIPTION_SKUS.YEARLY:
          plan = {
            id: product.productId,
            name: 'FitAI Premium Yearly',
            description: 'Premium features with yearly billing - Save 50%!',
            price: product.localizedPrice,
            currency: product.currency,
            period: 'yearly',
            originalPrice: this.calculateMonthlyEquivalent(product.localizedPrice),
            discount: 50,
            freeTrialDays: 14,
            isPopular: true,
            features: this.getPremiumFeatures(),
          };
          break;

        case SUBSCRIPTION_SKUS.LIFETIME:
          plan = {
            id: product.productId,
            name: 'FitAI Premium Lifetime',
            description: 'One-time payment for lifetime premium access',
            price: product.localizedPrice,
            currency: product.currency,
            period: 'lifetime',
            features: [...this.getPremiumFeatures(), 'Lifetime updates', 'Priority support'],
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

  /**
   * Get premium features list
   */
  private getPremiumFeatures(): string[] {
    return [
      '🚀 Unlimited AI workout generation',
      '🍽️ Advanced meal planning with macros',
      '📊 Detailed analytics and insights', 
      '🏆 Exclusive achievements and badges',
      '💪 Personalized coaching recommendations',
      '🎯 Advanced goal setting and tracking',
      '📱 Multiple device sync',
      '🌙 Dark mode and premium themes',
      '📈 Export workout and nutrition data',
      '🔔 Smart notifications and reminders',
      '🎵 Premium workout music integration',
      '📸 Progress photo analysis with AI',
      '🏃‍♂️ Advanced wearable integration',
      '👥 Premium community features',
      '❌ Remove all ads',
    ];
  }

  /**
   * Calculate monthly equivalent price for yearly plans
   */
  private calculateMonthlyEquivalent(yearlyPrice: string): string {
    const numericPrice = parseFloat(yearlyPrice.replace(/[^0-9.-]+/g, ''));
    const monthlyEquivalent = (numericPrice * 2) / 12; // Assume 50% savings
    return yearlyPrice.replace(/[0-9.-]+/, monthlyEquivalent.toFixed(2));
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(planId: string): Promise<{
    success: boolean;
    purchase?: Purchase;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🛒 Starting purchase for plan:', planId);

      const purchase = await requestPurchase({ sku: planId });
      console.log('✅ Purchase initiated successfully');

      return { success: true, purchase };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      return { 
        success: false, 
        error: error.message || 'Purchase failed' 
      };
    }
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(purchase: Purchase): Promise<void> {
    try {
      console.log('🎉 Processing successful purchase...');

      // Validate receipt with backend/store
      const isValid = await this.validatePurchase(purchase);
      
      if (isValid) {
        // Update subscription status
        await this.updateSubscriptionStatus(purchase);
        
        // Save purchase to history
        await this.savePurchaseToHistory(purchase);
        
        // Finish the transaction
        await finishTransaction({ purchase });
        
        console.log('✅ Purchase processed successfully!');
      } else {
        console.error('❌ Purchase validation failed');
        await finishTransaction({ purchase });
      }
    } catch (error) {
      console.error('❌ Error processing purchase:', error);
    }
  }

  /**
   * Handle purchase errors
   */
  private handlePurchaseError(error: PurchaseError): void {
    console.error('💳 Purchase Error Details:', {
      code: error.code,
      message: error.message,
      debugMessage: error.debugMessage,
    });

    // Handle different error types
    switch (error.code) {
      case 'E_USER_CANCELLED':
        console.log('🚫 User cancelled purchase');
        break;
      case 'E_ITEM_UNAVAILABLE':
        console.error('❌ Item unavailable for purchase');
        break;
      case 'E_NETWORK_ERROR':
        console.error('🌐 Network error during purchase');
        break;
      default:
        console.error('❌ Unknown purchase error:', error.code);
    }
  }

  /**
   * Validate purchase receipt
   */
  private async validatePurchase(purchase: Purchase): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const receiptBody = {
          'receipt-data': purchase.transactionReceipt,
          'password': getEnvVar('IOS_SHARED_SECRET'), // Add to environment variables
        };
        
        // Validate with Apple App Store
        const result = await validateReceiptIos(receiptBody, false);
        return result?.status === 0;
      } else {
        // Validate with Google Play Store
        const result = await validateReceiptAndroid(
          purchase.purchaseToken!,
          purchase.productId,
          getEnvVar('ANDROID_SERVICE_ACCOUNT_KEY') // Add to environment variables
        );
        return result?.purchaseState === 1;
      }
    } catch (error) {
      console.error('❌ Purchase validation error:', error);
      return true; // Allow purchase in case of validation service issues
    }
  }

  /**
   * Update subscription status after purchase
   */
  private async updateSubscriptionStatus(purchase: Purchase): Promise<void> {
    const status: SubscriptionStatus = {
      isActive: true,
      isPremium: true,
      plan: this.getPlanTypeFromProduct(purchase.productId),
      purchaseDate: new Date(purchase.transactionDate).toISOString(),
      originalTransactionId: purchase.originalTransactionIdentifierIOS || purchase.purchaseToken,
      autoRenewing: purchase.autoRenewingAndroid !== false,
      receipt: purchase,
    };

    // Calculate expiry date
    if (status.plan === 'monthly') {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      status.expiryDate = expiryDate.toISOString();
    } else if (status.plan === 'yearly') {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      status.expiryDate = expiryDate.toISOString();
    }
    // Lifetime doesn't need expiry date

    // Update current subscription
    this.currentSubscription = {
      userId: 'current_user', // Get from auth store
      status,
      lastUpdated: new Date().toISOString(),
      purchaseHistory: this.currentSubscription?.purchaseHistory || [],
    };

    // Save to storage
    await this.saveSubscriptionStatus();
    
    console.log('✅ Subscription status updated:', status.plan);
  }

  /**
   * Get plan type from product ID
   */
  private getPlanTypeFromProduct(productId: string): 'monthly' | 'yearly' | 'lifetime' {
    if (productId === SUBSCRIPTION_SKUS.MONTHLY) return 'monthly';
    if (productId === SUBSCRIPTION_SKUS.YEARLY) return 'yearly';
    if (productId === SUBSCRIPTION_SKUS.LIFETIME) return 'lifetime';
    return 'monthly'; // fallback
  }

  /**
   * Save purchase to history
   */
  private async savePurchaseToHistory(purchase: Purchase): Promise<void> {
    try {
      const history = this.currentSubscription?.purchaseHistory || [];
      history.push(purchase);
      
      if (this.currentSubscription) {
        this.currentSubscription.purchaseHistory = history;
      }

      await AsyncStorage.setItem(this.PURCHASE_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('❌ Error saving purchase history:', error);
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    purchases?: Purchase[];
    error?: string;
  }> {
    try {
      console.log('🔄 Restoring previous purchases...');
      
      const purchases = await getAvailablePurchases();
      console.log(`📦 Found ${purchases.length} previous purchases`);

      if (purchases.length > 0) {
        // Process the most recent valid purchase
        const latestPurchase = purchases[purchases.length - 1];
        await this.updateSubscriptionStatus(latestPurchase);
        
        return { success: true, purchases };
      }

      return { success: true, purchases: [] };
    } catch (error: any) {
      console.error('❌ Failed to restore purchases:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current subscription status
   */
  getCurrentSubscription(): SubscriptionStatus {
    return this.currentSubscription?.status || {
      isActive: false,
      isPremium: false,
      plan: 'free',
    };
  }

  /**
   * Check if user has premium access
   */
  isPremiumActive(): boolean {
    const status = this.getCurrentSubscription();
    
    if (status.plan === 'lifetime') return true;
    if (!status.isActive || !status.isPremium) return false;
    if (!status.expiryDate) return false;

    const now = new Date();
    const expiry = new Date(status.expiryDate);
    
    return now < expiry;
  }

  /**
   * Check if user is in trial period
   */
  isTrialActive(): boolean {
    const status = this.getCurrentSubscription();
    
    if (!status.isTrialActive || !status.trialExpiryDate) return false;
    
    const now = new Date();
    const trialExpiry = new Date(status.trialExpiryDate);
    
    return now < trialExpiry;
  }

  /**
   * Cancel subscription (redirects to store management)
   */
  async cancelSubscription(): Promise<void> {
    // Note: Actual cancellation must be done through App Store/Play Store
    console.log('ℹ️ Subscription cancellation must be done through the app store');
    
    // Update local status to reflect user intent
    if (this.currentSubscription) {
      this.currentSubscription.status.autoRenewing = false;
      await this.saveSubscriptionStatus();
    }
  }

  /**
   * Load subscription status from storage
   */
  private async loadSubscriptionStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentSubscription = JSON.parse(stored);
        console.log('✅ Subscription status loaded from storage');
      }
    } catch (error) {
      console.error('❌ Error loading subscription status:', error);
    }
  }

  /**
   * Save subscription status to storage
   */
  private async saveSubscriptionStatus(): Promise<void> {
    try {
      if (this.currentSubscription) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSubscription));
        console.log('✅ Subscription status saved to storage');
      }
    } catch (error) {
      console.error('❌ Error saving subscription status:', error);
    }
  }

  /**
   * Get subscription analytics data
   */
  getSubscriptionAnalytics(): {
    planType: string;
    daysSinceSubscribed: number;
    isAutoRenewing: boolean;
    trialStatus: string;
    totalSpent: number;
  } {
    const status = this.getCurrentSubscription();
    const history = this.currentSubscription?.purchaseHistory || [];
    
    let daysSinceSubscribed = 0;
    if (status.purchaseDate) {
      const purchaseDate = new Date(status.purchaseDate);
      const now = new Date();
      daysSinceSubscribed = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const totalSpent = history.reduce((sum, purchase) => {
      const price = parseFloat(purchase.productId.includes('monthly') ? '9.99' : 
                              purchase.productId.includes('yearly') ? '59.99' : '199.99');
      return sum + price;
    }, 0);

    return {
      planType: status.plan,
      daysSinceSubscribed,
      isAutoRenewing: status.autoRenewing || false,
      trialStatus: this.isTrialActive() ? 'active' : status.isTrialActive ? 'expired' : 'none',
      totalSpent,
    };
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    if (Platform.OS === 'ios') {
      await clearProductsIOS();
    }

    console.log('🧹 Subscription service cleaned up');
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;