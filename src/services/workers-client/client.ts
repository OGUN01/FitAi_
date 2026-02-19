import { supabase } from "../supabase";
import { API_CONFIG } from "../../config/api";
import {
  WorkersClientConfig,
  WorkersResponse,
  DietPlan,
  DietGenerationRequest,
  AsyncDietGenerationResponse,
  WorkoutPlan,
  WorkoutGenerationRequest,
  FoodRecognitionRequest,
  FoodRecognitionResponse,
  JobStatusResponse,
  JobListResponse,
} from "./types";
import { WorkersAPIError, NetworkError, AuthenticationError } from "./errors";

export class FitAIWorkersClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: WorkersClientConfig = {}) {
    this.baseUrl = config.baseUrl || API_CONFIG.WORKERS_BASE_URL;
    this.timeout = config.timeout || 120000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  private async getAuthToken(): Promise<string> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new AuthenticationError(
          `Failed to get session: ${error.message}`,
        );
      }

      if (!session?.access_token) {
        throw new AuthenticationError("No active session found");
      }

      return session.access_token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    retryCount = 0,
  ): Promise<WorkersResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`[WorkersClient] API Error Response:`, {
          status: response.status,
          statusText: response.statusText,
          error: responseData.error,
          errorType: typeof responseData.error,
          fullResponse: JSON.stringify(responseData).substring(0, 500),
        });
      }

      if (!response.ok) {
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(
            `[WorkersClient] Retrying request (${retryCount + 1}/${this.maxRetries}) after ${delay}ms`,
          );
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (responseData.error) {
          if (typeof responseData.error === "string") {
            errorMessage = responseData.error;
          } else if (typeof responseData.error === "object") {
            errorMessage =
              responseData.error.message ||
              responseData.error.error ||
              JSON.stringify(responseData.error);
          }
        }

        throw new WorkersAPIError(
          errorMessage,
          response.status,
          responseData.errorCode,
          responseData.details || responseData.error,
        );
      }

      return responseData;
    } catch (error) {
      if (error instanceof TypeError || (error as any).name === "AbortError") {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(
            `[WorkersClient] Network error, retrying (${retryCount + 1}/${this.maxRetries}) after ${delay}ms`,
          );
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        throw new NetworkError("Network request failed", error);
      }

      if (
        error instanceof WorkersAPIError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }

      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  private shouldRetry(statusCode: number): boolean {
    return statusCode >= 500 || statusCode === 429;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateDietPlan(
    request: DietGenerationRequest,
  ): Promise<WorkersResponse<DietPlan>> {
    const token = await this.getAuthToken();

    return this.makeRequest<DietPlan>("/diet/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  async generateDietPlanAsync(
    request: Omit<DietGenerationRequest, "async">,
  ): Promise<WorkersResponse<AsyncDietGenerationResponse>> {
    const token = await this.getAuthToken();

    return this.makeRequest<AsyncDietGenerationResponse>("/diet/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, async: true }),
    });
  }

  async generateWorkoutPlan(
    request: WorkoutGenerationRequest,
  ): Promise<WorkersResponse<WorkoutPlan>> {
    const token = await this.getAuthToken();

    return this.makeRequest<WorkoutPlan>("/workout/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  async healthCheck(): Promise<
    WorkersResponse<{ status: string; timestamp: string }>
  > {
    return this.makeRequest("/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session?.access_token;
    } catch {
      return false;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  async recognizeFood(
    request: FoodRecognitionRequest,
  ): Promise<WorkersResponse<FoodRecognitionResponse>> {
    const token = await this.getAuthToken();

    return this.makeRequest("/food/recognize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  async getJobStatus(
    jobId: string,
  ): Promise<WorkersResponse<JobStatusResponse>> {
    const token = await this.getAuthToken();

    return this.makeRequest(`/diet/jobs/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async listJobs(): Promise<WorkersResponse<JobListResponse>> {
    const token = await this.getAuthToken();

    return this.makeRequest("/diet/jobs", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async testConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    error?: string;
    backendVersion?: string;
  }> {
    try {
      const healthResponse = await this.healthCheck();

      if (!healthResponse.success) {
        return {
          connected: false,
          authenticated: false,
          error: "Backend health check failed",
        };
      }

      const isAuth = await this.isAuthenticated();

      if (!isAuth) {
        return {
          connected: true,
          authenticated: false,
          error: "User not authenticated - sign up required for AI features",
          backendVersion: "v2.0",
        };
      }

      try {
        const token = await this.getAuthToken();
        const authTestResponse = await fetch(`${this.baseUrl}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const authData = await authTestResponse.json();

        return {
          connected: true,
          authenticated: authData.success === true,
          error: authData.success
            ? undefined
            : "Authentication verification failed",
          backendVersion: "v2.0",
        };
      } catch (authError) {
        return {
          connected: true,
          authenticated: false,
          error: `Auth test failed: ${authError instanceof Error ? authError.message : String(authError)}`,
          backendVersion: "v2.0",
        };
      }
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export const fitaiWorkersClient = new FitAIWorkersClient();
export default fitaiWorkersClient;
