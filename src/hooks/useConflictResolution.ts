// Custom hook for managing conflict resolution state and logic

import { useState } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import {
  DataConflict,
  ResolutionStrategy,
} from "../services/conflictResolution";

export interface UseConflictResolutionReturn {
  resolutions: Record<string, ResolutionStrategy>;
  handleStrategyChange: (
    conflictId: string,
    strategy: ResolutionStrategy,
  ) => void;
  handleAutoResolve: (conflicts: DataConflict[]) => void;
  handleResolveAll: (
    conflicts: DataConflict[],
    onResolve: (resolutions: Record<string, ResolutionStrategy>) => void,
  ) => void;
  getConflictStats: (conflicts: DataConflict[]) => {
    total: number;
    resolved: number;
    autoResolvable: number;
  };
}

export const useConflictResolution = (
  conflicts: DataConflict[],
): UseConflictResolutionReturn => {
  const [resolutions, setResolutions] = useState<
    Record<string, ResolutionStrategy>
  >(() => {
    const initial: Record<string, ResolutionStrategy> = {};
    conflicts.forEach((conflict) => {
      initial[conflict.id] = conflict.suggestedResolution;
    });
    return initial;
  });

  const handleStrategyChange = (
    conflictId: string,
    strategy: ResolutionStrategy,
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictId]: strategy,
    }));
  };

  const handleAutoResolve = (conflicts: DataConflict[]) => {
    const autoResolutions: Record<string, ResolutionStrategy> = {};
    conflicts.forEach((conflict) => {
      if (conflict.autoResolvable) {
        autoResolutions[conflict.id] = conflict.suggestedResolution;
      }
    });
    setResolutions((prev) => ({ ...prev, ...autoResolutions }));
  };

  const handleResolveAll = (
    conflicts: DataConflict[],
    onResolve: (resolutions: Record<string, ResolutionStrategy>) => void,
  ) => {
    const unresolvedConflicts = conflicts.filter(
      (conflict) =>
        !resolutions[conflict.id] || resolutions[conflict.id] === "user_choice",
    );

    if (unresolvedConflicts.length > 0) {
      crossPlatformAlert(
        "Unresolved Conflicts",
        `You have ${unresolvedConflicts.length} unresolved conflicts. Please make a choice for each conflict.`,
        [{ text: "OK" }],
      );
      return;
    }

    onResolve(resolutions);
  };

  const getConflictStats = (conflicts: DataConflict[]) => {
    const total = conflicts.length;
    const resolved = Object.keys(resolutions).filter(
      (id) => resolutions[id] && resolutions[id] !== "user_choice",
    ).length;
    const autoResolvable = conflicts.filter((c) => c.autoResolvable).length;

    return { total, resolved, autoResolvable };
  };

  return {
    resolutions,
    handleStrategyChange,
    handleAutoResolve,
    handleResolveAll,
    getConflictStats,
  };
};
