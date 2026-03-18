/**
 * Web-only Razorpay checkout implementation.
 * On web, the native `react-native-razorpay` SDK is unavailable.
 * This module wraps the standard Razorpay checkout.js script.
 *
 * Usage: imported only when `Platform.OS === 'web'`
 */

import {
    RazorpayCheckoutOptions,
    RazorpaySuccessResponse,
} from "./RazorpayService";

declare global {
    interface Window {
        Razorpay: new (options: object) => {
            open: () => void;
            on: (event: string, handler: (...args: unknown[]) => void) => void;
        };
    }
}

function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            reject(new Error("Not in browser environment"));
            return;
        }

        if (window.Razorpay) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
        document.head.appendChild(script);
    });
}

export async function openRazorpayWebCheckout(
    options: RazorpayCheckoutOptions,
): Promise<RazorpaySuccessResponse> {
    await loadRazorpayScript();

    return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
        const rzpOptions = {
            key: options.key,
            subscription_id: options.subscription_id,
            name: options.name ?? "FitAI",
            description: options.description ?? "FitAI Premium Subscription",
            image: options.image,
            prefill: options.prefill,
            theme: options.theme,
            handler: (response: RazorpaySuccessResponse) => {
                resolve(response);
            },
            modal: {
                ondismiss: () => {
                    reject({ code: 0, description: "Checkout cancelled by user" });
                },
            },
        };

        const rzp = new window.Razorpay(rzpOptions);

        rzp.on("payment.failed", (...args: unknown[]) => {
            const response = args[0] as { error: { description: string; code: string } };
            reject({
                code: response.error.code,
                description: response.error.description,
            });
        });

        rzp.open();
    });
}
