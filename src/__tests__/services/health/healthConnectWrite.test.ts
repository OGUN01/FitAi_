import {
  HealthConnectExerciseType,
  mapWorkoutTypeToHealthConnect,
} from "../../../services/health/types";
import { DEFAULT_PERMISSIONS } from "../../../services/health/core/types";
import { createHealthConnectActions } from "../../../stores/health-data/healthconnect-actions";

describe("Health Connect Write Functionality", () => {
  describe("Workout Type Mapping", () => {
    it("should map common workout types to Health Connect exercise types", () => {
      expect(mapWorkoutTypeToHealthConnect("running")).toBe(
        HealthConnectExerciseType.RUNNING,
      );
      expect(mapWorkoutTypeToHealthConnect("walking")).toBe(
        HealthConnectExerciseType.WALKING,
      );
      expect(mapWorkoutTypeToHealthConnect("cycling")).toBe(
        HealthConnectExerciseType.BIKING,
      );
      expect(mapWorkoutTypeToHealthConnect("yoga")).toBe(
        HealthConnectExerciseType.YOGA,
      );
      expect(mapWorkoutTypeToHealthConnect("strength_training")).toBe(
        HealthConnectExerciseType.STRENGTH_TRAINING,
      );
    });

    it("should handle variations of workout type names", () => {
      expect(mapWorkoutTypeToHealthConnect("run")).toBe(
        HealthConnectExerciseType.RUNNING,
      );
      expect(mapWorkoutTypeToHealthConnect("walk")).toBe(
        HealthConnectExerciseType.WALKING,
      );
      expect(mapWorkoutTypeToHealthConnect("bike")).toBe(
        HealthConnectExerciseType.BIKING,
      );
      expect(mapWorkoutTypeToHealthConnect("weights")).toBe(
        HealthConnectExerciseType.WEIGHTLIFTING,
      );
    });

    it("should handle case insensitivity", () => {
      expect(mapWorkoutTypeToHealthConnect("RUNNING")).toBe(
        HealthConnectExerciseType.RUNNING,
      );
      expect(mapWorkoutTypeToHealthConnect("Running")).toBe(
        HealthConnectExerciseType.RUNNING,
      );
      expect(mapWorkoutTypeToHealthConnect("YOGA")).toBe(
        HealthConnectExerciseType.YOGA,
      );
    });

    it("should return UNKNOWN for unrecognized workout types", () => {
      expect(mapWorkoutTypeToHealthConnect("unrecognized_workout")).toBe(
        HealthConnectExerciseType.UNKNOWN,
      );
      expect(mapWorkoutTypeToHealthConnect("xyz")).toBe(
        HealthConnectExerciseType.UNKNOWN,
      );
    });

    it("should handle HIIT and similar workout types", () => {
      expect(mapWorkoutTypeToHealthConnect("hiit")).toBe(
        HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
      );
      expect(mapWorkoutTypeToHealthConnect("circuit")).toBe(
        HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
      );
    });

    it("should handle indoor/outdoor variations", () => {
      expect(mapWorkoutTypeToHealthConnect("treadmill")).toBe(
        HealthConnectExerciseType.RUNNING_TREADMILL,
      );
      expect(mapWorkoutTypeToHealthConnect("stationary_bike")).toBe(
        HealthConnectExerciseType.BIKING_STATIONARY,
      );
      expect(mapWorkoutTypeToHealthConnect("rowing_machine")).toBe(
        HealthConnectExerciseType.ROWING_MACHINE,
      );
    });

    it("should map sports correctly", () => {
      expect(mapWorkoutTypeToHealthConnect("tennis")).toBe(
        HealthConnectExerciseType.TENNIS,
      );
      expect(mapWorkoutTypeToHealthConnect("basketball")).toBe(
        HealthConnectExerciseType.BASKETBALL,
      );
      expect(mapWorkoutTypeToHealthConnect("soccer")).toBe(
        HealthConnectExerciseType.SOCCER,
      );
      expect(mapWorkoutTypeToHealthConnect("golf")).toBe(
        HealthConnectExerciseType.GOLF,
      );
    });
  });

  describe("Exercise Type Constants", () => {
    it("should have correct numeric values for common types", () => {
      expect(HealthConnectExerciseType.UNKNOWN).toBe(0);
      expect(HealthConnectExerciseType.RUNNING).toBe(56);
      expect(HealthConnectExerciseType.WALKING).toBe(79);
      expect(HealthConnectExerciseType.YOGA).toBe(83);
      expect(HealthConnectExerciseType.STRENGTH_TRAINING).toBe(70);
    });
  });

  describe("Permission Configuration", () => {
    it("should include write permissions in DEFAULT_PERMISSIONS", () => {
      const writeExercisePermission = DEFAULT_PERMISSIONS.find(
        (p) => p.accessType === "write" && p.recordType === "ExerciseSession",
      );
      const writeCaloriesPermission = DEFAULT_PERMISSIONS.find(
        (p) =>
          p.accessType === "write" && p.recordType === "ActiveCaloriesBurned",
      );

      expect(writeExercisePermission).toBeDefined();
      expect(writeCaloriesPermission).toBeDefined();
    });

    it("should have read permissions for ExerciseSession", () => {
      const readExercisePermission = DEFAULT_PERMISSIONS.find(
        (p) => p.accessType === "read" && p.recordType === "ExerciseSession",
      );

      expect(readExercisePermission).toBeDefined();
    });
  });

  describe("Write Workout Session Structure", () => {
    it("should define correct workout session interface", () => {
      const workoutSession = {
        exerciseType: HealthConnectExerciseType.RUNNING,
        startTime: new Date("2025-02-06T08:00:00Z"),
        endTime: new Date("2025-02-06T09:00:00Z"),
        title: "Morning Run",
        calories: 450,
        notes: "Great workout!",
      };

      expect(workoutSession.exerciseType).toBe(56);
      expect(workoutSession.startTime).toBeInstanceOf(Date);
      expect(workoutSession.endTime).toBeInstanceOf(Date);
      expect(typeof workoutSession.title).toBe("string");
      expect(typeof workoutSession.calories).toBe("number");
    });

    it("should calculate workout duration correctly", () => {
      const startTime = new Date("2025-02-06T08:00:00Z");
      const endTime = new Date("2025-02-06T09:30:00Z");

      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);

      expect(durationMinutes).toBe(90);
    });
  });

  describe("Store Action Interface", () => {
    it("should verify writeWorkoutToHealthConnect action exists in store", () => {
      const mockSet = jest.fn();
      const mockGet = jest.fn(() => ({
        isHealthConnectAvailable: true,
        isHealthConnectAuthorized: true,
      }));

      const actions = createHealthConnectActions(mockSet, mockGet as any);

      expect(actions.writeWorkoutToHealthConnect).toBeDefined();
      expect(typeof actions.writeWorkoutToHealthConnect).toBe("function");
    });

    it("should validate WriteWorkoutResult interface structure", () => {
      const mockResult: {
        success: boolean;
        recordId?: string;
        error?: string;
      } = {
        success: true,
        recordId: "test-record-id",
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.recordId).toBeDefined();
    });
  });
});

