import type {
  HealthDataState,
  HeartRateZones,
  SleepRecommendations,
  ActivityAdjustedCalories,
} from "./types";
import { healthKitService } from "../../services/healthKit";

export const createAdvancedFeatures = (
  set: (
    partial:
      | Partial<HealthDataState>
      | ((state: HealthDataState) => Partial<HealthDataState>),
  ) => void,
  get: () => HealthDataState,
) => ({
  getHeartRateZones: async (age: number): Promise<HeartRateZones> => {
    try {
      console.log("❤️ Calculating heart rate zones...");
      const { metrics, isHealthKitAuthorized, isHealthConnectAuthorized } =
        get();

      let restingHR: number | undefined = metrics.restingHeartRate;

      if (!restingHR && metrics.heartRate && metrics.heartRate < 80) {
        restingHR = metrics.heartRate;
      }

      const maxHR = Math.round(208 - 0.7 * age);

      const hasHealthData = isHealthKitAuthorized || isHealthConnectAuthorized;
      const calculationMethod = restingHR
        ? "Karvonen (with actual resting HR)"
        : hasHealthData
          ? "Age-based Tanaka formula (no resting HR data yet)"
          : "Age-based Tanaka formula (connect health app for personalized zones)";

      console.log(
        `📊 Heart rate zone calculation method: ${calculationMethod}`,
      );
      console.log(
        `   Max HR: ${maxHR} bpm, Resting HR: ${restingHR || "not available"}`,
      );

      const calculateZone = (
        minPct: number,
        maxPct: number,
      ): { min: number; max: number } => {
        if (restingHR) {
          const heartRateReserve = maxHR - restingHR;
          return {
            min: Math.round(heartRateReserve * minPct + restingHR),
            max: Math.round(heartRateReserve * maxPct + restingHR),
          };
        } else {
          return {
            min: Math.round(maxHR * minPct),
            max: Math.round(maxHR * maxPct),
          };
        }
      };

      return {
        restingHR,
        maxHR,
        calculationMethod,
        zones: {
          zone1: {
            ...calculateZone(0.5, 0.6),
            name: "Recovery",
            description: "Light activity, active recovery",
          },
          zone2: {
            ...calculateZone(0.6, 0.7),
            name: "Aerobic Base",
            description: "Fat burning, endurance building",
          },
          zone3: {
            ...calculateZone(0.7, 0.8),
            name: "Aerobic",
            description: "Cardiovascular fitness improvement",
          },
          zone4: {
            ...calculateZone(0.8, 0.9),
            name: "Lactate Threshold",
            description: "Increased speed endurance",
          },
          zone5: {
            ...calculateZone(0.9, 1.0),
            name: "VO2 Max",
            description: "Maximum effort, anaerobic training",
          },
        },
      };
    } catch (error) {
      console.error("❌ Failed to get heart rate zones:", error);
      const maxHR = Math.round(208 - 0.7 * age);
      return {
        restingHR: undefined,
        maxHR,
        calculationMethod: "Age-based Tanaka formula (fallback)",
        zones: {
          zone1: {
            min: Math.round(maxHR * 0.5),
            max: Math.round(maxHR * 0.6),
            name: "Recovery",
            description: "Light activity, active recovery",
          },
          zone2: {
            min: Math.round(maxHR * 0.6),
            max: Math.round(maxHR * 0.7),
            name: "Aerobic Base",
            description: "Fat burning, endurance building",
          },
          zone3: {
            min: Math.round(maxHR * 0.7),
            max: Math.round(maxHR * 0.8),
            name: "Aerobic",
            description: "Cardiovascular fitness improvement",
          },
          zone4: {
            min: Math.round(maxHR * 0.8),
            max: Math.round(maxHR * 0.9),
            name: "Lactate Threshold",
            description: "Increased speed endurance",
          },
          zone5: {
            min: Math.round(maxHR * 0.9),
            max: maxHR,
            name: "VO2 Max",
            description: "Maximum effort, anaerobic training",
          },
        },
      };
    }
  },

  getSleepRecommendations: async (): Promise<SleepRecommendations> => {
    try {
      console.log("😴 Getting sleep-based workout recommendations...");

      const { isHealthKitAuthorized, settings } = get();

      if (isHealthKitAuthorized && settings.dataTypesToSync.sleep) {
        const recommendations =
          await healthKitService.getSleepBasedWorkoutRecommendations();

        if (
          recommendations.sleepQuality !== null &&
          recommendations.sleepDuration !== null
        ) {
          console.log(
            `✅ Got sleep recommendations from HealthKit: ${recommendations.sleepQuality} quality, ${recommendations.sleepDuration}h`,
          );
          return {
            sleepQuality: recommendations.sleepQuality,
            sleepDuration: recommendations.sleepDuration,
            workoutRecommendations: recommendations.recommendations,
          };
        }
      }

      const { isHealthConnectAvailable, isHealthConnectAuthorized } = get();
      if (isHealthConnectAvailable && isHealthConnectAuthorized) {
        const metrics = get().metrics;
        if (metrics.sleepHours && metrics.sleepHours > 0) {
          let sleepQuality: "poor" | "fair" | "good" | "excellent" = "fair";
          if (metrics.sleepHours < 6) sleepQuality = "poor";
          else if (metrics.sleepHours < 7) sleepQuality = "fair";
          else if (metrics.sleepHours < 9) sleepQuality = "good";
          else sleepQuality = "excellent";

          const intensityAdjustment =
            sleepQuality === "poor"
              ? -2
              : sleepQuality === "fair"
                ? -1
                : sleepQuality === "good"
                  ? 0
                  : 1;
          const workoutType =
            sleepQuality === "poor"
              ? "recovery"
              : sleepQuality === "fair"
                ? "light"
                : sleepQuality === "good"
                  ? "moderate"
                  : "intense";
          const duration =
            sleepQuality === "poor" || sleepQuality === "fair"
              ? "shorter"
              : sleepQuality === "good"
                ? "normal"
                : "longer";

          console.log(
            `✅ Got sleep recommendations from Health Connect: ${sleepQuality} quality, ${metrics.sleepHours}h`,
          );
          return {
            sleepQuality,
            sleepDuration: metrics.sleepHours,
            workoutRecommendations: {
              intensityAdjustment,
              workoutType,
              duration,
              notes: [
                `Sleep quality: ${sleepQuality}`,
                `${metrics.sleepHours.toFixed(1)} hours of sleep`,
              ],
            },
          };
        }
      }

      console.log("ℹ️ No sleep data available from health sources");
      return {
        sleepQuality: null,
        sleepDuration: null,
        workoutRecommendations: null,
      };
    } catch (error) {
      console.error("❌ Failed to get sleep recommendations:", error);
      return {
        sleepQuality: null,
        sleepDuration: null,
        workoutRecommendations: null,
      };
    }
  },

  getActivityAdjustedCalories: async (
    baseCalories: number,
  ): Promise<ActivityAdjustedCalories> => {
    try {
      console.log("🔥 Getting activity-adjusted calories...");

      const {
        isHealthKitAuthorized,
        isHealthConnectAuthorized,
        isHealthConnectAvailable,
        metrics,
        settings,
      } = get();

      if (isHealthKitAuthorized && settings.dataTypesToSync.workouts) {
        const result =
          await healthKitService.getActivityAdjustedCalories(baseCalories);

        if (
          result.activityMultiplier !== 1.0 ||
          result.breakdown.activeEnergy > 0
        ) {
          console.log(
            `✅ Got activity-adjusted calories from HealthKit: ${result.adjustedCalories} (${result.activityMultiplier}x)`,
          );
          return result;
        }
      }

      if (isHealthConnectAvailable && isHealthConnectAuthorized) {
        const activeEnergy = metrics.activeCalories || 0;
        const steps = metrics.steps || 0;

        let activityMultiplier = 1.0;
        if (activeEnergy > 600 || steps > 15000) activityMultiplier = 1.2;
        else if (activeEnergy > 400 || steps > 10000) activityMultiplier = 1.15;
        else if (activeEnergy > 200 || steps > 7500) activityMultiplier = 1.1;
        else if (activeEnergy > 100 || steps > 5000) activityMultiplier = 1.05;
        else if (activeEnergy < 50 && steps < 2000) activityMultiplier = 0.95;

        const stepBonus = Math.floor(steps / 1000) * 20;
        const exerciseBonus = Math.round(activeEnergy * 0.1);
        const adjustedCalories = Math.round(baseCalories * activityMultiplier);

        console.log(
          `✅ Got activity-adjusted calories from Health Connect: ${adjustedCalories} (${activityMultiplier}x)`,
        );

        const recommendations: string[] = [];
        if (activityMultiplier < 1.0) {
          recommendations.push(
            "Your activity level is below average. Consider adding a short walk or light exercise.",
          );
        }
        if (steps < 5000) {
          recommendations.push(
            `You've taken ${steps.toLocaleString()} steps today. Aim for 7,500-10,000 steps for optimal health.`,
          );
        } else if (steps >= 10000) {
          recommendations.push(
            `Great job! You've hit ${steps.toLocaleString()} steps today.`,
          );
        }
        if (activeEnergy < 200) {
          recommendations.push(
            "Consider adding 20-30 minutes of moderate exercise to boost your active calorie burn.",
          );
        } else if (activeEnergy >= 500) {
          recommendations.push(
            `Excellent activity level! You've burned ${activeEnergy} active calories today.`,
          );
        }
        if (recommendations.length === 0) {
          recommendations.push(
            "You're on track with your activity goals. Keep it up!",
          );
        }

        return {
          adjustedCalories,
          activityMultiplier,
          breakdown: {
            baseCalories,
            activeEnergy,
            exerciseBonus,
            stepBonus,
          },
          recommendations,
        };
      }

      console.log("ℹ️ No activity data available - using base calories");
      return {
        adjustedCalories: baseCalories,
        activityMultiplier: 1.0,
        breakdown: {
          baseCalories,
          activeEnergy: 0,
          exerciseBonus: 0,
          stepBonus: 0,
        },
        recommendations: [
          "Connect to Apple Health or Health Connect to get personalized calorie adjustments based on your activity",
        ],
      };
    } catch (error) {
      console.error("❌ Failed to get activity-adjusted calories:", error);
      return {
        adjustedCalories: baseCalories,
        activityMultiplier: 1.0,
        breakdown: {
          baseCalories,
          activeEnergy: 0,
          exerciseBonus: 0,
          stepBonus: 0,
        },
        recommendations: [
          "Error calculating activity adjustment - using base calories",
        ],
      };
    }
  },
});
