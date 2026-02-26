import { useEffect } from "react";
import { fitnessRefreshService } from "../../services/fitnessRefreshService";

interface EffectsCallbacks {
  refreshAll: () => Promise<void>;
}

export const useFitnessDataEffects = (
  isAuthenticated: boolean,
  userId: string | undefined,
  callbacks: EffectsCallbacks,
) => {
  useEffect(() => {
    if (isAuthenticated && userId) {
      callbacks.refreshAll();
    }
  }, [isAuthenticated, userId, callbacks.refreshAll]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      const unsubscribe = fitnessRefreshService.onRefreshNeeded(
        callbacks.refreshAll,
      );

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, userId, callbacks.refreshAll]);
};
