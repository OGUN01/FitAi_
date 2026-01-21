import { supabase } from "./supabase";
import { authService } from "./auth";
import { userProfileService } from "./userProfile";

// Re-export all services for easy access
export { authService } from "./auth";
export { userProfileService } from "./userProfile";
export { supabase } from "./supabase";

// Import API types from types module (canonical source)
import type { ApiResponse as ApiResponseType } from "../types/api";
export type { ApiResponse } from "../types/api";
export type { ApiError } from "../types/api";

// Local error handling utility class (internal use only)
// NOTE: This is kept internally to avoid conflicts with the ApiError interface from types/api
export class ApiErrorClass extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// API utility functions
export const apiUtils = {
  /**
   * Handle Supabase errors and convert to ApiResponse
   */
  // @ts-ignore - Type compatibility issue with ApiResponse
  handleSupabaseError<T>(
    error: any,
    defaultMessage: string = "An error occurred",
  ): ApiResponseType<T> {
    if (error?.message) {
      return {
        success: false,
        error: error.message,
      } as any;
    }

    return {
      success: false,
      error: defaultMessage,
    } as any;
  },

  /**
   * Create success response
   */
  // @ts-ignore - Type compatibility issue with ApiResponse
  createSuccessResponse<T>(data: T, message?: string): ApiResponseType<T> {
    return {
      success: true,
      data,
      message,
    } as any;
  },

  /**
   * Create error response
   */
  // @ts-ignore - Type compatibility issue with ApiResponse
  createErrorResponse(error: string, code?: string): ApiResponseType<any> {
    return {
      success: false,
      error,
      ...(code && { code }),
    } as any;
  },

  /**
   * Validate required fields
   */
  validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[],
  ): string | null {
    for (const field of requiredFields) {
      if (
        !data[field] ||
        (typeof data[field] === "string" && data[field].trim() === "")
      ) {
        return `${field} is required`;
      }
    }
    return null;
  },

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, "");
  },

  /**
   * Check if user is authenticated
   */
  async checkAuthentication(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  },

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  },

  /**
   * Retry function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (i === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  },

  /**
   * Format date for API
   */
  formatDateForApi(date: Date): string {
    return date.toISOString();
  },

  /**
   * Parse date from API
   */
  parseDateFromApi(dateString: string): Date {
    return new Date(dateString);
  },

  /**
   * Convert weight between units
   */
  convertWeight(
    weight: number,
    fromUnit: "kg" | "lbs",
    toUnit: "kg" | "lbs",
  ): number {
    if (fromUnit === toUnit) return weight;

    if (fromUnit === "kg" && toUnit === "lbs") {
      return weight * 2.20462;
    } else if (fromUnit === "lbs" && toUnit === "kg") {
      return weight / 2.20462;
    }

    return weight;
  },

  /**
   * Convert height between units
   */
  convertHeight(
    height: number,
    fromUnit: "cm" | "ft",
    toUnit: "cm" | "ft",
  ): number {
    if (fromUnit === toUnit) return height;

    if (fromUnit === "cm" && toUnit === "ft") {
      return height / 30.48;
    } else if (fromUnit === "ft" && toUnit === "cm") {
      return height * 30.48;
    }

    return height;
  },

  /**
   * Calculate BMI
   */
  calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  },

  /**
   * Get BMI category
   */
  getBMICategory(bmi: number): string {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
  },

  /**
   * Calculate daily calorie needs (Harris-Benedict equation)
   */
  calculateDailyCalories(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: "male" | "female",
    activityLevel: "sedentary" | "light" | "moderate" | "active" | "extreme",
  ): number {
    // Calculate BMR
    let bmr: number;
    if (gender === "male") {
      bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
    } else {
      bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
    }

    // Apply activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extreme: 1.9,
    };

    return Math.round(bmr * activityMultipliers[activityLevel]);
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Generate random string
   */
  generateRandomString(length: number = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Debounce function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// Main API class
export class FitAIApi {
  private static instance: FitAIApi;

  private constructor() {}

  static getInstance(): FitAIApi {
    if (!FitAIApi.instance) {
      FitAIApi.instance = new FitAIApi();
    }
    return FitAIApi.instance;
  }

  // Auth methods
  get auth() {
    return authService;
  }

  // User profile methods
  get user() {
    return userProfileService;
  }

  // Utility methods
  get utils() {
    return apiUtils;
  }

  // Direct Supabase access
  get supabase() {
    return supabase;
  }

  /**
   * Initialize the API
   */
  async initialize(): Promise<void> {
    try {
      // Restore auth session
      await authService.restoreSession();
    } catch (error) {
      console.warn("Failed to initialize API:", error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("count")
        .limit(1);

      if (error) {
        return apiUtils.createErrorResponse("Database connection failed");
      }

      return apiUtils.createSuccessResponse({
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return apiUtils.createErrorResponse("Health check failed");
    }
  }
}

// Export singleton instance
export const api = FitAIApi.getInstance();
export default api;
