import { useMemo } from "react";
import { ResponsiveTheme } from "../utils/constants";
import { getRecoveryColor, getSleepColor } from "../utils/healthUtils";

interface UseHealthIntelligenceLogicProps {
  sleepHours?: number;
  sleepQuality?: "poor" | "fair" | "good" | "excellent";
  restingHeartRate?: number;
  steps?: number;
  stepsGoal?: number;
  activeCalories?: number;
}

export const useHealthIntelligenceLogic = ({
  sleepHours,
  sleepQuality,
  restingHeartRate,
  steps,
  stepsGoal,
  activeCalories,
}: UseHealthIntelligenceLogicProps) => {
  // Check if we have ANY real health data (to show the component)
  const hasRealData = useMemo(() => {
    return (
      (sleepHours !== undefined && sleepHours > 0) ||
      restingHeartRate !== undefined ||
      (steps !== undefined && steps > 0) ||
      (activeCalories !== undefined && activeCalories > 0)
    );
  }, [sleepHours, restingHeartRate, steps, activeCalories]);

  // Check if we have SUFFICIENT data for meaningful recovery score
  // Recovery requires sleep OR heart rate - steps alone is not enough
  const hasSufficientDataForRecovery = useMemo(() => {
    return (
      (sleepHours !== undefined && sleepHours > 0) ||
      (restingHeartRate !== undefined && restingHeartRate > 0)
    );
  }, [sleepHours, restingHeartRate]);

  // Calculate recovery score ONLY if we have sufficient data (sleep or HR)
  const recoveryScore = useMemo(() => {
    // If no sufficient recovery data, return null to show "--"
    if (!hasSufficientDataForRecovery) return null;

    let score = 50; // Base score

    // Sleep contribution (40% of score) - guard against undefined/NaN
    const actualSleepHours = sleepHours ?? 0;
    const actualSleepQuality = sleepQuality;
    const sleepScore =
      actualSleepHours > 0 ? Math.min(actualSleepHours / 8, 1) * 40 : 0;
    if (actualSleepQuality === "excellent") score += sleepScore * 1.2;
    else if (actualSleepQuality === "good") score += sleepScore;
    else if (actualSleepQuality === "fair") score += sleepScore * 0.7;
    else score += sleepScore * 0.4;

    // Heart rate contribution (30% of score)
    if (restingHeartRate && restingHeartRate > 0) {
      const idealRestingHR = 60;
      const hrDiff = Math.abs(restingHeartRate - idealRestingHR);
      const hrScore = Math.max(0, 30 - hrDiff);
      score += hrScore;
    }

    // Activity contribution (30% of score) - guard against undefined/NaN
    const actualSteps = steps ?? 0;
    const actualStepsGoal = stepsGoal ?? 0;
    const activityScore =
      actualStepsGoal > 0 ? Math.min(actualSteps / actualStepsGoal, 1) * 30 : 0;
    score += activityScore * 0.7; // Not overdoing it is good for recovery

    // Ensure final score is a valid number
    const finalScore = Math.round(Math.min(Math.max(score, 0), 100));
    return Number.isFinite(finalScore) ? finalScore : 0;
  }, [
    sleepHours,
    sleepQuality,
    restingHeartRate,
    steps,
    stepsGoal,
    hasSufficientDataForRecovery,
  ]);

  const { label: recoveryLabel, color: recoveryColor } =
    recoveryScore !== null
      ? getRecoveryColor(recoveryScore)
      : { label: "No Data", color: ResponsiveTheme.colors.textMuted };

  const sleepColor = getSleepColor(sleepQuality ?? "unknown");

  // Format sleep quality
  const formatSleepQuality = (quality?: string) => {
    if (!quality) return "--";
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  const getInsightText = () => {
    if (recoveryScore == null)
      return "Track your health data to get recovery insights.";
    if (recoveryScore >= 80)
      return "You're well recovered. Great day for intense training!";
    if (recoveryScore >= 60)
      return "Moderate recovery. Consider a balanced workout.";
    if (recoveryScore >= 40)
      return "Low recovery. Focus on light activity today.";
    return "Rest recommended. Your body needs recovery.";
  };

  return {
    hasRealData,
    recoveryScore,
    recoveryLabel,
    recoveryColor,
    sleepColor,
    formatSleepQuality,
    insightText: getInsightText(),
  };
};
