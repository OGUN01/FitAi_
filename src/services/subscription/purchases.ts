import {
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  Purchase,
  PurchaseError,
} from "react-native-iap";
import { PurchaseResult, RestoreResult, UserSubscription } from "./types";

export class SubscriptionPurchases {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  setupPurchaseListeners(
    onSuccess: (purchase: Purchase) => Promise<void>,
    onError: (error: PurchaseError) => void,
  ): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log("🛒 Purchase successful:", purchase);
        await onSuccess(purchase);
      },
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error("❌ Purchase failed:", error);
        onError(error);
      },
    );
  }

  async purchaseSubscription(planId: string): Promise<PurchaseResult> {
    try {
      console.log("🛒 Starting purchase for plan:", planId);

      const purchase = await requestPurchase({ sku: planId });
      console.log("✅ Purchase initiated successfully");

      return { success: true, purchase: purchase as any };
    } catch (error: any) {
      console.error("❌ Purchase failed:", error);
      return {
        success: false,
        error: error.message || "Purchase failed",
      };
    }
  }

  async handlePurchaseSuccess(
    purchase: Purchase,
    validatePurchase: (purchase: Purchase) => Promise<boolean>,
    updateSubscriptionStatus: (purchase: Purchase) => Promise<void>,
    savePurchaseToHistory: (purchase: Purchase) => Promise<void>,
  ): Promise<void> {
    try {
      console.log("🎉 Processing successful purchase...");

      const isValid = await validatePurchase(purchase);

      if (isValid) {
        await updateSubscriptionStatus(purchase);
        await savePurchaseToHistory(purchase);
        await finishTransaction({ purchase });

        console.log("✅ Purchase processed successfully!");
      } else {
        console.error("❌ Purchase validation failed");
        await finishTransaction({ purchase });
      }
    } catch (error) {
      console.error("❌ Error processing purchase:", error);
    }
  }

  handlePurchaseError(error: PurchaseError): void {
    console.error("💳 Purchase Error Details:", {
      code: error.code,
      message: error.message,
      debugMessage: error.debugMessage,
    });

    switch (error.code) {
      case "E_USER_CANCELLED":
        console.log("🚫 User cancelled purchase");
        break;
      case "E_ITEM_UNAVAILABLE":
        console.error("❌ Item unavailable for purchase");
        break;
      case "E_NETWORK_ERROR":
        console.error("🌐 Network error during purchase");
        break;
      default:
        console.error("❌ Unknown purchase error:", error.code);
    }
  }

  async restorePurchases(
    updateSubscriptionStatus: (purchase: Purchase) => Promise<void>,
  ): Promise<RestoreResult> {
    try {
      console.log("🔄 Restoring previous purchases...");

      const purchases = await getAvailablePurchases();
      console.log(`📦 Found ${purchases.length} previous purchases`);

      if (purchases.length > 0) {
        const latestPurchase = purchases[purchases.length - 1];
        await updateSubscriptionStatus(latestPurchase);

        return { success: true, purchases };
      }

      return { success: true, purchases: [] };
    } catch (error: any) {
      console.error("❌ Failed to restore purchases:", error);
      return { success: false, error: error.message };
    }
  }

  cleanup(): void {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }
}

function purchaseUpdatedListener(callback: (purchase: Purchase) => void): any {
  return null;
}

function purchaseErrorListener(callback: (error: PurchaseError) => void): any {
  return null;
}
