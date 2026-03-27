import { createSupabaseMock, SupabaseMock } from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;

jest.mock("../../services/supabase", () => {
  const { createSupabaseMock: createMock } = jest.requireActual(
    "../helpers/supabaseMock",
  );
  mockSupabase = createMock();
  return { supabase: mockSupabase };
});

jest.mock("../../utils/uuid", () => ({
  generateUUID: () => "generated-uuid-001",
  isValidUUID: () => true,
}));

import {
  workoutTemplateService,
  WorkoutTemplate,
  TemplateExercise,
} from "../../services/workoutTemplateService";

const TEST_USER_ID = "test-user-id";

const sampleExercises: TemplateExercise[] = [
  {
    exerciseId: "push_up",
    name: "Push-Up",
    sets: 3,
    repRange: [8, 15],
    restSeconds: 60,
  },
  {
    exerciseId: "squat",
    name: "Bodyweight Squat",
    sets: 3,
    repRange: [12, 20],
    restSeconds: 60,
  },
];

const sampleTemplateRow = {
  id: "tpl-001",
  user_id: TEST_USER_ID,
  name: "Push Pull Legs - Push",
  description: "Chest and triceps focus",
  exercises: sampleExercises,
  target_muscle_groups: ["chest", "triceps"],
  estimated_duration_minutes: 45,
  is_public: false,
  usage_count: 0,
  created_at: "2026-03-26T08:00:00.000Z",
  updated_at: "2026-03-26T08:00:00.000Z",
};

describe("WorkoutTemplateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const tables = mockSupabase._tables;
    for (const key of Object.keys(tables)) {
      delete tables[key];
    }
  });

  describe("createTemplate", () => {
    it("inserts correct row and returns mapped template", async () => {
      const qb = mockSupabase.from("workout_templates");
      qb._resolve({ data: sampleTemplateRow, error: null });

      const result = await workoutTemplateService.createTemplate(TEST_USER_ID, {
        name: "Push Pull Legs - Push",
        description: "Chest and triceps focus",
        exercises: sampleExercises,
        targetMuscleGroups: ["chest", "triceps"],
        estimatedDurationMinutes: 45,
        isPublic: false,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("workout_templates");
      expect(qb.insert).toHaveBeenCalled();
      expect(qb.select).toHaveBeenCalled();
      expect(result.name).toBe("Push Pull Legs - Push");
      expect(result.userId).toBe(TEST_USER_ID);
    });
  });

  describe("getTemplates", () => {
    it("returns user templates", async () => {
      const qb = mockSupabase.from("workout_templates");
      qb._resolve({ data: [sampleTemplateRow], error: null });

      const result = await workoutTemplateService.getTemplates(TEST_USER_ID);

      expect(qb.select).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Push Pull Legs - Push");
    });
  });

  describe("deleteTemplate", () => {
    it("calls delete with correct eq filters", async () => {
      const qb = mockSupabase.from("workout_templates");
      qb._resolve({ data: null, error: null });

      await workoutTemplateService.deleteTemplate("tpl-001", TEST_USER_ID);

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith("id", "tpl-001");
      expect(qb.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    });
  });

  describe("duplicateTemplate", () => {
    it('creates copy with "(Copy)" suffix', async () => {
      const qb = mockSupabase.from("workout_templates");
      qb._resolve({ data: [sampleTemplateRow], error: null });

      const originalGetTemplates = workoutTemplateService.getTemplates.bind(
        workoutTemplateService,
      );
      const originalCreateTemplate = workoutTemplateService.createTemplate.bind(
        workoutTemplateService,
      );

      jest
        .spyOn(workoutTemplateService, "getTemplates")
        .mockImplementation(async (userId) => {
          return [
            {
              id: "tpl-001",
              userId: TEST_USER_ID,
              name: "Push Pull Legs - Push",
              description: "Chest and triceps focus",
              exercises: sampleExercises,
              targetMuscleGroups: ["chest", "triceps"],
              estimatedDurationMinutes: 45,
              isPublic: false,
              usageCount: 0,
              createdAt: "2026-03-26T08:00:00.000Z",
              updatedAt: "2026-03-26T08:00:00.000Z",
            },
          ];
        });

      jest
        .spyOn(workoutTemplateService, "createTemplate")
        .mockImplementation(async (userId, input) => {
          return {
            id: "generated-uuid-001",
            userId,
            name: input.name,
            exercises: input.exercises,
            targetMuscleGroups: input.targetMuscleGroups,
            isPublic: input.isPublic,
            usageCount: 0,
            createdAt: "2026-03-26T08:00:00.000Z",
            updatedAt: "2026-03-26T08:00:00.000Z",
          };
        });

      const result = await workoutTemplateService.duplicateTemplate(
        "tpl-001",
        TEST_USER_ID,
      );

      expect(result.name).toBe("Push Pull Legs - Push (Copy)");
    });
  });

  describe("incrementUsageCount", () => {
    it("calls update on workout_templates", async () => {
      const qb = mockSupabase.from("workout_templates");
      qb._resolve({ data: { usage_count: 1 }, error: null });

      await workoutTemplateService.incrementUsageCount("tpl-001", TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith("workout_templates");
      expect(qb.update).toHaveBeenCalled();
    });
  });
});
