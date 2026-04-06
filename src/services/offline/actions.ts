import { supabase } from "../supabase";
import { OfflineAction, SupabaseResponse } from "./types";

function isValidSupabaseResponse(
  response: unknown,
): response is SupabaseResponse {
  if (!response || typeof response !== "object") {
    return false;
  }
  return true;
}

function validateSupabaseResponse(
  response: unknown,
  operation: string,
  table: string,
): { valid: boolean; error?: string } {
  if (!isValidSupabaseResponse(response)) {
    const errorMsg = `Received malformed Supabase response for ${operation} on ${table}: ${typeof response}`;
    console.warn(errorMsg, response);
    return { valid: false, error: errorMsg };
  }

  const supabaseRes = response as SupabaseResponse;

  if (supabaseRes.error) {
    const errorMsg = `Supabase error for ${operation} on ${table}: ${supabaseRes.error.message}`;
    console.warn(errorMsg, supabaseRes.error);
    return { valid: false, error: errorMsg };
  }

  return { valid: true };
}


// Map LocalWorkoutSession camelCase fields to Supabase snake_case columns
function mapSessionToDb(data: Record<string, unknown>) {
  // Coerce all numerics to avoid NOT NULL constraint failures
  const caloriesBurned = typeof data.caloriesBurned === 'number' ? data.caloriesBurned : 0;
  const duration = typeof data.duration === 'number' ? data.duration : 0;
  // rating: use null instead of 0 to satisfy check constraint (1-5 or null)
  const rawRating = data.rating;
  const rating = (typeof rawRating === 'number' && rawRating > 0) ? rawRating : null;

  return {
    id: data.id,
    user_id: data.userId,
    workout_id: data.workoutId || null,
    started_at: data.startedAt,
    completed_at: data.completedAt || null,
    duration,
    calories_burned: caloriesBurned,
    exercises: data.exercises || [],
    notes: data.notes || '',
    rating,
    is_completed: data.isCompleted || false,
  };
}

export async function executeAction(action: OfflineAction): Promise<void> {
  const { type, table, data } = action;

  switch (type) {
    case "CREATE":
      const insertData = table === 'workout_sessions' ? mapSessionToDb(data as Record<string, unknown>) : data;
      // progress_entries has a unique (user_id, entry_date) constraint — upsert to avoid
      // duplicate key errors when replaying queued offline actions.
      const createResponse = table === 'progress_entries'
        ? await supabase.from(table).upsert([insertData], { onConflict: 'user_id,entry_date' })
        : await supabase.from(table).insert([insertData]);
      const createValidation = validateSupabaseResponse(
        createResponse,
        "CREATE",
        table,
      );
      if (!createValidation.valid) {
        throw new Error(createValidation.error);
      }
      break;

    case "UPDATE":
      const { id, ...updateData } = data;
      if (!id) {
        throw new Error(
          `UPDATE operation missing required 'id' field for table ${table}`,
        );
      }
      const updateResponse = await supabase
        .from(table)
        .update(updateData)
        .eq("id", id);
      const updateValidation = validateSupabaseResponse(
        updateResponse,
        "UPDATE",
        table,
      );
      if (!updateValidation.valid) {
        throw new Error(updateValidation.error);
      }
      console.log(`✅ Successfully updated record ${id} in ${table}`);
      break;

    case "DELETE":
      if (!data.id) {
        throw new Error(
          `DELETE operation missing required 'id' field for table ${table}`,
        );
      }
      const deleteResponse = await supabase
        .from(table)
        .delete()
        .eq("id", data.id);
      const deleteValidation = validateSupabaseResponse(
        deleteResponse,
        "DELETE",
        table,
      );
      if (!deleteValidation.valid) {
        throw new Error(deleteValidation.error);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}
