import GoogleFit from "react-native-google-fit";
import { GoogleFitData, GoogleFitSyncResult } from "./types";

export class GoogleFitDataReader {
  async syncHealthData(
    daysBack: number = 7,
    hasPermissions: () => Promise<boolean>,
  ): Promise<GoogleFitSyncResult> {
    const startTime = Date.now();

    try {
      if (!(await hasPermissions())) {
        return {
          success: false,
          error:
            "Google Fit permissions not granted. Please enable in settings.",
        };
      }

      console.log(`📥 Syncing Google Fit data from last ${daysBack} days...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const googleFitData: GoogleFitData = {};

      try {
        const stepsData = await GoogleFit.getDailyStepCountSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (Array.isArray(stepsData) && stepsData.length > 0) {
          const latestSteps = stepsData[stepsData.length - 1] as any;
          googleFitData.steps = latestSteps.steps || 0;
          console.log(`👟 Steps: ${googleFitData.steps}`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch steps data:", error);
      }

      try {
        const caloriesData = await GoogleFit.getDailyCalorieSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (caloriesData.length > 0) {
          const totalCalories = caloriesData.reduce(
            (sum, entry) => sum + (entry.calorie || 0),
            0,
          );
          googleFitData.calories = Math.round(totalCalories);
          console.log(`🔥 Calories: ${googleFitData.calories}`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch calories data:", error);
      }

      try {
        const distanceData = await GoogleFit.getDailyDistanceSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (distanceData.length > 0) {
          const totalDistance = distanceData.reduce(
            (sum, entry) => sum + (entry.distance || 0),
            0,
          );
          googleFitData.distance = Math.round(totalDistance);
          console.log(`📏 Distance: ${googleFitData.distance}m`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch distance data:", error);
      }

      try {
        const heartRateData = await GoogleFit.getHeartRateSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (heartRateData.length > 0) {
          const latestHR = heartRateData[heartRateData.length - 1];
          googleFitData.heartRate = Math.round(latestHR.value || 0);
          console.log(`❤️ Heart Rate: ${googleFitData.heartRate} BPM`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch heart rate data:", error);
      }

      try {
        const weightData = await GoogleFit.getWeightSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (weightData.length > 0) {
          const latestWeight = weightData[weightData.length - 1];
          googleFitData.weight =
            Math.round((latestWeight.value || 0) * 10) / 10;
          console.log(`⚖️ Weight: ${googleFitData.weight} kg`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch weight data:", error);
      }

      try {
        const sleepData = await GoogleFit.getSleepSamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          // @ts-ignore - GoogleFit library type signature issue
          (err: any, res: any) => {
            if (err) {
              console.warn("⚠️ Sleep fetch error:", err);
            }
          },
        );

        if (Array.isArray(sleepData) && sleepData.length > 0) {
          googleFitData.sleepData = sleepData.map(
            (sleep: any, index: number) => ({
              id: `googlefit_sleep_${index}`,
              startDate: sleep.startDate,
              endDate: sleep.endDate,
              duration: Math.round(
                (new Date(sleep.endDate).getTime() -
                  new Date(sleep.startDate).getTime()) /
                  60000,
              ),
            }),
          );

          console.log(`😴 Sleep sessions: ${googleFitData.sleepData.length}`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch sleep data:", error);
      }

      googleFitData.lastSyncDate = endDate.toISOString();

      const syncTime = Date.now() - startTime;
      console.log(`✅ Google Fit sync completed in ${syncTime}ms`);

      return {
        success: true,
        data: googleFitData,
        syncTime,
      };
    } catch (error) {
      console.error("❌ Google Fit sync failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Google Fit sync error",
        syncTime: Date.now() - startTime,
      };
    }
  }

  async getHeartRateSamples(
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    try {
      return await GoogleFit.getHeartRateSamples({
        startDate,
        endDate,
      });
    } catch (error) {
      console.warn("⚠️ Failed to fetch heart rate samples:", error);
      return [];
    }
  }

  async getSleepSamples(startDate: string, endDate: string): Promise<any[]> {
    try {
      const sleepData = await GoogleFit.getSleepSamples(
        {
          startDate,
          endDate,
        },
        // @ts-ignore - GoogleFit library type signature issue
        (err: any, res: any) => {
          if (err) {
            console.warn("⚠️ Sleep fetch error:", err);
          }
        },
      );
      return Array.isArray(sleepData) ? sleepData : [];
    } catch (error) {
      console.warn("⚠️ Failed to fetch sleep samples:", error);
      return [];
    }
  }

  async getStepsSamples(startDate: string, endDate: string): Promise<any[]> {
    try {
      const stepsData = await GoogleFit.getDailyStepCountSamples({
        startDate,
        endDate,
      });
      return Array.isArray(stepsData) ? stepsData : [];
    } catch (error) {
      console.warn("⚠️ Failed to fetch steps samples:", error);
      return [];
    }
  }

  async getDistanceSamples(startDate: string, endDate: string): Promise<any[]> {
    try {
      return await GoogleFit.getDailyDistanceSamples({
        startDate,
        endDate,
      });
    } catch (error) {
      console.warn("⚠️ Failed to fetch distance samples:", error);
      return [];
    }
  }
}
