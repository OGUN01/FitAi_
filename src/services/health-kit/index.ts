import { healthKitService, HealthKitService } from "./health-kit-service";

export { healthKitService, HealthKitService };
export type {
  HealthKitData,
  HealthKitWorkout,
  HealthKitPermissionsStatus,
  HealthSyncResult,
  WorkoutInput,
  WorkoutExportInput,
  NutritionExportInput,
} from "./types";
export { fetchHealthData, getLastSyncTime } from "./data-fetcher";
export {
  saveWorkoutToHealthKit,
  saveStepsToHealthKit,
  saveWeightToHealthKit,
} from "./data-writer";
export { requestAuthorization, hasPermissions } from "./permissions";
export { SyncManager } from "./sync-manager";

export default healthKitService;
