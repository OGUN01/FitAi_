import { Platform } from "react-native";
import { API_CONFIG, getWorkersUrl } from "../config/api";
import { supabase } from "./supabase";

// Types — declared locally to avoid importing from native module on web
export interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

// Native SDK — only imported/used on native platforms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RazorpayCheckout: any = null;
if (Platform.OS !== "web") {
  // Dynamic require so Metro/webpack doesn't bundle the native module on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayCheckout = require("react-native-razorpay").default;
}

// ============================================================================
// Types
// ============================================================================

interface CreateSubscriptionResponse {
  subscription_id: string;
  key_id: string;
}

interface SubscriptionStatusResponse {
  plan: string;
  status: string;
  features: Record<string, boolean>;
  usage: Record<string, number>;
}

interface SubscriptionLifecycleResponse {
  message: string;
  status: string;
  current_period_end?: string | null;
  paused_at?: string | null;
  resumed_at?: string | null;
}

interface UserInfo {
  email: string;
  name: string;
  phone: string;
}

interface WorkersApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | { code?: string; message?: string; details?: unknown };
}

export class RazorpayServiceError extends Error {
  constructor(
    message: string,
    public code:
      | "AUTH_ERROR"
      | "NETWORK_ERROR"
      | "API_ERROR"
      | "CHECKOUT_CANCELLED"
      | "PAYMENT_FAILED"
      | "SDK_ERROR",
    public details?: unknown,
  ) {
    super(message);
    this.name = "RazorpayServiceError";
  }
}

// ============================================================================
// Service
// ============================================================================

class RazorpayService {
  private async getAuthToken(): Promise<string> {
    // Try getSession() first — it's fast (reads from cache/localStorage)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return session.access_token;
    }

    // getSession() can return null on web if the session hasn't been restored
    // yet from localStorage/cookie. Fall back to getUser() which makes a
    // network request to Supabase and returns a fresh, validated token.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new RazorpayServiceError(
        sessionError?.message
          ? `Auth failed: ${sessionError.message}`
          : "No active session — please sign in and try again",
        "AUTH_ERROR",
      );
    }

    // Re-fetch session after getUser() confirms the user is valid
    // (getUser() refreshes the session internally on web)
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.getSession();

    if (!refreshedSession?.access_token) {
      throw new RazorpayServiceError(
        "Session token unavailable. Please sign out and sign in again.",
        "AUTH_ERROR",
      );
    }

    return refreshedSession.access_token;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.getAuthToken();
    const url = getWorkersUrl(endpoint);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      throw new RazorpayServiceError(
        "Network request failed — check your connection",
        "NETWORK_ERROR",
        err,
      );
    }

    const json: WorkersApiResponse<T> = await response.json();

    if (!response.ok || !json.success) {
      const errorMsg =
        typeof json.error === "string"
          ? json.error
          : typeof json.error === "object" && json.error?.message
            ? json.error.message
            : `Request failed with status ${response.status}`;
      throw new RazorpayServiceError(errorMsg, "API_ERROR", {
        status: response.status,
        error: json.error,
      });
    }

    return json.data as T;
  }

  /**
   * Creates a Razorpay subscription on the backend.
   * Returns the subscription_id and public key_id needed for checkout.
   */
  async createSubscription(
    planId: string,
    billingCycle: "monthly" | "yearly",
  ): Promise<CreateSubscriptionResponse> {
    return this.request<CreateSubscriptionResponse>(
      API_CONFIG.SUBSCRIPTION_CREATE_ENDPOINT,
      "POST",
      { plan_id: planId, billing_cycle: billingCycle },
    );
  }

  /**
   * Opens the native Razorpay checkout modal.
   * Resolves with payment IDs on success, throws on cancel/failure.
   */
  async openCheckout(
    subscriptionId: string,
    keyId: string,
    userInfo: UserInfo,
  ): Promise<RazorpaySuccessResponse> {
    const options: RazorpayCheckoutOptions = {
      key: keyId,
      subscription_id: subscriptionId,
      name: "FitAI",
      description: "FitAI Premium Subscription",
      prefill: {
        email: userInfo.email,
        contact: userInfo.phone,
        name: userInfo.name,
      },
      theme: { color: "#FF6B35" },
    };

    try {
      if (Platform.OS === "web") {
        // On web, use the Razorpay checkout.js shim
        const { openRazorpayWebCheckout } = await import(
          "./RazorpayWebCheckout"
        );
        return await openRazorpayWebCheckout(options);
      }
      // Native platforms: use react-native-razorpay SDK
      return await RazorpayCheckout.open(options);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | undefined;
      const code = errorObj?.code;
      const description =
        typeof errorObj?.description === "string"
          ? errorObj.description
          : "Payment could not be completed";

      if (code === 0 || code === "0" || description.includes("cancelled")) {
        throw new RazorpayServiceError(
          "Checkout was cancelled",
          "CHECKOUT_CANCELLED",
          err,
        );
      }

      throw new RazorpayServiceError(description, "PAYMENT_FAILED", err);
    }
  }

  /**
   * Sends payment proof to the backend for server-side signature verification.
   * Throws if verification fails so callers can surface the real backend error.
   */
  async verifyPayment(
    paymentId: string,
    subscriptionId: string,
    signature: string,
  ): Promise<void> {
    await this.request(API_CONFIG.SUBSCRIPTION_VERIFY_ENDPOINT, "POST", {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    });
  }

  /**
   * Fetches the current user's subscription status from the backend.
   * Always fetches fresh — never cached on client.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
    return this.request<SubscriptionStatusResponse>(
      API_CONFIG.SUBSCRIPTION_STATUS_ENDPOINT,
      "GET",
    );
  }

  async cancelSubscription(): Promise<SubscriptionLifecycleResponse> {
    return this.request<SubscriptionLifecycleResponse>(
      API_CONFIG.SUBSCRIPTION_CANCEL_ENDPOINT,
      "POST",
    );
  }

  async pauseSubscription(): Promise<SubscriptionLifecycleResponse> {
    return this.request<SubscriptionLifecycleResponse>(
      API_CONFIG.SUBSCRIPTION_PAUSE_ENDPOINT,
      "POST",
    );
  }

  async resumeSubscription(): Promise<SubscriptionLifecycleResponse> {
    return this.request<SubscriptionLifecycleResponse>(
      API_CONFIG.SUBSCRIPTION_RESUME_ENDPOINT,
      "POST",
    );
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const razorpayService = new RazorpayService();
export default razorpayService;
