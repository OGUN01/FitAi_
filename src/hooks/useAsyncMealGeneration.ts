/**
 * useAsyncMealGeneration Hook
 *
 * Manages async meal generation with job status polling.
 * Provides a seamless experience for users while meals are being generated in the background.
 *
 * Features:
 * - Async job submission with immediate feedback
 * - Automatic polling with exponential backoff
 * - Job status tracking (pending, processing, completed, failed)
 * - Background job resumption on app restart
 * - Cleanup on component unmount
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fitaiWorkersClient,
  DietGenerationRequest,
  DietPlan,
  AsyncJobStatusResponse,
  isDietPlanResponse,
  isAsyncJobResponse,
} from "../services/fitaiWorkersClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Job status types
export type JobStatus =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AsyncMealJob {
  jobId: string;
  status: JobStatus;
  result?: any;
  error?: string;
  createdAt: string;
  estimatedTimeRemaining?: number;
  generationTimeMs?: number;
}

export interface UseAsyncMealGenerationResult {
  // Current job state
  currentJob: AsyncMealJob | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  generateMealPlan: (
    request: DietGenerationRequest,
  ) => Promise<AsyncMealJob | null>;
  checkJobStatus: (jobId: string) => Promise<AsyncMealJob | null>;
  cancelPolling: () => void;
  clearCurrentJob: () => void;

  // Metadata
  lastCompletedPlan: any | null;
  recentJobs: AsyncMealJob[];
}

const STORAGE_KEY = "fitai_async_meal_job";
const POLL_INTERVAL_INITIAL = 3000; // 3 seconds
const POLL_INTERVAL_MAX = 15000; // 15 seconds
const MAX_POLL_ATTEMPTS = 60; // ~3 minutes max polling

export function useAsyncMealGeneration(): UseAsyncMealGenerationResult {
  const [currentJob, setCurrentJob] = useState<AsyncMealJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCompletedPlan, setLastCompletedPlan] = useState<any | null>(null);
  const [recentJobs, setRecentJobs] = useState<AsyncMealJob[]>([]);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  // Restore pending job on mount
  useEffect(() => {
    restorePendingJob();
  }, []);

  /**
   * Restore pending job from storage (for app restart scenarios)
   */
  const restorePendingJob = async () => {
    try {
      const storedJob = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedJob) {
        const job: AsyncMealJob = JSON.parse(storedJob);

        // Only restore if job is still pending/processing
        if (job.status === "pending" || job.status === "processing") {
          setCurrentJob(job);
          startPolling(job.jobId);
        } else {
          // Clear stale completed/failed jobs
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn("[useAsyncMealGeneration] Failed to restore job:", err);
    }
  };

  /**
   * Submit new meal plan generation request
   */
  const generateMealPlan = useCallback(
    async (request: DietGenerationRequest): Promise<AsyncMealJob | null> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(
          "[useAsyncMealGeneration] Submitting async meal generation request",
        );
        const response =
          await fitaiWorkersClient.generateDietPlanAsync(request);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to generate meal plan");
        }

        // Check for cache hit (200 with immediate result)
        if (isDietPlanResponse(response.data)) {
          console.log("[useAsyncMealGeneration] Cache hit - immediate result");
          const completedJob: AsyncMealJob = {
            jobId: "cache-hit",
            status: "completed",
            result: response.data,
            createdAt: new Date().toISOString(),
          };
          setCurrentJob(completedJob);
          setLastCompletedPlan(response.data);
          setIsLoading(false);
          return completedJob;
        }

        // Async job created (202)
        if (isAsyncJobResponse(response.data)) {
          const jobResponse = response.data;
          const newJob: AsyncMealJob = {
            jobId: jobResponse.jobId,
            status: jobResponse.status,
            createdAt: new Date().toISOString(),
            estimatedTimeRemaining:
              (jobResponse.estimatedTimeMinutes || 2) * 60,
          };

          setCurrentJob(newJob);

          // Persist job for app restart recovery
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newJob));

          // Start polling for job completion
          startPolling(newJob.jobId);

          return newJob;
        }

        throw new Error("Unexpected response format");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate meal plan";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [],
  );

  /**
   * Check job status
   */
  const checkJobStatus = useCallback(
    async (jobId: string): Promise<AsyncMealJob | null> => {
      try {
        const response = await fitaiWorkersClient.getJobStatus(jobId);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to get job status");
        }

        const jobData = response.data;
        const updatedJob: AsyncMealJob = {
          jobId: jobData.jobId,
          status: jobData.status,
          result: jobData.result,
          error: jobData.error,
          createdAt: jobData.metadata?.createdAt || new Date().toISOString(),
          estimatedTimeRemaining: jobData.estimatedTime,
          generationTimeMs: jobData.metadata?.generationTimeMs,
        };

        if (mountedRef.current) {
          setCurrentJob(updatedJob);

          // Handle completion
          if (updatedJob.status === "completed" && updatedJob.result) {
            setLastCompletedPlan(updatedJob.result);
            setIsLoading(false);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }

          // Handle failure
          if (updatedJob.status === "failed") {
            setError(updatedJob.error || "Job failed");
            setIsLoading(false);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }

        return updatedJob;
      } catch (err) {
        console.error(
          "[useAsyncMealGeneration] Failed to check job status:",
          err,
        );
        return null;
      }
    },
    [],
  );

  /**
   * Start polling for job completion
   */
  const startPolling = useCallback(
    (jobId: string) => {
      pollAttemptRef.current = 0;

      const poll = async () => {
        if (!mountedRef.current) return;

        pollAttemptRef.current++;

        const job = await checkJobStatus(jobId);

        if (!job || !mountedRef.current) return;

        // Stop polling if job is terminal
        if (
          job.status === "completed" ||
          job.status === "failed" ||
          job.status === "cancelled"
        ) {
          console.log(
            `[useAsyncMealGeneration] Job ${jobId} finished with status: ${job.status}`,
          );
          return;
        }

        // Continue polling with exponential backoff
        if (pollAttemptRef.current < MAX_POLL_ATTEMPTS) {
          const interval = Math.min(
            POLL_INTERVAL_INITIAL *
              Math.pow(1.5, Math.floor(pollAttemptRef.current / 5)),
            POLL_INTERVAL_MAX,
          );

          console.log(
            `[useAsyncMealGeneration] Polling again in ${interval}ms (attempt ${pollAttemptRef.current})`,
          );
          pollingRef.current = setTimeout(poll, interval);
        } else {
          // Timeout after max attempts
          setError("Generation timeout - please check your jobs later");
          setIsLoading(false);
        }
      };

      // Start first poll after a short delay
      pollingRef.current = setTimeout(poll, POLL_INTERVAL_INITIAL);
    },
    [checkJobStatus],
  );

  /**
   * Cancel polling
   */
  const cancelPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  /**
   * Clear current job
   */
  const clearCurrentJob = useCallback(async () => {
    cancelPolling();
    setCurrentJob(null);
    setIsLoading(false);
    setError(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, [cancelPolling]);

  return {
    currentJob,
    isLoading,
    error,
    generateMealPlan,
    checkJobStatus,
    cancelPolling,
    clearCurrentJob,
    lastCompletedPlan,
    recentJobs,
  };
}

export default useAsyncMealGeneration;
