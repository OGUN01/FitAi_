import {
  HeartRateZones,
  SleepRecommendations,
  ActivityAdjustedCalories,
  ActivityDetectionResult,
  GoogleFitSyncResult,
  WorkoutExportData,
} from "./types";
import { GoogleFitDataReader } from "./data-reading";
import { GoogleFitDataWriter } from "./data-writing";

export class GoogleFitAnalytics {
  constructor(
    private dataReader: GoogleFitDataReader,
    private dataWriter: GoogleFitDataWriter,
  ) {}

  async getHeartRateZones(age: number): Promise<HeartRateZones> {
    try {

      let restingHR: number | undefined;
      try {
        const today = new Date();
        const sevenDaysAgo = new Date(
          today.getTime() - 7 * 24 * 60 * 60 * 1000,
        );

        const heartRateData = await this.dataReader.getHeartRateSamples(
          sevenDaysAgo.toISOString(),
          today.toISOString(),
        );

        if (Array.isArray(heartRateData) && heartRateData.length > 0) {
          const restingReadings = heartRateData.filter(
            (hr: any) => hr.value < 100,
          );
          if (restingReadings.length > 0) {
            const avgResting =
              restingReadings.reduce(
                (sum: number, hr: any) => sum + hr.value,
                0,
              ) / restingReadings.length;
            restingHR = Math.round(avgResting);
          }
        }
      } catch (error) {
      }

      const maxHR = 220 - age;
      const baseResting = restingHR || maxHR * 0.3;
      const hrReserve = maxHR - baseResting;

      const zones = {
        zone1: {
          min: Math.round(baseResting + hrReserve * 0.5),
          max: Math.round(baseResting + hrReserve * 0.6),
          name: "Recovery",
        },
        zone2: {
          min: Math.round(baseResting + hrReserve * 0.6),
          max: Math.round(baseResting + hrReserve * 0.7),
          name: "Aerobic Base",
        },
        zone3: {
          min: Math.round(baseResting + hrReserve * 0.7),
          max: Math.round(baseResting + hrReserve * 0.8),
          name: "Aerobic",
        },
        zone4: {
          min: Math.round(baseResting + hrReserve * 0.8),
          max: Math.round(baseResting + hrReserve * 0.9),
          name: "Lactate Threshold",
        },
        zone5: {
          min: Math.round(baseResting + hrReserve * 0.9),
          max: maxHR,
          name: "VO2 Max",
        },
      };

      return { restingHR, maxHR, zones };
    } catch (error) {
      console.error("❌ Failed to calculate heart rate zones:", error);
      const maxHR = 220 - age;
      return {
        maxHR,
        zones: {
          zone1: {
            min: Math.round(maxHR * 0.5),
            max: Math.round(maxHR * 0.6),
            name: "Recovery",
          },
          zone2: {
            min: Math.round(maxHR * 0.6),
            max: Math.round(maxHR * 0.7),
            name: "Aerobic Base",
          },
          zone3: {
            min: Math.round(maxHR * 0.7),
            max: Math.round(maxHR * 0.8),
            name: "Aerobic",
          },
          zone4: {
            min: Math.round(maxHR * 0.8),
            max: Math.round(maxHR * 0.9),
            name: "Lactate Threshold",
          },
          zone5: { min: Math.round(maxHR * 0.9), max: maxHR, name: "VO2 Max" },
        },
      };
    }
  }

  async getSleepBasedWorkoutRecommendations(): Promise<SleepRecommendations> {
    try {

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const sleepData = await this.dataReader.getSleepSamples(
        yesterday.toISOString(),
        today.toISOString(),
      );

      let sleepDuration = 0;
      let sleepQuality: "poor" | "fair" | "good" | "excellent" = "fair";

      if (sleepData.length > 0) {
        sleepDuration = sleepData.reduce((total, sleep) => {
          const startTime = new Date(sleep.startDate).getTime();
          const endTime = new Date(sleep.endDate).getTime();
          return total + (endTime - startTime) / (1000 * 60 * 60);
        }, 0);

        if (sleepDuration < 6) {
          sleepQuality = "poor";
        } else if (sleepDuration < 7) {
          sleepQuality = "fair";
        } else if (sleepDuration < 9) {
          sleepQuality = "good";
        } else {
          sleepQuality = "excellent";
        }
      } else {
        return {
          sleepQuality: "fair" as "poor" | "fair" | "good" | "excellent",
          sleepDuration: 0,
          recommendations: {
            intensityAdjustment: 0,
            workoutType: "moderate" as
              | "recovery"
              | "light"
              | "moderate"
              | "intense",
            duration: "normal" as "shorter" | "normal" | "longer",
            notes: ["No sleep data available"],
          },
        };
      }

      let intensityAdjustment = 0;
      let workoutType: "recovery" | "light" | "moderate" | "intense" =
        "moderate";
      let duration: "shorter" | "normal" | "longer" = "normal";
      const notes: string[] = [];

      switch (sleepQuality) {
        case "poor":
          intensityAdjustment = -2;
          workoutType = "recovery";
          duration = "shorter";
          notes.push("Low sleep detected - focus on recovery");
          notes.push("Consider yoga or light stretching");
          notes.push("Hydrate well and avoid high intensity");
          break;

        case "fair":
          intensityAdjustment = -1;
          workoutType = "light";
          duration = "shorter";
          notes.push("Moderate sleep - light workout recommended");
          notes.push("Focus on form and mindful movement");
          break;

        case "good":
          intensityAdjustment = 0;
          workoutType = "moderate";
          duration = "normal";
          notes.push("Good sleep - normal workout intensity");
          notes.push("You're ready for your planned workout");
          break;

        case "excellent":
          intensityAdjustment = 1;
          workoutType = "intense";
          duration = "longer";
          notes.push("Excellent sleep - ready for high intensity");
          notes.push("Consider adding extra sets or duration");
          break;
      }


      return {
        sleepQuality,
        sleepDuration,
        recommendations: {
          intensityAdjustment,
          workoutType,
          duration,
          notes,
        },
      };
    } catch (error) {
      console.error("❌ Failed to analyze sleep data:", error);
      return {
        sleepQuality: "fair",
        sleepDuration: 7,
        recommendations: {
          intensityAdjustment: 0,
          workoutType: "moderate",
          duration: "normal",
          notes: ["Sleep data unavailable - proceeding with normal workout"],
        },
      };
    }
  }