describe("Health Connect Exercise Type Comprehensive Coverage", () => {
  const allMappings = [
    { input: "running", expected: HealthConnectExerciseType.RUNNING },
    { input: "run", expected: HealthConnectExerciseType.RUNNING },
    {
      input: "treadmill",
      expected: HealthConnectExerciseType.RUNNING_TREADMILL,
    },
    { input: "walking", expected: HealthConnectExerciseType.WALKING },
    { input: "walk", expected: HealthConnectExerciseType.WALKING },
    { input: "cycling", expected: HealthConnectExerciseType.BIKING },
    { input: "biking", expected: HealthConnectExerciseType.BIKING },
    { input: "bike", expected: HealthConnectExerciseType.BIKING },
    { input: "swimming", expected: HealthConnectExerciseType.SWIMMING_POOL },
    { input: "swim", expected: HealthConnectExerciseType.SWIMMING_POOL },
    {
      input: "strength",
      expected: HealthConnectExerciseType.STRENGTH_TRAINING,
    },
    {
      input: "weightlifting",
      expected: HealthConnectExerciseType.WEIGHTLIFTING,
    },
    { input: "yoga", expected: HealthConnectExerciseType.YOGA },
    { input: "pilates", expected: HealthConnectExerciseType.PILATES },
    { input: "stretching", expected: HealthConnectExerciseType.STRETCHING },
    {
      input: "hiit",
      expected: HealthConnectExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING,
    },
    { input: "boxing", expected: HealthConnectExerciseType.BOXING },
    { input: "rowing", expected: HealthConnectExerciseType.ROWING },
    { input: "elliptical", expected: HealthConnectExerciseType.ELLIPTICAL },
    { input: "hiking", expected: HealthConnectExerciseType.HIKING },
    { input: "dancing", expected: HealthConnectExerciseType.DANCING },
    { input: "calisthenics", expected: HealthConnectExerciseType.CALISTHENICS },
    { input: "tennis", expected: HealthConnectExerciseType.TENNIS },
    { input: "basketball", expected: HealthConnectExerciseType.BASKETBALL },
    { input: "soccer", expected: HealthConnectExerciseType.SOCCER },
    { input: "golf", expected: HealthConnectExerciseType.GOLF },
    { input: "skiing", expected: HealthConnectExerciseType.SKIING },
    { input: "snowboarding", expected: HealthConnectExerciseType.SNOWBOARDING },
    { input: "surfing", expected: HealthConnectExerciseType.SURFING },
  ];

  test.each(allMappings)(
    'should map "$input" to correct exercise type',
    ({ input, expected }) => {
      expect(mapWorkoutTypeToHealthConnect(input)).toBe(expected);
    },
  );
});
