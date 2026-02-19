import { useEffect, useState } from "react";
import { useProgressData } from "./useProgressData";
import { THEME } from "../components/ui";

export const useProgressAnalytics = (
  initialTimeRange: "week" | "month" | "year" = "month",
  onTimeRangeChange?: (range: "week" | "month" | "year") => void,
) => {
  const {
    progressStats,
    progressEntries,
    progressGoals,
    loadProgressStats,
    statsLoading,
  } = useProgressData();

  const [selectedRange, setSelectedRange] = useState<"week" | "month" | "year">(
    initialTimeRange,
  );

  useEffect(() => {
    const days =
      selectedRange === "week" ? 7 : selectedRange === "month" ? 30 : 365;
    loadProgressStats(days);
  }, [selectedRange, loadProgressStats]);

  const handleRangeChange = (range: "week" | "month" | "year") => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const getProgressColor = (change: number) => {
    if (change > 0) return THEME.colors.success;
    if (change < 0) return THEME.colors.warning;
    return THEME.colors.textSecondary;
  };

  const getProgressIcon = (change: number) => {
    if (change > 0) return "📈";
    if (change < 0) return "📉";
    return "➡️";
  };

  const formatChange = (change: number, unit: string) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}${unit}`;
  };

  const calculateGoalProgress = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  return {
    progressStats,
    progressEntries,
    progressGoals,
    statsLoading,
    selectedRange,
    handleRangeChange,
    getProgressColor,
    getProgressIcon,
    formatChange,
    calculateGoalProgress,
  };
};
