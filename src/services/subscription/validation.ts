import { Platform } from "react-native";
import {
  validateReceiptIos,
  validateReceiptAndroid,
  Purchase,
} from "react-native-iap";
import Constants from "expo-constants";

const getEnvVar = (key: string): string | null => {
  try {
    const processEnvValue = process.env[key];
    if (processEnvValue) return processEnvValue;

    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) return expoConfigValue;

    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) return extraValue;

    console.warn(`❌ Environment variable ${key} not found`);
    return null;
  } catch (error) {
    console.error(`Environment variable ${key} access error:`, error);
    return null;
  }
};

export class SubscriptionValidation {
  async validatePurchase(purchase: Purchase): Promise<boolean> {
    try {
      if (Platform.OS === "ios") {
        const receiptBody = {
          "receipt-data": purchase.transactionReceipt,
          password: getEnvVar("IOS_SHARED_SECRET"),
        };

        const result = await validateReceiptIos({
          receiptBody,
          isTest: false,
        });
        return result?.status === 0;
      } else {
        const result = await validateReceiptAndroid({
          packageName: "com.fitai.app",
          productId: purchase.productId || "",
          productToken: (purchase.purchaseToken ?? "") as string,
          accessToken: getEnvVar("ANDROID_SERVICE_ACCOUNT_KEY") as string,
          isSub: true,
        });
        return result?.purchaseState === 1;
      }
    } catch (error) {
      console.error("❌ Purchase validation error:", error);
      return true;
    }
  }
}
