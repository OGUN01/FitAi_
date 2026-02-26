import { useMemo } from "react";

export interface WeightEntry {
  date: string;
  weight: number;
}

interface UseBodyProgressLogicProps {
  currentWeight?: number;
  goalWeight?: number;
  startingWeight?: number;
  weightHistory?: WeightEntry[];
}

export const useBodyProgressLogic = ({
  currentWeight,
  goalWeight,
  startingWeight,
  weightHistory = [],
}: UseBodyProgressLogicProps) => {
  // Calculate progress and trend
  const { progress, remaining, trend, trendDirection } = useMemo(() => {
    if (!currentWeight || !goalWeight || !startingWeight) {
      return {
        progress: 0,
        remaining: 0,
        trend: 0,
        trendDirection: "stable" as const,
      };
    }

    const totalChange = Math.abs(startingWeight - goalWeight);
    const currentChange = Math.abs(startingWeight - currentWeight);
    const progressPercent =
      totalChange > 0 ? (currentChange / totalChange) * 100 : 0;

    // For weight loss: starting > goal, for weight gain: starting < goal
    const isLosing = startingWeight > goalWeight;
    const remainingWeight = isLosing
      ? Math.max(currentWeight - goalWeight, 0)
      : Math.max(goalWeight - currentWeight, 0);

    // Calculate 7-day trend
    const recentWeights = weightHistory.slice(-7).map((e) => e.weight);
    let trendValue = 0;
    let direction: "up" | "down" | "stable" = "stable";

    if (recentWeights.length >= 2) {
      const firstHalf = recentWeights.slice(
        0,
        Math.floor(recentWeights.length / 2),
      );
      const secondHalf = recentWeights.slice(
        Math.floor(recentWeights.length / 2),
      );
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trendValue = secondAvg - firstAvg;

      if (Math.abs(trendValue) < 0.2) {
        direction = "stable";
      } else if (trendValue > 0) {
        direction = "up";
      } else {
        direction = "down";
      }
    }

    return {
      progress: Math.min(progressPercent, 100),
      remaining: remainingWeight,
      trend: trendValue,
      trendDirection: direction,
    };
  }, [currentWeight, goalWeight, startingWeight, weightHistory]);

  // Get trend color and icon
  const getTrendInfo = () => {
    const isLosing =
      startingWeight && goalWeight && startingWeight > goalWeight;

    if (trendDirection === "stable") {
      return { icon: "remove" as const, color: "#9E9E9E", label: "Stable" };
    }

    // For weight loss: down is good, for weight gain: up is good
    if (isLosing) {
      return trendDirection === "down"
        ? {
            icon: "trending-down" as const,
            color: "#4CAF50",
            label: "On track",
          }
        : {
            icon: "trending-up" as const,
            color: "#FF9800",
            label: "Review needed",
          };
    } else {
      return trendDirection === "up"
        ? { icon: "trending-up" as const, color: "#4CAF50", label: "On track" }
        : {
            icon: "trending-down" as const,
            color: "#FF9800",
            label: "Review needed",
          };
    }
  };

  const trendInfo = getTrendInfo();
  const chartData = weightHistory.slice(-7).map((e) => e.weight);
  const hasData = !!(currentWeight && currentWeight > 0);

  // Progress color based on percentage
  const progressColor =
    progress >= 75
      ? "#4CAF50"
      : progress >= 50
        ? "#8BC34A"
        : progress >= 25
          ? "#FFC107"
          : "#FF9800";

  return {
    progress,
    remaining,
    trendInfo,
    chartData,
    hasData,
    progressColor,
  };
};
