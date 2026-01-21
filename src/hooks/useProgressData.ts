import { useState, useEffect, useCallback } from "react";
import {
  progressDataService,
  ProgressEntry,
  BodyAnalysis,
  ProgressStats,
  ProgressGoals,
} from "../services/progressData";
import { useAuth } from "./useAuth";
import useTrackBIntegration from "./useTrackBIntegration";

interface UseProgressDataReturn {
  // Progress entries
  progressEntries: ProgressEntry[];
  progressLoading: boolean;
  progressError: string | null;
  loadProgressEntries: (limit?: number) => Promise<void>;

  // Body analysis
  bodyAnalysis: BodyAnalysis | null;
  analysisLoading: boolean;
  analysisError: string | null;
  loadBodyAnalysis: () => Promise<void>;

  // Progress statistics
  progressStats: ProgressStats | null;
  statsLoading: boolean;
  statsError: string | null;
  loadProgressStats: (timeRange?: number) => Promise<void>;

  // Progress goals
  progressGoals: ProgressGoals | null;
  goalsLoading: boolean;
  goalsError: string | null;
  loadProgressGoals: () => Promise<void>;

  // Actions
  createProgressEntry: (entryData: {
    weight_kg: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    measurements?: {
      chest?: number;
      waist?: number;
      hips?: number;
      bicep?: number;
      thigh?: number;
      neck?: number;
    };
    progress_photos?: string[];
    notes?: string;
  }) => Promise<boolean>;

  // Track B integration
  trackBStatus: {
    isConnected: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
  };

  // Utility
  refreshAll: () => Promise<void>;
  clearErrors: () => void;
}

export const useProgressData = (): UseProgressDataReturn => {
  const { user, isAuthenticated } = useAuth();
  const trackB = useTrackBIntegration();

  // Progress entries state
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Body analysis state
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Progress statistics state
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(
    null,
  );
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Progress goals state
  const [progressGoals, setProgressGoals] = useState<ProgressGoals | null>(
    null,
  );
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  // Initialize Track B integration
  useEffect(() => {
    if (isAuthenticated && !trackB.integration.isInitialized) {
      trackB.actions.initialize().catch((error) => {
        console.error("Failed to initialize Track B integration:", error);
      });
    }
  }, [isAuthenticated, trackB.integration.isInitialized, trackB.actions]);

  // Load progress entries
  const loadProgressEntries = useCallback(
    async (limit?: number) => {
      if (!user?.id) return;

      setProgressLoading(true);
      setProgressError(null);

      try {
        const response = await progressDataService.getUserProgressEntries(
          user.id,
          limit,
        );

        if (response.success && response.data) {
          setProgressEntries(response.data);
        } else {
          setProgressError(response.error || "Failed to load progress entries");
        }
      } catch (error) {
        setProgressError(
          error instanceof Error
            ? error.message
            : "Failed to load progress entries",
        );
      } finally {
        setProgressLoading(false);
      }
    },
    [user?.id],
  );

  // Load body analysis
  const loadBodyAnalysis = useCallback(async () => {
    if (!user?.id) return;

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const response = await progressDataService.getUserBodyAnalysis(user.id);

      if (response.success && response.data) {
        setBodyAnalysis(response.data);
      } else {
        setAnalysisError(response.error || "Failed to load body analysis");
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Failed to load body analysis",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }, [user?.id]);

  // Load progress statistics
  const loadProgressStats = useCallback(
    async (timeRange: number = 30) => {
      if (!user?.id) return;

      setStatsLoading(true);
      setStatsError(null);

      try {
        const response = await progressDataService.getProgressStats(
          user.id,
          timeRange,
        );

        if (response.success && response.data) {
          setProgressStats(response.data);
        } else {
          setStatsError(response.error || "Failed to load progress statistics");
        }
      } catch (error) {
        setStatsError(
          error instanceof Error
            ? error.message
            : "Failed to load progress statistics",
        );
      } finally {
        setStatsLoading(false);
      }
    },
    [user?.id],
  );

  // Load progress goals
  const loadProgressGoals = useCallback(async () => {
    if (!user?.id) return;

    setGoalsLoading(true);
    setGoalsError(null);

    try {
      const response = await progressDataService.getProgressGoals(user.id);

      if (response.success && response.data) {
        setProgressGoals(response.data);
      } else {
        setGoalsError(response.error || "Failed to load progress goals");
      }
    } catch (error) {
      setGoalsError(
        error instanceof Error
          ? error.message
          : "Failed to load progress goals",
      );
    } finally {
      setGoalsLoading(false);
    }
  }, [user?.id]);

  // Create progress entry
  const createProgressEntry = useCallback(
    async (entryData: {
      weight_kg: number;
      body_fat_percentage?: number;
      muscle_mass_kg?: number;
      measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
        bicep?: number;
        thigh?: number;
        neck?: number;
      };
      progress_photos?: string[];
      notes?: string;
    }): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const response = await progressDataService.createProgressEntry(
          user.id,
          entryData,
        );

        if (response.success) {
          // Refresh progress data
          await Promise.all([loadProgressEntries(), loadProgressStats()]);
          return true;
        } else {
          setProgressError(response.error || "Failed to create progress entry");
          return false;
        }
      } catch (error) {
        setProgressError(
          error instanceof Error
            ? error.message
            : "Failed to create progress entry",
        );
        return false;
      }
    },
    [user?.id, loadProgressEntries, loadProgressStats],
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    await Promise.all([
      loadProgressEntries(),
      loadBodyAnalysis(),
      loadProgressStats(),
      loadProgressGoals(),
    ]);
  }, [
    isAuthenticated,
    user?.id,
    loadProgressEntries,
    loadBodyAnalysis,
    loadProgressStats,
    loadProgressGoals,
  ]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setProgressError(null);
    setAnalysisError(null);
    setStatsError(null);
    setGoalsError(null);
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && user?.id && trackB.integration.isInitialized) {
      refreshAll().catch((error) => {
        if (isMounted) {
          console.error("Failed to refresh progress data:", error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, trackB.integration.isInitialized, refreshAll]);

  // Track B status
  const trackBStatus = {
    isConnected: trackB.integration.isConnected,
    isOnline: trackB.sync.isOnline,
    isSyncing: trackB.sync.isSyncing,
    lastSyncTime: trackB.sync.lastSyncTime,
  };

  return {
    // Progress entries
    progressEntries,
    progressLoading,
    progressError,
    loadProgressEntries,

    // Body analysis
    bodyAnalysis,
    analysisLoading,
    analysisError,
    loadBodyAnalysis,

    // Progress statistics
    progressStats,
    statsLoading,
    statsError,
    loadProgressStats,

    // Progress goals
    progressGoals,
    goalsLoading,
    goalsError,
    loadProgressGoals,

    // Actions
    createProgressEntry,

    // Track B integration
    trackBStatus,

    // Utility
    refreshAll,
    clearErrors,
  };
};
