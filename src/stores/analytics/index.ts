export { useAnalyticsStore } from "../analyticsStore";
export * from "./types";
export {
  createTrackWorkoutCompleted,
  createTrackWellnessMetrics,
  createTrackBodyComposition,
  createGetAnalyticsForPeriod,
  createGetPersonalizedRecommendation,
} from "./analyticsHelpers";
export type {
  TrackWorkoutData,
  TrackWellnessData,
  TrackBodyData,
} from "./analyticsHelpers";

import { useAnalyticsStore } from "../analyticsStore";
import {
  createTrackWorkoutCompleted,
  createTrackWellnessMetrics,
  createTrackBodyComposition,
  createGetAnalyticsForPeriod,
  createGetPersonalizedRecommendation,
  TrackWorkoutData,
  TrackWellnessData,
  TrackBodyData,
} from "./analyticsHelpers";
import { TimePeriod } from "./types";

export const analyticsHelpers = {
  trackWorkoutCompleted: async (workoutData: TrackWorkoutData) => {
    const store = useAnalyticsStore.getState();
    const trackFn = createTrackWorkoutCompleted(() => store);
    await trackFn(workoutData);
  },

  trackWellnessMetrics: async (wellnessData: TrackWellnessData) => {
    const store = useAnalyticsStore.getState();
    const trackFn = createTrackWellnessMetrics(() => store);
    await trackFn(wellnessData);
  },

  trackBodyComposition: async (bodyData: TrackBodyData) => {
    const store = useAnalyticsStore.getState();
    const trackFn = createTrackBodyComposition(() => store);
    await trackFn(bodyData);
  },

  getAnalyticsForPeriod: async (period: TimePeriod) => {
    const store = useAnalyticsStore.getState();
    const getFn = createGetAnalyticsForPeriod(() => store);
    return await getFn(period);
  },

  getPersonalizedRecommendation: (): string => {
    const store = useAnalyticsStore.getState();
    const getFn = createGetPersonalizedRecommendation(() => store);
    return getFn();
  },
};

export default useAnalyticsStore;