  async getActivityAdjustedCalories(
    baseCalories: number,
    hasPermissions: () => Promise<boolean>,
  ): Promise<ActivityAdjustedCalories> {
    try {

      const healthData = await this.dataReader.syncHealthData(
        1,
        hasPermissions,
      );

      if (!healthData.success || !healthData.data) {
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
            "Activity data unavailable - using baseline calories",
          ],
        };
      }

      const data = healthData.data;
      const activeEnergy = data.calories || 0;
      const steps = data.steps || 0;
      const activeMinutes = data.activeMinutes || 0;

      let activityMultiplier = 1.0;
      let exerciseBonus = 0;
      let stepBonus = 0;

      if (activeMinutes > 30) {
        exerciseBonus = Math.min((activeMinutes - 30) * 5, 100);
      }

      if (steps > 10000) {
        stepBonus = Math.min(((steps - 10000) / 1000) * 25, 75);
      }

      if (activeEnergy > 600) {
        activityMultiplier = 1.15;
      } else if (activeEnergy > 400) {
        activityMultiplier = 1.1;
      } else if (activeEnergy > 200) {
        activityMultiplier = 1.05;
      } else {
        activityMultiplier = 0.95;
      }

      const adjustedCalories = Math.round(
        baseCalories * activityMultiplier + exerciseBonus + stepBonus,
      );

      const recommendations: string[] = [];

      if (activeEnergy > 500) {
        recommendations.push(
          "High activity detected - increased calorie target",
        );
      } else if (activeEnergy < 200) {
        recommendations.push("Low activity today - consider a light workout");
      }

      if (activeMinutes > 45) {
        recommendations.push("Great active minutes! Added bonus calories");
      }

      if (steps > 12000) {
        recommendations.push("Excellent step count! Step bonus applied");
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
    } catch (error) {
      console.error(
        "❌ Failed to calculate activity-adjusted calories:",
        error,
      );
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
  }

  async detectAndLogActivities(
    hasPermissions: () => Promise<boolean>,
  ): Promise<ActivityDetectionResult> {
    try {

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      const activities: Array<{
        type: string;
        confidence: number;
        duration: number;
        startTime: string;
        endTime: string;
      }> = [];

      try {
        const stepsData = await this.dataReader.getStepsSamples(
          startOfDay.toISOString(),
          today.toISOString(),
        );

        if (Array.isArray(stepsData) && stepsData.length > 0) {
          const totalSteps =
            (stepsData[stepsData.length - 1] as any).steps || 0;

          if (totalSteps > 1000) {
            activities.push({
              type: "walking",
              confidence: totalSteps > 5000 ? 0.8 : 0.6,
              duration: Math.round(totalSteps / 100),
              startTime: startOfDay.toISOString(),
              endTime: today.toISOString(),
            });
          }
        }
      } catch (error) {
      }

      try {
        const distanceData = await this.dataReader.getDistanceSamples(
          startOfDay.toISOString(),
          today.toISOString(),
        );

        if (distanceData.length > 0) {
          const totalDistance = distanceData.reduce(
            (sum, entry) => sum + (entry.distance || 0),
            0,
          );
          const distanceKm = totalDistance / 1000;

          if (distanceKm > 2) {
            const avgSpeed = distanceKm / 1;

            if (avgSpeed > 15) {
              activities.push({
                type: "cycling",
                confidence: 0.7,
                duration: 60,
                startTime: startOfDay.toISOString(),
                endTime: today.toISOString(),
              });
            } else if (avgSpeed > 6) {
              activities.push({
                type: "running",
                confidence: 0.8,
                duration: Math.round((distanceKm / avgSpeed) * 60),
                startTime: startOfDay.toISOString(),
                endTime: today.toISOString(),
              });
            }
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to detect running/cycling activity:", error);
      }

      let autoLoggedCount = 0;
      for (const activity of activities) {
        if (activity.confidence > 0.7 && activity.duration > 15) {
          try {
            await this.dataWriter.exportWorkout(
              {
                type: activity.type,
                name: `Auto-detected ${activity.type}`,
                startDate: new Date(activity.startTime),
                endDate: new Date(activity.endTime),
                calories: Math.round(activity.duration * 5),
              },
              hasPermissions,
            );
            autoLoggedCount++;
          } catch (error) {
          }
        }
      }


      return {
        detectedActivities: activities,
        autoLoggedCount,
      };
    } catch (error) {
      console.error("❌ Failed to detect activities:", error);
      return {
        detectedActivities: [],
        autoLoggedCount: 0,
      };
    }
  }
}
