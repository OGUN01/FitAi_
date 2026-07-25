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
  // ── Builder additions (Phase 0.4 migration) ──────────────────────────────
  category?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  ratingAvg?: number;
  ratingCount?: number;
  forkCount?: number;
  authorName?: string;
  parentTemplateId?: string;
  version?: number;
}

export type CommunitySortOption = "trending" | "top" | "new";

export interface CommunityTemplateFilters {
  category?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  sort?: CommunitySortOption;
  limit?: number;
  offset?: number;
}

export interface TemplateRatingInput {
  templateId: string;
  rating: number; // 1-5
  review?: string;
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
    category: row.category ?? undefined,
    difficulty: row.difficulty ?? undefined,
    tags: row.tags ?? [],
    ratingAvg: row.rating_avg ?? 0,
    ratingCount: row.rating_count ?? 0,
    forkCount: row.fork_count ?? 0,
    authorName: row.author_name ?? undefined,
    parentTemplateId: row.parent_template_id ?? undefined,
    version: row.version ?? 1,
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

  // ==========================================================================
  // COMMUNITY TEMPLATES (Phase 0.5) — public template browse/fork/rate
  // ==========================================================================

  /**
   * Browse public (community) templates. Reads via the "Public templates
   * readable by all" RLS policy (migration 20260326000003:21).
   *
   * Sort options:
   *  - trending: fork_count DESC, rating_count DESC
   *  - top:      rating_avg DESC, rating_count DESC
   *  - new:      created_at DESC
   */
  async getPublicTemplates(
    filters: CommunityTemplateFilters = {},
  ): Promise<WorkoutTemplate[]> {
    const {
      category,
      difficulty,
      sort = "trending",
      limit = 30,
      offset = 0,
    } = filters;

    let query = supabase
      .from("workout_templates")
      .select("*")
      .eq("is_public", true)
      .range(offset, offset + limit - 1);

    if (category) query = query.eq("category", category);
    if (difficulty) query = query.eq("difficulty", difficulty);

    switch (sort) {
      case "trending":
        query = query
          .order("fork_count", { ascending: false })
          .order("rating_count", { ascending: false });
        break;
      case "top":
        query = query
          .order("rating_avg", { ascending: false })
          .order("rating_count", { ascending: false });
        break;
      case "new":
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch public templates:", error);
      return [];
    }

    return (data ?? []).map(mapRow);
  }

  /**
   * Rate a template (1-5). One rating per (template_id, user_id) — UNIQUE
   * constraint enforced at the DB. After insert, calls recalc_template_rating
   * RPC to refresh the denormalized rating_avg/rating_count on workout_templates.
   */
  async rateTemplate(
    templateId: string,
    userId: string,
    input: TemplateRatingInput,
  ): Promise<void> {
    if (input.rating < 1 || input.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Upsert the rating (UNIQUE(template_id, user_id) handles conflicts)
    const { error: upsertError } = await supabase
      .from("template_ratings")
      .upsert(
        {
          template_id: templateId,
          user_id: userId,
          rating: input.rating,
          review: input.review ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "template_id,user_id" },
      );

    if (upsertError) {
      console.error("Failed to rate template:", upsertError);
      throw new Error(upsertError.message);
    }

    // Recalculate denormalized aggregates
    const { error: recalcError } = await supabase.rpc("recalc_template_rating", {
      template_row_id: templateId,
    });

    if (recalcError) {
      console.error("Failed to recalc template rating:", recalcError);
      // Non-fatal — rating was saved; aggregates will catch up on next read
    }
  }

  /**
   * Fork (clone) a public template into the user's library. Sets
   * parent_template_id for lineage and atomically increments fork_count.
   */
  async forkTemplate(
    templateId: string,
    userId: string,
  ): Promise<WorkoutTemplate> {
    // Fetch the source template (works for public + own templates)
    const { data: source, error: fetchError } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (fetchError || !source) {
      console.error("Failed to fetch template for fork:", fetchError);
      throw new Error(fetchError?.message ?? "Template not found");
    }

    const forked = await this.createTemplate(userId, {
      name: `${source.name} (Fork)`,
      description: source.description ?? undefined,
      exercises: source.exercises ?? [],
      targetMuscleGroups: source.target_muscle_groups ?? [],
      estimatedDurationMinutes: source.estimated_duration_minutes ?? undefined,
      isPublic: false,
      category: source.category ?? undefined,
      difficulty: source.difficulty ?? undefined,
      tags: source.tags ?? [],
    });

    // Record lineage + atomically increment fork_count
    await supabase
      .from("workout_templates")
      .update({
        parent_template_id: templateId,
        author_name: source.author_name ?? undefined,
      })
      .eq("id", forked.id)
      .eq("user_id", userId);

    const { error: forkCountError } = await supabase.rpc(
      "increment_template_fork_count",
      { template_row_id: templateId },
    );
    if (forkCountError) {
      console.error("Failed to increment fork count:", forkCountError);
      // Non-fatal — fork succeeded; count will catch up later
    }

    return { ...forked, parentTemplateId: templateId };
  }

  // ==========================================================================
  // BUILDER DRAFT PERSISTENCE (Phase 0.5) — crash-safe autosave
  // ==========================================================================

  /**
   * Save a builder draft. Uses is_draft=true on weekly_workout_plans to keep
   * drafts separate from the active plan. Only one draft per (user, plan_source)
   * is preserved — re-saving overwrites.
   */
  async saveDraft(
    userId: string,
    planData: Record<string, unknown>,
  ): Promise<void> {
    // Find existing draft row for this user (plan_source='custom')
    const { data: existing } = await supabase
      .from("weekly_workout_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("plan_source", "custom")
      .eq("is_draft", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rowId = (existing as { id?: string } | null)?.id ?? generateUUID();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("weekly_workout_plans")
      .upsert({
        id: rowId,
        user_id: userId,
        plan_title: (planData.planTitle as string) ?? "Draft",
        plan_description: (planData.planDescription as string) ?? "",
        week_number: (planData.weekNumber as number) ?? 1,
        total_workouts: ((planData.workouts as unknown[]) ?? []).length,
        duration_range: "draft",
        plan_data: planData,
        is_active: false,
        plan_source: "custom",
        is_draft: true,
        updated_at: now,
      });

    if (error) {
      console.error("Failed to save builder draft:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Load the most recent builder draft (if any). Returns null if no draft
   * exists — caller should hydrate from customWeeklyPlan instead.
   */
  async loadDraft(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from("weekly_workout_plans")
      .select("plan_data")
      .eq("user_id", userId)
      .eq("plan_source", "custom")
      .eq("is_draft", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load builder draft:", error);
      return null;
    }

    return (data as { plan_data?: Record<string, unknown> } | null)?.plan_data ?? null;
  }

  /**
   * Delete a builder draft (called on successful save — the saved plan becomes
   * the active row, the draft is no longer needed).
   */
  async clearDraft(userId: string): Promise<void> {
    const { error } = await supabase
      .from("weekly_workout_plans")
      .delete()
      .eq("user_id", userId)
      .eq("plan_source", "custom")
      .eq("is_draft", true);

    if (error) {
      console.error("Failed to clear builder draft:", error);
    }
  }
}

export const workoutTemplateService = new WorkoutTemplateService();
