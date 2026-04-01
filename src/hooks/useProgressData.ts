import { useState, useEffect, useCallback } from "react";
import {
  progressDataService,
  ProgressEntry,
  ProgressStats,
  ProgressGoals,
} from "../services/progressData";
import { useAuth } from "./useAuth";
import useTrackBIntegration from "./useTrackBIntegration";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UseProgressDataReturn {
  // Progress entries
  progressEntries: ProgressEntry[];
  progressLoading: boolean;
  progressError: string | null;
  loadProgressEntries: (limit?: number) => Promise<void>;

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

  // Body analysis error (kept for API compatibility; AI analysis removed)
  analysisError: string | null;
}

export const useProgressData = (): UseProgressDataReturn => {
  const { user, isAuthenticated } = useAuth();
  const trackB = useTrackBIntegration();

  // Progress entries state
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

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
  }, [isAuthenticated, trackB.integration.isInitialized]);

  // Load progress entries
  const loadProgressEntries = useCallback(
    async (limit?: number) => {
      setProgressLoading(true);
      setProgressError(null);

      try {
        if (user?.id) {
          // Authenticated user: load from Supabase
          const response = await progressDataService.getUserProgressEntries(
            user.id,
            limit,
          );

          if (response.success && response.data) {
            setProgressEntries(response.data);
          } else {
            setProgressError(response.error || "Failed to load progress entries");
          }
        } else {
          // Guest user: load from AsyncStorage
          const existingData = await AsyncStorage.getItem("guest_weight_entries");
          if (existingData) {
            const guestEntries = JSON.parse(existingData) as Array<{
              id: string;
              weight_kg: number;
              body_fat_percentage?: number;
              notes?: string;
              created_at: string;
            }>;
            const mapped: ProgressEntry[] = guestEntries.map((entry) => ({
              id: entry.id,
              user_id: "guest",
              entry_date: entry.created_at,
              weight_kg: entry.weight_kg,
              body_fat_percentage: entry.body_fat_percentage,
              muscle_mass_kg: undefined,
              measurements: {},
              notes: entry.notes,
              recorded_at: entry.created_at,
              created_at: entry.created_at,
            }));
            setProgressEntries(mapped);
          }
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
    // AsyncStorage and progressDataService are singletons — stable references, intentionally omitted from deps
    [user?.id],
  );

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
    if (user?.id) {
      // Authenticated: load all from Supabase
      await Promise.all([
        loadProgressEntries(),
        loadProgressStats(),
        loadProgressGoals(),
      ]);
    } else {
      // Guest: only load local weight entries
      await loadProgressEntries();
    }
  }, [
    user?.id,
    loadProgressEntries,
    loadProgressStats,
    loadProgressGoals,
  ]);
  // Clear all errors
  const clearErrors = useCallback(() => {
    setProgressError(null);
    setStatsError(null);
    setGoalsError(null);
  }, []);

  // Load initial data when user is authenticated OR guest has local data
  useEffect(() => {
    let isMounted = true;

    if (user?.id && isAuthenticated) {
      // Load immediately — do NOT gate on trackB.integration.isInitialized.
      // Track B is supplementary sync; blocking all data load on it causes the
      // "No progress data yet" banner to appear for users who have real data.
      refreshAll().catch((error) => {
        if (isMounted) {
          console.error("Failed to refresh progress data:", error);
        }
      });
    } else if (!user?.id) {
      // Guest user: load local entries
      loadProgressEntries().catch((error) => {
        if (isMounted) {
          console.error("Failed to load guest progress entries:", error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id]);

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

    // Body analysis error (SSOT: no longer separately tracked; always null)
    analysisError: null,
  };
};
