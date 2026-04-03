import { supabase } from "./supabase";
import { generateUUID } from "../utils/uuid";

export interface TemplateExercise {
  exerciseId: string;
  name: string;
  sets: number;
  repRange: [number, number];
  restSeconds: number;
  targetWeightKg?: number;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  targetMuscleGroups: string[];
  estimatedDurationMinutes?: number;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

type CreateInput = Omit<
  WorkoutTemplate,
  "id" | "userId" | "usageCount" | "createdAt" | "updatedAt"
>;
type UpdateInput = Partial<
  Pick<
    WorkoutTemplate,
    | "name"
    | "description"
    | "exercises"
    | "targetMuscleGroups"
    | "estimatedDurationMinutes"
    | "isPublic"
  >
>;

function mapRow(row: any): WorkoutTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    exercises: row.exercises ?? [],
    targetMuscleGroups: row.target_muscle_groups ?? [],
    estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
    isPublic: row.is_public ?? false,
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class WorkoutTemplateService {
  async createTemplate(
    userId: string,
    template: CreateInput,
  ): Promise<WorkoutTemplate> {
    const id = generateUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("workout_templates")
      .insert({
        id,
        user_id: userId,
        name: template.name,
        description: template.description ?? null,
        exercises: template.exercises,
        target_muscle_groups: template.targetMuscleGroups,
        estimated_duration_minutes: template.estimatedDurationMinutes ?? null,
        is_public: template.isPublic,
        usage_count: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create workout template:", error);
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  async getTemplates(userId: string): Promise<WorkoutTemplate[]> {
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch workout templates:", error);
      return [];
    }

    return (data ?? []).map(mapRow);
  }

  async updateTemplate(
    id: string,
    userId: string,
    updates: UpdateInput,
  ): Promise<WorkoutTemplate> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined)
      dbUpdates.description = updates.description;
    if (updates.exercises !== undefined)
      dbUpdates.exercises = updates.exercises;
    if (updates.targetMuscleGroups !== undefined)
      dbUpdates.target_muscle_groups = updates.targetMuscleGroups;
    if (updates.estimatedDurationMinutes !== undefined)
      dbUpdates.estimated_duration_minutes = updates.estimatedDurationMinutes;
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;

    const { data, error } = await supabase
      .from("workout_templates")
      .update(dbUpdates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update workout template:", error);
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete workout template:", error);
      throw new Error(error.message);
    }
  }

  async duplicateTemplate(
    id: string,
    userId: string,
  ): Promise<WorkoutTemplate> {
    const templates = await this.getTemplates(userId);
    const original = templates.find((t) => t.id === id);
    if (!original) throw new Error(`Template ${id} not found`);

    return this.createTemplate(userId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      exercises: original.exercises,
      targetMuscleGroups: original.targetMuscleGroups,
      estimatedDurationMinutes: original.estimatedDurationMinutes,
      isPublic: false,
    });
  }

  async incrementUsageCount(id: string, userId: string): Promise<void> {
    // GAP-17: Atomic increment — single UPDATE avoids read-then-write race condition
    const { error } = await supabase.rpc("increment_template_usage_count", {
      template_id: id,
      owner_user_id: userId,
    });

    if (error) {
      // Fallback: non-atomic but better than nothing
      console.error("Failed to increment template usage count (rpc):", error);
      const { data } = await supabase
        .from("workout_templates")
        .select("usage_count")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
      const currentCount =
        (data as { usage_count?: number } | null)?.usage_count ?? 0;
      await supabase
        .from("workout_templates")
        .update({ usage_count: currentCount + 1, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
    }
  }
}

export const workoutTemplateService = new WorkoutTemplateService();
